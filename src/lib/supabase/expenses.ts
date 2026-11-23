import type { Tables } from "@/types/database";
import {
  assertFound,
  assertOwnEvent,
  assertYen,
  fail,
  getSupabase,
  type DataClient,
  getUserId,
  todayString,
} from "./helpers";

export type Expense = Tables<"expenses">;

export type NewExpense = {
  /** 金額（円の整数） */
  amount: number;
  categoryId: number;
  /** 予定に結びつける場合だけ */
  eventId?: number;
  /** "YYYY-MM-DD"。省略したら今日 */
  spentOn?: string;
};

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-11" → ["2026-11-01", "2026-12-01"] */
function monthRange(month: string): [string, string] {
  const match = MONTH_PATTERN.exec(month);
  if (!match) {
    throw new Error("月は \"2026-11\" の形で指定してください");
  }
  const year = Number(match[1]);
  const m = Number(match[2]);
  const nextYear = m === 12 ? year + 1 : year;
  const nextMonth = m === 12 ? 1 : m + 1;
  return [
    `${month}-01`,
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  ];
}

/** その月の支出の一覧（新しい日付順） */
export async function getExpenses(month: string, client?: DataClient): Promise<Expense[]> {
  const [from, to] = monthRange(month);
  const { data, error } = await getSupabase(client)
    .from("expenses")
    .select("*")
    .gte("spent_on", from)
    .lt("spent_on", to)
    .order("spent_on", { ascending: false })
    .order("id", { ascending: false });
  if (error) fail("支出の読み込みに失敗しました", error);
  return data;
}

/** 支出を追加する */
export async function addExpense({
  amount,
  categoryId,
  eventId,
  spentOn,
}: NewExpense): Promise<Expense> {
  assertYen(amount);
  const date = spentOn ?? todayString();
  if (!DATE_PATTERN.test(date)) {
    throw new Error("日付は \"2026-11-14\" の形で指定してください");
  }
  // 予定と結びつけるときは、先に自分の予定かを確かめる（linkExpenseToEvent と同じ）
  if (eventId !== undefined && eventId !== null) {
    await assertOwnEvent(eventId);
  }
  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from("expenses")
    .insert({
      user_id: userId,
      amount,
      category_id: categoryId,
      event_id: eventId ?? null,
      spent_on: date,
    })
    .select()
    .single();
  if (error) fail("支出の追加に失敗しました", error);
  return data;
}

/** 支出を削除する */
export async function deleteExpense(id: number): Promise<void> {
  const { data, error } = await getSupabase()
    .from("expenses")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail("支出の削除に失敗しました", error);
  assertFound(data);
}
