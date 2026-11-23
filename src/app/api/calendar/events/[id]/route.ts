import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { oneHourLater, toEventRow, type EventInput } from "@/lib/supabase/eventInput";
import { deleteEvent as deleteGoogleEvent, patchEvent } from "../../_lib/google";
import { getAccessToken, RELOGIN_MESSAGE, toCalendarSyncError } from "../../_lib/sync";

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message, needsRelogin: status === 401 }, { status });
}

/** ログインを確かめ、id の予定（自分のもの）を読む */
async function loadEvent(ctx: RouteContext<"/api/calendar/events/[id]">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: errorResponse(401, `ログインしていません。${RELOGIN_MESSAGE}`) } as const;
  }

  const { id: idText } = await ctx.params;
  const id = Number(idText);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: errorResponse(400, "予定の id が正しくありません") } as const;
  }

  // RLS により、自分の予定しか読めない
  const { data, error } = await supabase
    .from("events")
    .select("id, google_event_id")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[calendar-write] 予定の読み込みに失敗:", error.message);
    return { error: errorResponse(500, "予定の読み込みに失敗しました") } as const;
  }
  if (!data) {
    return { error: errorResponse(404, "対象のデータが見つかりませんでした") } as const;
  }
  return { supabase, user, event: data } as const;
}

/**
 * PATCH /api/calendar/events/[id]  予定を変更する
 * 受け取るもの：{ title, kind, startsAt, endsAt?, estimatedAmount }
 * - Google とつながっている予定（google_event_id がある）は、先に Google のタイトルと日時を変える
 *   Google が失敗したら、DB は変えずにエラーを返す（Google とアプリでずれないように）
 * - Google ですでに消えていた（404 / 410）ときは、アプリだけ変えて「手入力の予定」にする
 *   （そのままだと、次の同期で「Googleで消された予定」として消えてしまうため）
 * 戻り値：変更後の予定
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/calendar/events/[id]">) {
  const loaded = await loadEvent(ctx);
  if ("error" in loaded) return loaded.error;
  const { supabase, user, event } = loaded;

  const input = (await request.json().catch(() => null)) as EventInput | null;
  if (!input) {
    return errorResponse(400, "予定の内容が読み取れませんでした");
  }
  let row;
  try {
    row = toEventRow(input);
  } catch (e) {
    return errorResponse(400, (e as Error).message);
  }

  let unlinkGoogle = false;
  if (event.google_event_id) {
    try {
      const accessToken = await getAccessToken(supabase, user.id);
      const endsAt = row.ends_at ?? oneHourLater(row.starts_at);
      const found = await patchEvent(accessToken, event.google_event_id, {
        title: row.title,
        startsAt: row.starts_at,
        endsAt,
      });
      if (found) {
        row = { ...row, ends_at: endsAt }; // 次の同期で「更新」にならないように、Google と同じ終了日時にする
      } else {
        unlinkGoogle = true;
        console.warn("[calendar-write] Google ではすでに消えていたので、手入力の予定にします:", event.id);
      }
    } catch (e) {
      const err = toCalendarSyncError(e, "Googleカレンダーの予定を変更できませんでした");
      return errorResponse(err.status, err.message);
    }
  }

  const { data, error } = await supabase
    .from("events")
    .update(unlinkGoogle ? { ...row, google_event_id: null } : row)
    .eq("id", event.id)
    .select()
    .single();
  if (error) {
    // Google はもう変わっているが、次の同期でタイトルと日時は Google に合わせて直る
    console.error("[calendar-write] 予定の変更の保存に失敗:", error.message);
    return errorResponse(500, "予定の変更に失敗しました");
  }
  return NextResponse.json(data);
}

/**
 * DELETE /api/calendar/events/[id]  予定を削除する
 * - Google とつながっている予定は、先に Googleカレンダーからも消す（本物の Googleカレンダーから消える）
 *   Google が失敗したら、DB は変えずにエラーを返す
 * - Google ですでに消えていた（404 / 410）ときは、エラーにせずアプリだけ消す
 * 戻り値：{ deleted: true, google: "deleted" | "already-gone" | "not-linked" }
 */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/calendar/events/[id]">) {
  const loaded = await loadEvent(ctx);
  if ("error" in loaded) return loaded.error;
  const { supabase, user, event } = loaded;

  let google: "deleted" | "already-gone" | "not-linked" = "not-linked";
  if (event.google_event_id) {
    try {
      const accessToken = await getAccessToken(supabase, user.id);
      const found = await deleteGoogleEvent(accessToken, event.google_event_id);
      google = found ? "deleted" : "already-gone";
    } catch (e) {
      const err = toCalendarSyncError(e, "Googleカレンダーの予定を削除できませんでした");
      return errorResponse(err.status, err.message);
    }
  }

  const { data, error } = await supabase
    .from("events")
    .delete()
    .eq("id", event.id)
    .select("id");
  if (error) {
    // Google からはもう消えているが、次の同期でアプリからも消える
    console.error("[calendar-write] 予定の削除の保存に失敗:", error.message);
    return errorResponse(500, "予定の削除に失敗しました");
  }
  if (data.length === 0) {
    return errorResponse(404, "対象のデータが見つかりませんでした");
  }
  return NextResponse.json({ deleted: true, google });
}
