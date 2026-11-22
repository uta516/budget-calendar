/** 円の整数を「1,234」の形にする */
export function yen(amount: number): string {
  return amount.toLocaleString("ja-JP");
}

/** "2026-11-09" → "11/9" */
export function shortDate(date: string): string {
  const [, m, d] = date.split("-");
  return `${Number(m)}/${Number(d)}`;
}
