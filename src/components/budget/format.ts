/** 円の整数を「1,234」の形にする */
export function yen(amount: number): string {
  return amount.toLocaleString("ja-JP");
}

/** 0〜100 の範囲におさめた割合（%） */
export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(Math.max((part / whole) * 100, 0), 100);
}
