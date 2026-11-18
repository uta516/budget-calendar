// 月の扱い（ブラウザ・サーバーのどちらからも使う。Supabase には触らない）

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** 日本時間のオフセット。月の区切りは日本時間で行う */
export const JST_OFFSET = "+09:00";

const jstDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 日時 → 日本時間の日付 "YYYY-MM-DD"（ブラウザ・サーバーのタイムゾーンに関係なく） */
export function toJstDate(value: Date | string): string {
  return jstDateFormat.format(typeof value === "string" ? new Date(value) : value);
}

/** 日本時間の今月 "2026-11" */
export function currentMonth(now: Date = new Date()): string {
  return toJstDate(now).slice(0, 7);
}

/** "2026-11" → "2026-12"、"2026-12" → "2027-01" */
export function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** "2026-11" の形なら true */
export function isMonth(value: unknown): value is string {
  return typeof value === "string" && MONTH_PATTERN.test(value);
}

/** "2026-11" → { from: "2026-11-01", to: "2026-12-01" }（to は含まない） */
export function monthDateRange(month: string): { from: string; to: string } {
  const match = MONTH_PATTERN.exec(month);
  if (!match) {
    throw new Error("月は \"2026-11\" の形で指定してください");
  }
  const year = Number(match[1]);
  const m = Number(match[2]);
  const nextYear = m === 12 ? year + 1 : year;
  const nextMonth = m === 12 ? 1 : m + 1;
  return {
    from: `${month}-01`,
    to: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}

/** "2026-11" → 日本時間の 11/1 0:00 以上、12/1 0:00 未満（ISO 形式） */
export function monthTimeRange(month: string): { from: string; to: string } {
  const { from, to } = monthDateRange(month);
  return {
    from: `${from}T00:00:00${JST_OFFSET}`,
    to: `${to}T00:00:00${JST_OFFSET}`,
  };
}
