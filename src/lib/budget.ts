// 中間発表向けの計算関数は実装済み。
// 決まりは AGENTS.md の「計算の関数」を見ること。

/** 今月自由に使えるお金 */
export function freeMoney(income: number, fixedCosts: number, saving: number): number {
  return Math.max(0, income - fixedCosts - saving);
}

/** 今月あと使えるお金 */
export function monthLeft(free: number, spentThisMonth: number): number {
  return free - spentThisMonth;
}

/** 今週の予算 */
export function weekBudget(free: number, today: Date): number {
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return Math.floor(((free / daysInMonth) * 7) / 10) * 10;
}

/** 今週あと使えるお金 */
export function weekLeft(weekly: number, spentThisWeek: number): number {
  return weekly - spentThisWeek;
}

/** 今日の目安 */
export function todayGuide(weekLeftAmount: number, today: Date): number {
  const daysRemaining = today.getDay() === 0 ? 1 : 8 - today.getDay();
  return Math.max(0, Math.floor(weekLeftAmount / daysRemaining / 10) * 10);
}

/** カテゴリ別の残り */
export function categoryLeft(budget: number, spent: number): number {
  return budget - spent;
}