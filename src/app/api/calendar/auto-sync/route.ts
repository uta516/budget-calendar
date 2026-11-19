import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { currentMonth, nextMonth } from "@/lib/supabase/month";
import {
  CalendarSyncError,
  markSynced,
  RELOGIN_MESSAGE,
  syncCalendarMonths,
} from "../_lib/sync";

// 前の同期からこれだけたっていなければ、同期しない
const AUTO_SYNC_INTERVAL_MS = 30 * 60 * 1000;

function errorResponse(status: number, message: string) {
  return NextResponse.json(
    { error: message, needsRelogin: status === 401 },
    { status },
  );
}

/**
 * POST /api/calendar/auto-sync
 * 前の自動同期（google_tokens.last_synced_at）から30分以上たっていれば、今月と来月を同期する。
 * 30分の判定はサーバーの時計で行う。
 * 戻り値：
 *   同期した      { synced: true, added, updated, deleted, lastSyncedAt }
 *   30分たっていない { synced: false, reason: "recent", lastSyncedAt }
 *   失敗         { error, needsRelogin }（401 / 500 / 502）
 */
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse(401, `ログインしていません。${RELOGIN_MESSAGE}`);
  }

  const { data: token, error } = await supabase
    .from("google_tokens")
    .select("last_synced_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) {
    console.error("google_tokens の読み込みに失敗:", error.message);
    return errorResponse(500, "Googleの認証情報の読み込みに失敗しました");
  }
  if (!token) {
    return errorResponse(401, RELOGIN_MESSAGE);
  }

  const last = token.last_synced_at;
  if (last && Date.now() - Date.parse(last) < AUTO_SYNC_INTERVAL_MS) {
    return NextResponse.json({ synced: false, reason: "recent", lastSyncedAt: last });
  }

  try {
    const month = currentMonth();
    const counts = await syncCalendarMonths(supabase, user.id, [month, nextMonth(month)]);
    const lastSyncedAt = await markSynced(supabase, user.id);
    return NextResponse.json({ synced: true, ...counts, lastSyncedAt });
  } catch (e) {
    if (e instanceof CalendarSyncError) {
      return errorResponse(e.status, e.message);
    }
    console.error("自動同期に失敗:", e);
    return errorResponse(500, "予定の保存に失敗しました");
  }
}
