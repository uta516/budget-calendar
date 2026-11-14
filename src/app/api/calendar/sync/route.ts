import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMonth, monthTimeRange } from "@/lib/supabase/month";
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

// 期限の5分前から、トークンを更新する
const REFRESH_MARGIN_MS = 5 * 60 * 1000;
// .in() に一度に渡す id の数（URL が長くなりすぎないように）
const IN_CHUNK = 100;

const RELOGIN_MESSAGE = "もう一度ログインしてください";

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

type ExistingEvent = EventTimes & { id: number; google_event_id: string };

/**
 * POST /api/calendar/sync  { month: "2026-11" }
 * Googleカレンダー（主カレンダー）のその月の予定を events に同期する。
 * 戻り値：{ added, updated, deleted }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse(401, `ログインしていません。${RELOGIN_MESSAGE}`);
  }

  const body = (await request.json().catch(() => null)) as {
    month?: unknown;
  } | null;
  const month = body?.month;
  if (!isMonth(month)) {
    return errorResponse(400, "月は \"2026-11\" の形で指定してください");
  }

  // 1. トークンを読み、期限が近ければ更新する
  const { data: token, error: tokenError } = await supabase
    .from("google_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (tokenError) {
    console.error("google_tokens の読み込みに失敗:", tokenError.message);
    return errorResponse(500, "Googleの認証情報の読み込みに失敗しました");
  }
  if (!token) {
    return errorResponse(401, RELOGIN_MESSAGE);
  }

  let accessToken = token.access_token;
  if (Date.parse(token.expires_at) - REFRESH_MARGIN_MS <= Date.now()) {
    if (!token.refresh_token) {
      return errorResponse(401, RELOGIN_MESSAGE);
    }
    try {
      const refreshed = await refreshAccessToken(token.refresh_token);
      accessToken = refreshed.accessToken;
      const { data: saved, error } = await supabase
        .from("google_tokens")
        .update({
          access_token: refreshed.accessToken,
          expires_at: refreshed.expiresAt,
        })
        .eq("user_id", user.id)
        .select("user_id");
      // RLS などで0件になっても error は null なので、件数も確かめる
      if (error || saved.length === 0) {
        console.error(
          "google_tokens の更新に失敗:",
          error?.message ?? "更新件数が0件",
        );
        return errorResponse(401, RELOGIN_MESSAGE);
      }
    } catch (e) {
      console.error("Googleトークンの更新に失敗:", (e as Error).message);
      if (e instanceof GoogleReauthError) {
        return errorResponse(401, RELOGIN_MESSAGE);
      }
      return errorResponse(500, "Googleトークンの更新に失敗しました");
    }
  }

  const { from, to } = monthTimeRange(month);

  try {
    // 2. Google のその月の予定
    const googleEvents = await listEvents(accessToken, from, to);
    const incoming = new Map<string, EventTimes>();
    for (const event of googleEvents) {
      const times = toEventTimes(event);
      if (times) incoming.set(event.id, times);
    }

    // 3. DB にある Google 由来の予定（その月に始まるもの ＋ 今回の Google の予定と同じ id のもの）
    const existing = new Map<string, ExistingEvent>();
    const columns = "id, google_event_id, title, starts_at, ends_at";

    const { data: inMonth, error: monthError } = await supabase
      .from("events")
      .select(columns)
      .not("google_event_id", "is", null)
      .gte("starts_at", from)
      .lt("starts_at", to);
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
        .in("google_event_id", ids.slice(i, i + IN_CHUNK));
      if (error) throw error;
      for (const row of data) {
        if (row.google_event_id) existing.set(row.google_event_id, row as ExistingEvent);
      }
    }

    // 4. 追加・更新・削除に分ける（Google への問い合わせは、DB を書きかえる前にすべて済ませる）
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

    // DB にはあるが、今月の Google の一覧に無い予定は、1件ずつ確かめる
    for (const [googleId, current] of existing) {
      if (incoming.has(googleId)) continue;
      const event = await getEvent(accessToken, googleId);
      const times = event ? toEventTimes(event) : null;
      if (!event || !times) {
        toDelete.push(current.id); // Google で消された
      } else if (timesChanged(current, times)) {
        toUpdate.push({ id: current.id, times }); // 別の月に移動した
      }
    }

    // 5. DB に書く
    let added = 0;
    if (toInsert.length > 0) {
      const { data, error } = await supabase
        .from("events")
        .upsert(
          toInsert.map((row) => ({
            ...row,
            user_id: user.id,
            kind: "other",
            estimated_amount: 0,
          })),
          { onConflict: "user_id,google_event_id", ignoreDuplicates: true },
        )
        .select("id");
      if (error) throw error;
      added = data.length;
    }

    // kind と estimated_amount は変えない（ユーザーが直した値を消さないため）
    const updateResults = await Promise.all(
      toUpdate.map(({ id, times }) =>
        supabase.from("events").update(times).eq("id", id).select("id"),
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
        .select("id");
      if (error) throw error;
      deleted = data.length;
    }

    return NextResponse.json({ added, updated, deleted });
  } catch (e) {
    if (e instanceof GoogleReauthError) {
      console.error("Calendar API の認証エラー:", e.message);
      return errorResponse(401, RELOGIN_MESSAGE);
    }
    if (e instanceof GoogleApiError) {
      console.error("Calendar API のエラー:", e.message);
      return errorResponse(502, "Googleカレンダーの読み込みに失敗しました");
    }
    console.error("予定の同期に失敗:", e);
    return errorResponse(500, "予定の保存に失敗しました");
  }
}
