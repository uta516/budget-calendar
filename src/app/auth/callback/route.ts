import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { currentMonth, nextMonth } from "@/lib/supabase/month";
import type { Database, TablesInsert } from "@/types/database";
import {
  CalendarSyncAbortedError,
  markSynced,
  syncCalendarMonths,
} from "@/app/api/calendar/_lib/sync";

// Google のアクセストークンの有効期限（秒）。Supabase からは受け取れないので固定値で扱う。
const GOOGLE_ACCESS_TOKEN_TTL_SECONDS = 3600;

// ログイン直後の同期は、これを超えたら打ち切ってホームに移動する
const LOGIN_SYNC_TIMEOUT_MS = 8000;

/**
 * ログイン直後に今月と来月の予定を同期する。失敗しても、打ち切っても、ログインは止めない。
 * 打ち切ったときは last_synced_at を更新しない（ホームを開いたときの自動同期でやり直すため）。
 */
async function syncAfterLogin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  // 打ち切りの合図を送ったうえで、止まらない処理があっても8秒で待つのをやめる
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve("timeout");
    }, LOGIN_SYNC_TIMEOUT_MS);
  });

  const month = currentMonth();
  const months = [month, nextMonth(month)];
  const startedAt = Date.now();
  const elapsed = () => `${Date.now() - startedAt}ms`;
  const timeoutMessage = `[login-sync] 制限時間（${LOGIN_SYNC_TIMEOUT_MS}ms）を超えたので打ち切りました。last_synced_at は更新しません`;
  console.log(`[login-sync] 同期を始めます（${months.join("・")}、制限時間 ${LOGIN_SYNC_TIMEOUT_MS}ms）`);

  const sync = syncCalendarMonths(supabase, userId, months, controller.signal);

  try {
    const result = await Promise.race([sync, timeout]);
    if (result === "timeout") {
      console.error(`${timeoutMessage}（${elapsed()}）`);
      sync.catch(() => {}); // 打ち切ったあとのエラーは無視する
      return;
    }
    await markSynced(supabase, userId);
    console.log(
      `[login-sync] 同期しました：追加 ${result.added}件・更新 ${result.updated}件・削除 ${result.deleted}件（${elapsed()}）`,
    );
  } catch (e) {
    if (e instanceof CalendarSyncAbortedError) {
      console.error(`${timeoutMessage}（${elapsed()}）`);
    } else {
      console.error(
        `[login-sync] 同期に失敗しました。last_synced_at は更新しません：${(e as Error).message}（${elapsed()}）`,
      );
    }
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  const { user, provider_token, provider_refresh_token } = data.session;

  if (provider_token) {
    const row: TablesInsert<"google_tokens"> = {
      user_id: user.id,
      access_token: provider_token,
      expires_at: new Date(
        Date.now() + GOOGLE_ACCESS_TOKEN_TTL_SECONDS * 1000,
      ).toISOString(),
    };
    // refresh_token が返ってこなかったときは、保存済みの値を null で消さない
    if (provider_refresh_token) {
      row.refresh_token = provider_refresh_token;
    }

    const { error: saveError } = await supabase
      .from("google_tokens")
      .upsert(row, { onConflict: "user_id" });

    if (saveError) {
      console.error("google_tokens の保存に失敗しました:", saveError.message);
      return NextResponse.redirect(`${origin}/login?error=token_save_failed`);
    }

    // 今月と来月の予定を同期してからホームに移動する（失敗・8秒超えでもログインは続ける）
    await syncAfterLogin(supabase, user.id);
  } else {
    console.warn(
      "[login-sync] Google の provider_token が返ってこなかったので、トークンの保存とログイン直後の同期をしません",
    );
  }

  return NextResponse.redirect(`${origin}/`);
}
