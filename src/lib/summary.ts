// 画面がそのまま表示できる数字をまとめる関数（データの読み込み ＋ budget.ts の計算）
// "use client" のコンポーネントから呼ぶこと（データの関数がブラウザ用クライアントを使うため）
//
// 計算は src/lib/budget.ts の関数を使う。
// budget.ts に無い小さな計算は、このファイルの「budget.ts に無い計算」にまとめてある
// （計算担当に budget.ts へ移してテストを付けてもらう予定）。

import {
  categoryLeft,
  freeMoney,
  monthLeft,
  todayGuide,
  weekBudget,
  weekLeft,
} from "./budget";
// vitest には "@/" の設定が無いので、テストから読めるよう相対パスで import する
import {
  getCategories,
  getEvents,
  getExpenses,
  getFixedCosts,
  getGoal,
  getIncomes,
  type Category,
  type Event,
  type Expense,
  type FixedCost,
  type Goal,
  type Income,
} from "./supabase";
import { isMonth, nextMonth, toJstDate } from "./supabase/month";

// ───────── 戻り値の型 ─────────

export type DayGuide = {
  /** "2026-11-18" */
  date: string;
  /** "月"〜"日" */
  weekday: string;
  isToday: boolean;
  /** 今日より前の日 */
  isPast: boolean;
  /** 今日と同じ月の日か（月をまたぐ週で、前後の月の日は false） */
  inMonth: boolean;
  /** その日の目安（円）。過ぎた日は null */
  guide: number | null;
  /** その日に使った額（円）。今日の月の日だけ数える */
  spent: number;
  /** その日の予定の予想金額の合計（円） */
  plannedAmount: number;
  /** その日の予定の件数 */
  eventCount: number;
};

export type UpcomingEvent = {
  id: number;
  title: string;
  kind: string;
  /** ISO 形式（UTC 表記） */
  startsAt: string;
  /** 日本時間の日付 "2026-11-20" */
  date: string;
  estimatedAmount: number;
};

export type HomeSummary = {
  /** 今日（日本時間）"2026-11-18" */
  today: string;
  /** 今日の月 "2026-11" */
  month: string;
  /** 今月自由に使えるお金 */
  freeMoney: number;
  /** 今月あと使えるお金 */
  monthLeft: number;
  /** 今週の予算 */
  weekBudget: number;
  /** 今週使った額（今週のうち、今日の月の日の分だけ） */
  weekSpent: number;
  /** 今週あと使えるお金 */
  weekLeft: number;
  /** 今日の目安 */
  todayGuide: number;
  /** 月末までに予定で使う見込み（今日以降の予定） */
  plannedUntilMonthEnd: { amount: number; count: number };
  /** 普段使いに回せるお金（今月あと − 予定で使う見込み。マイナスもそのまま） */
  dailyMoney: number;
  /** 今週（月〜日）の日ごとの目安 */
  days: DayGuide[];
  /** これからの予定（今日以降、近い順に最大3件） */
  upcomingEvents: UpcomingEvent[];
};

export type CategorySummary = {
  id: number;
  name: string;
  /** 月の予算 */
  budget: number;
  /** 使った額 */
  spent: number;
  /** 予定で使う額（予定とカテゴリはまだ結びつけていないので、今は0） */
  planned: number;
  /** 残り（予算 − 使った額 − 予定の額） */
  left: number;
};

export type GoalSummary = {
  name: string;
  targetAmount: number;
  savedAmount: number;
  /** あといくら（マイナスにはしない） */
  remaining: number;
  /** 月にいくら貯めるか（あといくら ÷ 月数、1円単位で切り上げ） */
  perMonth: number;
};

export type BudgetSummary = {
  /** "2026-11" */
  month: string;
  /** 今月の収入合計 */
  incomeTotal: number;
  /** 今月あと使えるお金 */
  monthLeft: number;
  categories: CategorySummary[];
  /** カテゴリなし（カテゴリを削除した）の支出の合計 */
  uncategorizedSpent: number;
  /** 目標。まだ無ければ null */
  goal: GoalSummary | null;
};

// ───────── 日本時間の日付 ─────────

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

// toJstDate は month.ts にまとめた（これまでどおり summary からも import できる）
export { toJstDate };

