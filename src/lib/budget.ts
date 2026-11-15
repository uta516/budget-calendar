// freeMoneyとmonthLeftは実装済み。他の関数は仮の値を返す。
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
  return 0;
}

/** 今週あと使えるお金 */
export function weekLeft(weekly: number, spentThisWeek: number): number {
  return 0;
}

/** 今日の目安 */
export function todayGuide(weekLeftAmount: number, today: Date): number {
  return 0;
}

/** カテゴリ別の残り */
export function categoryLeft(budget: number, spent: number): number {
  return 0;
}