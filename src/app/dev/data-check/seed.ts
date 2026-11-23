// 見本データ（デモ用）を入れる・消す。開発用の確認ページからだけ使う。
// 注意：ログイン中のユーザーの収入・固定費・支出・手入力の予定・目標は、すべて消える。
// カテゴリ・設定・Googleから同期した予定は残す。

import {
  addEvent,
  addExpense,
  addFixedCost,
  addIncome,
  ensureDefaultCategories,
  saveGoal,
  type Category,
  type EventKind,
} from "@/lib/supabase";
import { createClient } from "@/lib/supabase/client";
import { toJstDate } from "@/lib/summary";

export type SeedResult = {
  incomes: number;
  fixedCosts: number;
  expenses: number;
  expenseTotal: number;
  events: number;
  /** 今日が月末で、今月の「今日より後の日」が無かったため予定を入れなかった */
  eventsSkipped: boolean;
};

// ───────── 日付（日本時間の "YYYY-MM-DD"） ─────────

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function mondayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return addDays(date, -((dow + 6) % 7));
}

function monthEndOf(date: string): string {
  const [y, m] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

const maxDate = (a: string, b: string) => (a > b ? a : b);
const minDate = (a: string, b: string) => (a < b ? a : b);

// ───────── 見本の中身 ─────────

const INCOMES = [
  { name: "仕送り", amount: 52000 },
  { name: "バイト", amount: 30800 },
];

const FIXED_COSTS = [
  { name: "スマホ代", amount: 3000 },
  { name: "サブスク", amount: 1500 },
  { name: "定期代", amount: 6000 },
];

const GOAL = {
  name: "春休みの旅行資金",
  targetAmount: 30000,
  months: 3,
  savedAmount: 10000,
};

/** 今週の支出（今日から何日前か） */
const THIS_WEEK_EXPENSES = [
  { category: "食費", amount: 850, daysAgo: 0 },
  { category: "遊び・飲み会", amount: 2500, daysAgo: 1 },
  { category: "食費", amount: 1200, daysAgo: 2 },
];

/** 今週より前の今月の支出（今週の月曜から何日前か） */
const EARLIER_EXPENSES = [
  { category: "遊び・飲み会", amount: 4800, daysBeforeWeek: 1 },
  { category: "食費", amount: 3200, daysBeforeWeek: 3 },
  { category: "交通費", amount: 1500, daysBeforeWeek: 6 },
  { category: "その他", amount: 2650, daysBeforeWeek: 9 },
  { category: "食費", amount: 2300, daysBeforeWeek: 12 },
];
// 合計 19,000円

/** 手入力の予定（今日から何日後か。時刻は日本時間） */
const EVENTS: {
  title: string;
  kind: EventKind;
  amount: number;
  daysLater: number;
  start: string;
  end?: string;
}[] = [
  { title: "サークル飲み会", kind: "drink", amount: 4000, daysLater: 2, start: "19:00" },
  { title: "映画", kind: "fun", amount: 3500, daysLater: 5, start: "14:00" },
  { title: "日帰り旅行", kind: "trip", amount: 11000, daysLater: 9, start: "09:00", end: "20:00" },
];

// ───────── 消す ─────────

/** 収入・固定費・支出・手入力の予定・目標をすべて消す（自分の行だけ。RLS で守られている） */
export async function clearDemoData(): Promise<void> {
  const supabase = createClient();
  const steps = [
    { label: "収入", run: () => supabase.from("incomes").delete().not("id", "is", null) },
    { label: "固定費", run: () => supabase.from("fixed_costs").delete().not("id", "is", null) },
    { label: "支出", run: () => supabase.from("expenses").delete().not("id", "is", null) },
    { label: "手入力の予定", run: () => supabase.from("events").delete().is("google_event_id", null) },
    { label: "目標", run: () => supabase.from("goals").delete().not("id", "is", null) },
  ];
  for (const step of steps) {
    const { error } = await step.run();
    if (error) {
      throw new Error(`${step.label}の削除に失敗しました`, { cause: error });
    }
  }
}

// ───────── 入れる ─────────

function findCategoryId(categories: Category[], name: string): number {
  return (categories.find((c) => c.name === name) ?? categories[0]).id;
}

/** 見本データを入れる（先に clearDemoData で片付ける） */
export async function seedDemoData(now: Date = new Date()): Promise<SeedResult> {
  await clearDemoData();

  const today = toJstDate(now);
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthEnd = monthEndOf(today);
  const weekStart = maxDate(mondayOf(today), monthStart);

  for (const income of INCOMES) await addIncome(income.name, income.amount);
  for (const cost of FIXED_COSTS) await addFixedCost(cost.name, cost.amount);
  await saveGoal(GOAL);

  const categories = await ensureDefaultCategories();

  // 支出：日付は「今月1日〜今日」に収める
  const expenses = [
    ...THIS_WEEK_EXPENSES.map((e) => ({
      ...e,
      date: maxDate(addDays(today, -e.daysAgo), weekStart),
    })),
    ...EARLIER_EXPENSES.map((e) => ({
      ...e,
      // 今週より前の今月の日が無ければ（月の初め）、今週の日に入れる
      date:
        weekStart > monthStart
          ? maxDate(addDays(weekStart, -e.daysBeforeWeek), monthStart)
          : weekStart,
    })),
  ];
  for (const e of expenses) {
    await addExpense({
      amount: e.amount,
      categoryId: findCategoryId(categories, e.category),
      spentOn: minDate(e.date, today),
    });
  }

  // 予定：今日より後の今月の日。月末を越えるなら月末に寄せる。今日が月末なら入れない
  const eventsSkipped = today >= monthEnd;
  if (!eventsSkipped) {
    for (const e of EVENTS) {
      const date = minDate(addDays(today, e.daysLater), monthEnd);
      await addEvent({
        title: e.title,
        kind: e.kind,
        startsAt: `${date}T${e.start}:00+09:00`,
        endsAt: e.end ? `${date}T${e.end}:00+09:00` : null,
        estimatedAmount: e.amount,
      });
    }
  }

  return {
    incomes: INCOMES.length,
    fixedCosts: FIXED_COSTS.length,
    expenses: expenses.length,
    expenseTotal: expenses.reduce((total, e) => total + e.amount, 0),
    events: eventsSkipped ? 0 : EVENTS.length,
    eventsSkipped,
  };
}
