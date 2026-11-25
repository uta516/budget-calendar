// 予定に結びついた支出（expenses.event_id）を読む。eventActuals.ts と summary.ts から使う。
// 画面からは使わないので index.ts からは export しない

import { fail, getSupabase, type DataClient } from "./helpers";
import type { LinkedExpense } from "./eventActualsCore";

// .in() に一度に渡す id の数（URL が長くなりすぎないように）
const IN_CHUNK = 100;

/** 予定に結びついた支出（支出の日付が別の月でも数える） */
export async function getExpensesForEvents(
  eventIds: number[],
  client?: DataClient,
): Promise<LinkedExpense[]> {
  const result: LinkedExpense[] = [];
  for (let i = 0; i < eventIds.length; i += IN_CHUNK) {
    const { data, error } = await getSupabase(client)
      .from("expenses")
      .select("amount, event_id")
      .in("event_id", eventIds.slice(i, i + IN_CHUNK));
    if (error) fail("予定に結びついた支出の読み込みに失敗しました", error);
    result.push(...data);
  }
  return result;
}
