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
/** 取り分け対象の予定。対象日・種類・記録済みの判定は呼び出し側で行う。 */
export type DailyBudgetPlan = {
  date: string;
  amount: number;
};

export type DailyBudgetAllocation = {
  daily: {
    date: string;
    normal: number;
    planned: number;
    guide: number;
  }[];
  plannedTotal: number;
  normalLeft: number;
  shortage: number;
};

/** 予定分を取り分け、残りを対象日へ均等に配分する。 */
export function allocateDailyBudget(
  days: readonly string[],
  weekLeft: number,
  plans: readonly DailyBudgetPlan[],
): DailyBudgetAllocation {
  const plannedTotal = plans.reduce((total, plan) => total + plan.amount, 0);
  const normalLeft = Math.max(0, weekLeft - plannedTotal);
  const shortage = Math.max(0, plannedTotal - weekLeft);

  // 対象日が無ければ日割りしない。切り捨てるのは普段使いの1日分だけ。
  const normal = days.length === 0 ? 0 : Math.floor(normalLeft / days.length / 10) * 10;
  const daily = days.map((date) => {
    const planned = plans
      .filter((plan) => plan.date === date)
      .reduce((total, plan) => total + plan.amount, 0);
    return { date, normal, planned, guide: normal + planned };
  });

  return { daily, plannedTotal, normalLeft, shortage };
}
