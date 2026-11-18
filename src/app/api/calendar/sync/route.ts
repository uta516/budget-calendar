import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMonth } from "@/lib/supabase/month";
import {
  CalendarSyncError,
  RELOGIN_MESSAGE,
  syncCalendarMonths,
} from "../_lib/sync";

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST /api/calendar/sync  { month: "2026-11" }
 * Googleカレンダー（主カレンダー）のその月の予定を events に同期する。
 * 戻り値：{ added, updated, deleted }
 * （手動の同期なので last_synced_at は更新しない）
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

  try {
    const counts = await syncCalendarMonths(supabase, user.id, [month]);
    return NextResponse.json(counts);
  } catch (e) {
    if (e instanceof CalendarSyncError) {
      return errorResponse(e.status, e.message);
    }
    console.error("予定の同期に失敗:", e);
    return errorResponse(500, "予定の保存に失敗しました");
  }
}
