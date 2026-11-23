// Googleカレンダー → events の同期処理（サーバー専用）
// /api/calendar/sync（月を指定）、/api/calendar/auto-sync、/auth/callback（ログイン直後）から使う

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { monthTimeRange } from "@/lib/supabase/month";
import {
  getEvent,
  GoogleApiError,
  GoogleReauthError,
  listEvents,
  refreshAccessToken,
  timesChanged,
  toEventTimes,
  type EventTimes,
} from "./google";

type Supabase = SupabaseClient<Database>;

export type SyncCounts = { added: number; updated: number; deleted: number };

export const RELOGIN_MESSAGE = "もう一度ログインしてください";

/** 同期の失敗。status と message は、そのまま API のレスポンスに使える */
export class CalendarSyncError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
  /** 再ログインが必要か */
  get needsRelogin(): boolean {
    return this.status === 401;
  }
}

/** signal で打ち切られた */
export class CalendarSyncAbortedError extends Error {}

// 期限の5分前から、トークンを更新する
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
// .in() に一度に渡す id の数（URL が長くなりすぎないように）
const IN_CHUNK = 100;

type ExistingEvent = EventTimes & { id: number; google_event_id: string };

/**
 * 使える access_token を返す（期限が近ければ refresh_token で更新し、google_tokens に保存する）。
 * 同期と、Google への書き込み（/api/calendar/events）の両方で使う。
 * 失敗したら CalendarSyncError（再ログインが必要なら status 401）を投げる
 */
export async function getAccessToken(
  supabase: Supabase,
  userId: string,
  signal: AbortSignal = new AbortController().signal,
): Promise<string> {
  const { data: token, error: tokenError } = await supabase
    .from("google_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .abortSignal(signal)
    .maybeSingle();
  // 打ち切り（AbortError）は想定どおりなので、エラーのログは出さずに上へ伝える
  signal.throwIfAborted();
  if (tokenError) {
    console.error("google_tokens の読み込みに失敗:", tokenError.message);
    throw new CalendarSyncError(500, "Googleの認証情報の読み込みに失敗しました");
  }
  if (!token) {
    throw new CalendarSyncError(401, RELOGIN_MESSAGE);
  }

  if (Date.parse(token.expires_at) - REFRESH_MARGIN_MS > Date.now()) {
    return token.access_token;
  }
  if (!token.refresh_token) {
    throw new CalendarSyncError(401, RELOGIN_MESSAGE);
  }

  let refreshed: { accessToken: string; expiresAt: string };
  try {
    refreshed = await refreshAccessToken(token.refresh_token, signal);
  } catch (e) {
    if (signal.aborted) throw e;
    console.error("Googleトークンの更新に失敗:", (e as Error).message);
    if (e instanceof GoogleReauthError) {
      throw new CalendarSyncError(401, RELOGIN_MESSAGE);
    }
    throw new CalendarSyncError(500, "Googleトークンの更新に失敗しました");
  }

  const { data: saved, error } = await supabase
    .from("google_tokens")
    .update({
      access_token: refreshed.accessToken,
      expires_at: refreshed.expiresAt,
    })
    .eq("user_id", userId)
    .select("user_id")
    .abortSignal(signal);
  signal.throwIfAborted();
  // RLS などで0件になっても error は null なので、件数も確かめる
  if (error || saved.length === 0) {
    console.error("google_tokens の更新に失敗:", error?.message ?? "更新件数が0件");
    throw new CalendarSyncError(401, RELOGIN_MESSAGE);
  }
  return refreshed.accessToken;
}

/** 1か月分を同期する（中身はこれまでの /api/calendar/sync と同じ） */
async function syncMonth(
  supabase: Supabase,
  userId: string,
  accessToken: string,
  month: string,
  signal: AbortSignal,
): Promise<SyncCounts> {
  const { from, to } = monthTimeRange(month);

  // 1. Google のその月の予定
  const googleEvents = await listEvents(accessToken, from, to, signal);
  const incoming = new Map<string, EventTimes>();
  for (const event of googleEvents) {
    const times = toEventTimes(event);
    if (times) incoming.set(event.id, times);
  }

  // 2. DB にある Google 由来の予定（その月に始まるもの ＋ 今回の Google の予定と同じ id のもの）
  const existing = new Map<string, ExistingEvent>();
  const columns = "id, google_event_id, title, starts_at, ends_at";

  const { data: inMonth, error: monthError } = await supabase
    .from("events")
    .select(columns)
    .not("google_event_id", "is", null)
    .gte("starts_at", from)
    .lt("starts_at", to)
    .abortSignal(signal);
  if (monthError) throw monthError;
  for (const row of inMonth) {
    if (row.google_event_id) existing.set(row.google_event_id, row as ExistingEvent);
  }

  // 別の月からこの月に移動してきた予定も見つけるため、id でも探す
  const ids = [...incoming.keys()].filter((id) => !existing.has(id));
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const { data, error } = await supabase
      .from("events")
      .select(columns)
      .in("google_event_id", ids.slice(i, i + IN_CHUNK))
      .abortSignal(signal);
    if (error) throw error;
    for (const row of data) {
      if (row.google_event_id) existing.set(row.google_event_id, row as ExistingEvent);
    }
  }

  // 3. 追加・更新・削除に分ける（Google への問い合わせは、DB を書きかえる前にすべて済ませる）
  const toInsert: (EventTimes & { google_event_id: string })[] = [];
  const toUpdate: { id: number; times: EventTimes }[] = [];
  const toDelete: number[] = [];

  for (const [googleId, times] of incoming) {
    const current = existing.get(googleId);
    if (!current) {
      toInsert.push({ ...times, google_event_id: googleId });
    } else if (timesChanged(current, times)) {
      toUpdate.push({ id: current.id, times });
    }
  }

  // DB にはあるが、その月の Google の一覧に無い予定は、1件ずつ確かめる
  for (const [googleId, current] of existing) {
    if (incoming.has(googleId)) continue;
    const event = await getEvent(accessToken, googleId, signal);
    const times = event ? toEventTimes(event) : null;
    if (!event || !times) {
      toDelete.push(current.id); // Google で消された
    } else if (timesChanged(current, times)) {
      toUpdate.push({ id: current.id, times }); // 別の月に移動した
    }
  }

  // 4. DB に書く
  let added = 0;
  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from("events")
      .upsert(
        toInsert.map((row) => ({
          ...row,
          user_id: userId,
          kind: "other",
          estimated_amount: 0,
        })),
        { onConflict: "user_id,google_event_id", ignoreDuplicates: true },
      )
      .select("id")
      .abortSignal(signal);
    if (error) throw error;
    added = data.length;
  }

  // kind と estimated_amount は変えない（ユーザーが直した値を消さないため）
  const updateResults = await Promise.all(
    toUpdate.map(({ id, times }) =>
      supabase.from("events").update(times).eq("id", id).select("id").abortSignal(signal),
    ),
  );
  let updated = 0;
  for (const { data, error } of updateResults) {
    if (error) throw error;
    updated += data.length;
  }

  let deleted = 0;
  if (toDelete.length > 0) {
    const { data, error } = await supabase
      .from("events")
      .delete()
      .in("id", toDelete)
      .select("id")
      .abortSignal(signal);
    if (error) throw error;
    deleted = data.length;
  }

  return { added, updated, deleted };
}

