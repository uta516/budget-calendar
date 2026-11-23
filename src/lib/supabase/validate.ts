// 入力のチェック（ブラウザ・サーバーのどちらからも使う。Supabase には触らない）

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
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) {
    throw new Error(`${label}を入力してください`);
  }
  return trimmed;
}
