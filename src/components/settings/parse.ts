/** 入力欄の文字をチェックした結果。OK なら value、だめなら注意の文 */
export type Parsed<T> = { ok: true; value: T } | { ok: false; warning: string };

/** 全角の数字を半角にし、カンマと前後の空白を取る */
function normalize(text: string): string {
  return text
    .replace(/[０-９．－]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,，]/g, "")
    .trim();
}

/** 金額（円の整数）。min より小さいとだめ */
export function parseYen(text: string, label: string, min = 0): Parsed<number> {
  const t = normalize(text);
  if (t === "") return { ok: false, warning: `${label}を入れてください` };
  if (t.startsWith("-")) return { ok: false, warning: `${label}はマイナスにできません` };
  if (!/^\d+$/.test(t)) {
    return { ok: false, warning: `${label}は数字だけで入れてください（円の整数）` };
  }
  const value = Number(t);
  if (!Number.isSafeInteger(value)) return { ok: false, warning: `${label}が大きすぎます` };
  if (value < min) return { ok: false, warning: `${label}は${min}円以上にしてください` };
  return { ok: true, value };
}

/** 月数（1以上の整数） */
export function parseMonths(text: string): Parsed<number> {
  const t = normalize(text);
  if (t === "") return { ok: false, warning: "月数を入れてください" };
  if (t.startsWith("-")) return { ok: false, warning: "月数はマイナスにできません" };
  if (!/^\d+$/.test(t)) return { ok: false, warning: "月数は数字だけで入れてください（整数）" };
  const value = Number(t);
  if (value < 1 || value > 600) return { ok: false, warning: "月数は1〜600にしてください" };
  return { ok: true, value };
}

/** 深夜の割増の倍率（1以上の数。小数あり） */
export function parseRate(text: string): Parsed<number> {
  const t = normalize(text);
  if (t === "") return { ok: false, warning: "深夜の割増を入れてください" };
  if (t.startsWith("-")) return { ok: false, warning: "深夜の割増はマイナスにできません" };
  if (!/^\d+(\.\d+)?$/.test(t)) {
    return { ok: false, warning: "深夜の割増は数字で入れてください（例：1.25）" };
  }
  const value = Number(t);
  if (value < 1 || value > 3) {
    return { ok: false, warning: "深夜の割増は1〜3の倍率で入れてください（例：1.25）" };
  }
  return { ok: true, value };
}

/** 名前（空はだめ） */
export function parseName(text: string, label: string): Parsed<string> {
  const t = text.trim();
  if (t === "") return { ok: false, warning: `${label}を入れてください` };
  return { ok: true, value: t };
}

/** 円の整数を「1,234」の形にする */
export function yen(amount: number): string {
  return amount.toLocaleString("ja-JP");
}
