import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  oneHourLater,
  toEventRow,
  type GoogleAddResult,
  type NewEventInput,
} from "@/lib/supabase/eventInput";
import { deleteEvent as deleteGoogleEvent, insertEvent } from "../_lib/google";
import { getAccessToken, RELOGIN_MESSAGE, toCalendarSyncError } from "../_lib/sync";

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message, needsRelogin: status === 401 }, { status });
}

/**
 * POST /api/calendar/events  予定を作る
 * 受け取るもの：{ title, kind, startsAt, endsAt?, estimatedAmount, addToGoogle? }（addToGoogle の省略時は true）
 * - addToGoogle が true なら、先に Googleカレンダーに作り、その ID を google_event_id に保存する
 * - Google に追加できなかったときも止めずに、アプリにだけ保存する（手入力の予定として）
 *   （デモ中などに Google との連携が切れていても、予定を入れられるようにするため）
 * 戻り値：{ event, google: { added, reason?, message? } }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return errorResponse(401, `ログインしていません。${RELOGIN_MESSAGE}`);
  }

  const input = (await request.json().catch(() => null)) as NewEventInput | null;
  if (!input) {
    return errorResponse(400, "予定の内容が読み取れませんでした");
  }
  let row;
  try {
    row = toEventRow(input);
  } catch (e) {
    return errorResponse(400, (e as Error).message);
  }

  // 1. Google に作る（失敗しても止めない）
  let googleId: string | null = null;
  let accessToken: string | null = null;
  let google: GoogleAddResult = { added: false, reason: "not-requested" };
  if (input.addToGoogle !== false) {
    try {
      accessToken = await getAccessToken(supabase, user.id);
      // 終了日時が無い予定は、開始の1時間後を終了にする（DB にも同じ値を入れ、次の同期で「更新」にならないように）
      const endsAt = row.ends_at ?? oneHourLater(row.starts_at);
      googleId = await insertEvent(accessToken, {
        title: row.title,
        startsAt: row.starts_at,
        endsAt,
      });
      row = { ...row, ends_at: endsAt };
      google = { added: true };
    } catch (e) {
      const err = toCalendarSyncError(e, "Googleカレンダーに追加できませんでした");
      console.error("[calendar-write] Google への追加に失敗。アプリにだけ保存します:", err.message);
      google = {
        added: false,
        reason: err.needsRelogin ? "needs-relogin" : "error",
        message: err.needsRelogin
          ? `Googleカレンダーには追加できませんでした（${RELOGIN_MESSAGE}）`
          : "Googleカレンダーには追加できませんでした",
      };
    }
  }

  // 2. DB に保存する。Google に作った予定は (user_id, google_event_id) で upsert する
  //    （Google に作った直後に同期が先に入れていても、2つにならないように）
  const saved = googleId
    ? await supabase
        .from("events")
        .upsert(
          { ...row, user_id: user.id, google_event_id: googleId },
          { onConflict: "user_id,google_event_id" },
        )
        .select()
        .single()
    : await supabase
        .from("events")
        .insert({ ...row, user_id: user.id, google_event_id: null })
        .select()
        .single();

  if (saved.error) {
    console.error("[calendar-write] 予定の保存に失敗:", saved.error.message);
    // Google にだけ予定が残らないように、作った予定を消す
    if (googleId && accessToken) {
      await deleteGoogleEvent(accessToken, googleId).catch((e: Error) =>
        console.error("[calendar-write] Google に作った予定を消せませんでした:", e.message),
      );
    }
    return errorResponse(500, "予定の保存に失敗しました");
  }

  return NextResponse.json({ event: saved.data, google });
}
