import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createClient } from "./client";

/**
 * 読み込みの関数に渡せる Supabase クライアント。
 * 画面から呼ぶときは省略する（ブラウザ用を使う）。サーバー（API）から呼ぶときはサーバー用を渡す
 */
export type DataClient = SupabaseClient<Database>;

// データ関数の共通処理（画面からは直接使わない）

export function getSupabase(client?: DataClient): DataClient {
  return client ?? createClient();
}

/** ログイン中のユーザーの id を返す。ログインしていなければ Error を投げる */
export async function getUserId(): Promise<string> {
  const { data, error } = await getSupabase().auth.getUser();
  if (error || !data.user) {
    throw new Error("ログインしていません。もう一度ログインしてください", {
      cause: error ?? undefined,
    });
  }
  return data.user.id;
}

// 入力のチェックは validate.ts にまとめた（サーバーからも使うため）。これまでどおりここからも import できる
export { assertYen, assertNonNegativeInt, requireName } from "./validate";

/** Supabase のエラーを日本語のメッセージの Error に包む */
export function fail(message: string, cause?: unknown): never {
  throw new Error(message, { cause });
}

/** update / delete の結果が0件なら Error を投げる */
export function assertFound<T>(rows: T[] | null): T {
  if (!rows || rows.length === 0) {
    throw new Error("対象のデータが見つかりませんでした");
  }
  return rows[0];
}

/** ブラウザのローカル日付で今日を "YYYY-MM-DD" にする（toISOString は UTC なので使わない） */
export function todayString(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
