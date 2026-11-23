/** 円の整数を「1,234」の形にする */
export function yen(amount: number): string {
  return amount.toLocaleString("ja-JP");
}

/** 日本時間の今日 "2026-11-12" */
export function todayInJapan(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

/** "2026-11-12" → "11/12" */
export function shortDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}