/**
 * Googleカレンダー（主カレンダー）の指定した月の予定を events に同期し、件数の合計を返す。
 * 失敗したら CalendarSyncError、signal で打ち切られたら CalendarSyncAbortedError を投げる。
 * last_synced_at は更新しない（自動同期のときだけ、呼ぶ側で markSynced を呼ぶ）。
 */
export async function syncCalendarMonths(
  supabase: Supabase,
  userId: string,
  months: string[],
  signal: AbortSignal = new AbortController().signal,
): Promise<SyncCounts> {
  const total: SyncCounts = { added: 0, updated: 0, deleted: 0 };
  try {
    const accessToken = await getAccessToken(supabase, userId, signal);
    for (const month of months) {
      signal.throwIfAborted();
      const counts = await syncMonth(supabase, userId, accessToken, month, signal);
      total.added += counts.added;
      total.updated += counts.updated;
      total.deleted += counts.deleted;
    }
    return total;
  } catch (e) {
    if (signal.aborted) {
      throw new CalendarSyncAbortedError("同期を打ち切りました");
    }
    throw toCalendarSyncError(e, "Googleカレンダーの読み込みに失敗しました");
  }
}

/**
 * Google とのやりとりで起きたエラーを、API でそのまま返せる CalendarSyncError に直す。
 * googleMessage は Google 側の失敗（502）のときの日本語のメッセージ
 */
export function toCalendarSyncError(e: unknown, googleMessage: string): CalendarSyncError {
  if (e instanceof CalendarSyncError) return e;
  if (e instanceof GoogleReauthError) {
    console.error("Calendar API の認証エラー:", e.message);
    return new CalendarSyncError(401, RELOGIN_MESSAGE);
  }
  if (e instanceof GoogleApiError) {
    console.error("Calendar API のエラー:", e.message);
    return new CalendarSyncError(502, googleMessage);
  }
  console.error("予定の同期に失敗:", e);
  return new CalendarSyncError(500, "予定の保存に失敗しました");
}

/** 自動同期した時刻を保存し、その時刻を返す */
export async function markSynced(supabase: Supabase, userId: string): Promise<string> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("google_tokens")
    .update({ last_synced_at: now })
    .eq("user_id", userId)
    .select("user_id");
  if (error || data.length === 0) {
    console.error("last_synced_at の保存に失敗:", error?.message ?? "更新件数が0件");
    throw new CalendarSyncError(500, "同期した時刻の保存に失敗しました");
  }
  return now;
}
