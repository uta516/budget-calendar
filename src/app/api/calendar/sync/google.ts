// Google の OAuth と Calendar API とのやりとり（サーバー専用。fetch で直接呼ぶ）
import { JST_OFFSET } from "@/lib/supabase/month";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const EVENTS_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

/** 再ログインが必要なとき（トークンが無い・無効・権限が足りない） */
export class GoogleReauthError extends Error {}

/** それ以外の Google 側のエラー */
export class GoogleApiError extends Error {}

type GoogleDate = { date?: string; dateTime?: string };

export type GoogleEvent = {
  id: string;
  status?: string;
  summary?: string;
  start?: GoogleDate;
  end?: GoogleDate;
};

/** アプリの events の列のうち、Google から決まるもの */
export type EventTimes = {
  title: string;
  starts_at: string;
  ends_at: string | null;
};

/** refresh_token で新しい access_token をもらう */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new GoogleApiError(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET が設定されていません",
    );
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const body = (await res.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  } | null;

  if (!res.ok || !body?.access_token) {
    // invalid_grant など。refresh_token が取り消された・期限切れ
    throw new GoogleReauthError(
      `トークンの更新に失敗しました（${body?.error ?? res.status}）`,
    );
  }
  const expiresIn = body.expires_in ?? 3600;
  return {
    accessToken: body.access_token,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
}

async function callCalendar(url: string, accessToken: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) {
    // 401：トークンが無効。403：calendar.events の権限が無い
    throw new GoogleReauthError(`Calendar API が ${res.status} を返しました`);
  }
  return res;
}

/** 主カレンダーの、期間内の予定（繰り返しは展開し、キャンセル済みは除く） */
export async function listEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleEvent[]> {
  const events: GoogleEvent[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "2500",
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await callCalendar(`${EVENTS_URL}?${params}`, accessToken);
    if (!res.ok) {
      throw new GoogleApiError(`予定の一覧の取得に失敗しました（${res.status}）`);
    }
    const body = (await res.json()) as {
      items?: GoogleEvent[];
      nextPageToken?: string;
    };
    events.push(...(body.items ?? []).filter((e) => e.status !== "cancelled"));
    pageToken = body.nextPageToken;
  } while (pageToken);

  return events;
}

/** 予定を1件取る。消されていれば（cancelled / 404 / 410）null */
export async function getEvent(
  accessToken: string,
  eventId: string,
): Promise<GoogleEvent | null> {
  const res = await callCalendar(
    `${EVENTS_URL}/${encodeURIComponent(eventId)}`,
    accessToken,
  );
  if (res.status === 404 || res.status === 410) return null;
  if (!res.ok) {
    throw new GoogleApiError(`予定の取得に失敗しました（${res.status}）`);
  }
  const event = (await res.json()) as GoogleEvent;
  return event.status === "cancelled" ? null : event;
}

/** 終日の予定（date のみ）は、日本時間のその日の 0:00 として扱う */
function toIso(value: GoogleDate | undefined): string | null {
  if (value?.dateTime) return value.dateTime;
  if (value?.date) return `${value.date}T00:00:00${JST_OFFSET}`;
  return null;
}

/** Google の予定 → アプリの予定のタイトルと日時。開始日時が無ければ null */
export function toEventTimes(event: GoogleEvent): EventTimes | null {
  const startsAt = toIso(event.start);
  if (!startsAt) return null;
  return {
    title: event.summary?.trim() || "（タイトルなし）",
    starts_at: startsAt,
    ends_at: toIso(event.end),
  };
}

function sameTime(a: string | null, b: string | null): boolean {
  if (a === null || b === null) return a === b;
  return Date.parse(a) === Date.parse(b);
}

/** タイトルか日時が変わっていれば true（DB と Google でタイムゾーン表記が違っても比べられる） */
export function timesChanged(current: EventTimes, next: EventTimes): boolean {
  return (
    current.title !== next.title ||
    !sameTime(current.starts_at, next.starts_at) ||
    !sameTime(current.ends_at, next.ends_at)
  );
}