function parts(date: string): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m, d];
}

/** "YYYY-MM-DD" に n 日足す */
function addDays(date: string, n: number): string {
  const [y, m, d] = parts(date);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 0=日〜6=土 */
function dayOfWeek(date: string): number {
  const [y, m, d] = parts(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** その週の月曜 */
function mondayOf(date: string): string {
  return addDays(date, -((dayOfWeek(date) + 6) % 7));
}


/**
 * budget.ts の関数に渡す Date。日本時間の暦（年・月・日・曜日）を、
 * ブラウザのタイムゾーンに関係なく getFullYear() / getDay() などで読めるようにする
 */
function calendarDate(date: string): Date {
  const [y, m, d] = parts(date);
  return new Date(y, m - 1, d);
}

// ───────── 合計 ─────────

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const sumAmount = (rows: { amount: number }[]) => sum(rows.map((r) => r.amount));

// ───────── budget.ts に無い計算（計算担当に移してもらう予定） ─────────

/** 目標の「あといくら」と「月にいくら」 */
export function goalProgress(goal: Pick<Goal, "target_amount" | "saved_amount" | "months">): {
  remaining: number;
  perMonth: number;
} {
  const remaining = Math.max(0, goal.target_amount - goal.saved_amount);
  if (remaining === 0) return { remaining, perMonth: 0 };
  const months = goal.months > 0 ? goal.months : 1;
  return { remaining, perMonth: Math.ceil(remaining / months) };
}

/** 普段使いに回せるお金（今月あと − 予定で使う見込み。マイナスもそのまま） */
export function dailyMoneyOf(monthLeftAmount: number, plannedAmount: number): number {
  return monthLeftAmount - plannedAmount;
}

// ───────── 組み立て（DB に触らない。テストしやすいように分けてある） ─────────

export type HomeSummaryInput = {
  incomes: Pick<Income, "amount">[];
  fixedCosts: Pick<FixedCost, "amount">[];
  goal: Goal | null;
  /** 今日の月の支出 */
  monthExpenses: Pick<Expense, "amount" | "spent_on">[];
  /** 今週の月曜の月・今日の月・来月の予定（重なりは除いてある） */
  events: Event[];
};

/** 読み込んだデータからホーム画面の数字を作る。today は日本時間の "YYYY-MM-DD" */
export function buildHomeSummary(input: HomeSummaryInput, today: string): HomeSummary {
  const month = today.slice(0, 7);
  const todayDate = calendarDate(today);

  const saving = input.goal ? goalProgress(input.goal).perMonth : 0;
  const free = freeMoney(sumAmount(input.incomes), sumAmount(input.fixedCosts), saving);
  const monthLeftAmount = monthLeft(free, sumAmount(input.monthExpenses));

  const monday = mondayOf(today);
  const sunday = addDays(monday, 6);
  const weekSpent = sumAmount(
    input.monthExpenses.filter((e) => e.spent_on >= monday && e.spent_on <= sunday),
  );
  const weekly = weekBudget(free, todayDate);
  const weekLeftAmount = weekLeft(weekly, weekSpent);
  const guide = todayGuide(weekLeftAmount, todayDate);

  // 予定は日本時間の日付で扱う
  const events = input.events
    .map((e) => ({ event: e, date: toJstDate(e.starts_at) }))
    .sort((a, b) => Date.parse(a.event.starts_at) - Date.parse(b.event.starts_at));
  const fromToday = events.filter((e) => e.date >= today);

  const plannedThisMonth = fromToday.filter((e) => e.date.startsWith(month));
  const plannedAmount = sum(plannedThisMonth.map((e) => e.event.estimated_amount));

  const days: DayGuide[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const inMonth = date.startsWith(month);
    const isPast = date < today;
    const dayEvents = events.filter((e) => e.date === date);
    return {
      date,
      weekday: WEEKDAYS[dayOfWeek(date)],
      isToday: date === today,
      isPast,
      inMonth,
      // 予定を考えた日ごとの計算（No.27・28）ができるまでは、今日の目安で均等に割る
      guide: isPast ? null : guide,
      spent: inMonth
        ? sumAmount(input.monthExpenses.filter((e) => e.spent_on === date))
        : 0,
      plannedAmount: sum(dayEvents.map((e) => e.event.estimated_amount)),
      eventCount: dayEvents.length,
    };
  });

  return {
    today,
    month,
    freeMoney: free,
    monthLeft: monthLeftAmount,
    weekBudget: weekly,
    weekSpent,
    weekLeft: weekLeftAmount,
    todayGuide: guide,
    plannedUntilMonthEnd: { amount: plannedAmount, count: plannedThisMonth.length },
    dailyMoney: dailyMoneyOf(monthLeftAmount, plannedAmount),
    days,
    upcomingEvents: fromToday.slice(0, 3).map(({ event, date }) => ({
      id: event.id,
      title: event.title,
      kind: event.kind,
      startsAt: event.starts_at,
      date,
      estimatedAmount: event.estimated_amount,
    })),
  };
}

export type BudgetSummaryInput = {
  incomes: Pick<Income, "amount">[];
  fixedCosts: Pick<FixedCost, "amount">[];
  goal: Goal | null;
  categories: Pick<Category, "id" | "name" | "monthly_budget">[];
  /** その月の支出 */
  expenses: Pick<Expense, "amount" | "category_id">[];
};

/** 読み込んだデータから予算画面の数字を作る */
export function buildBudgetSummary(input: BudgetSummaryInput, month: string): BudgetSummary {
  const progress = input.goal ? goalProgress(input.goal) : null;
  const incomeTotal = sumAmount(input.incomes);
  const free = freeMoney(incomeTotal, sumAmount(input.fixedCosts), progress?.perMonth ?? 0);

  const categoryIds = new Set(input.categories.map((c) => c.id));
  const categories: CategorySummary[] = input.categories.map((c) => {
    const spent = sumAmount(input.expenses.filter((e) => e.category_id === c.id));
    const planned = 0; // 予定とカテゴリを結びつけたら、ここに予定の額を入れる
    return {
      id: c.id,
      name: c.name,
      budget: c.monthly_budget,
      spent,
      planned,
      left: categoryLeft(c.monthly_budget, spent + planned),
    };
  });

  return {
    month,
    incomeTotal,
    monthLeft: monthLeft(free, sumAmount(input.expenses)),
    categories,
    uncategorizedSpent: sumAmount(
      input.expenses.filter((e) => e.category_id === null || !categoryIds.has(e.category_id)),
    ),
    goal:
      input.goal && progress
        ? {
            name: input.goal.name,
            targetAmount: input.goal.target_amount,
            savedAmount: input.goal.saved_amount,
            remaining: progress.remaining,
            perMonth: progress.perMonth,
          }
        : null,
  };
}

// ───────── 画面から呼ぶ関数 ─────────

/** ホーム画面の数字。today を省略したら今（日本時間で日付を決める） */
export async function getHomeSummary(today: Date = new Date()): Promise<HomeSummary> {
  const todayStr = toJstDate(today);
  const month = todayStr.slice(0, 7);
  // 今週の月曜が前の月なら、その月の予定も読む（日ごとの予定の件数のため）
  const months = [...new Set([mondayOf(todayStr).slice(0, 7), month, nextMonth(month)])];

  const [incomes, fixedCosts, goal, monthExpenses, eventLists] = await Promise.all([
    getIncomes(),
    getFixedCosts(),
    getGoal(),
    getExpenses(month),
    Promise.all(months.map((m) => getEvents(m))),
  ]);

  return buildHomeSummary(
    { incomes, fixedCosts, goal, monthExpenses, events: eventLists.flat() },
    todayStr,
  );
}

/** 予算画面の数字。month（"2026-11"）を省略したら今月（日本時間） */
export async function getBudgetSummary(month?: string): Promise<BudgetSummary> {
  const target = month ?? toJstDate(new Date()).slice(0, 7);
  if (!isMonth(target)) {
    throw new Error("月は \"2026-11\" の形で指定してください");
  }

  const [incomes, fixedCosts, goal, categories, expenses] = await Promise.all([
    getIncomes(),
    getFixedCosts(),
    getGoal(),
    getCategories(),
    getExpenses(target),
  ]);

  return buildBudgetSummary({ incomes, fixedCosts, goal, categories, expenses }, target);
}
