import { createClient } from "./client";

// データ関数の共通処理（画面からは直接使わない）

export function getSupabase() {
  return createClient();
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

/** 金額（円）が0以上の整数かを確かめる */
export function assertYen(value: number, label = "金額"): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label}は0以上の整数（円）で入力してください`);
  }
}

/** 0以上の整数かを確かめる（月数など） */
export function assertNonNegativeInt(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label}は0以上の整数で入力してください`);
  }
}

/** 空でない文字列かを確かめ、前後の空白を取って返す */
export function requireName(value: string, label = "名前"): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${label}を入力してください`);
  }
  return trimmed;
}

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
