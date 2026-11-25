// 記録し忘れた予定・予想と実際・種類ごとの平均（データの読み込み。計算は eventActualsCore.ts）
// 画面からは "use client" のコンポーネントで呼ぶ。サーバーから呼ぶときは client を渡す

import type { Expense } from "./expenses";
import { getEvents } from "./events";
import { assertFound, assertOwnEvent, fail, getSupabase, type DataClient } from "./helpers";
import { getExpensesForEvents } from "./linkedExpenses";
import { currentMonth, isMonth } from "./month";
import {
  averageByKind,
  buildEventActuals,
  findMissedEvents,
  summarizeActuals,
  type ActualEvent,
  type ActualsSummary,
  type EventActual,
  type KindAverage,
  type MissedEvent,
} from "./eventActualsCore";

export type { MissedEvent, EventActual, ActualsSummary, KindAverage } from "./eventActualsCore";

export type EventActualsResult = {
  /** "2026-11" */
  month: string;
  /** 予定ごとの予想と実際（開始日時の早い順） */
  events: EventActual[];
  /** まとめ（合計は、支出が記録されている予定だけ） */
  summary: ActualsSummary;
};

// .in() に一度に渡す id の数（URL が長くなりすぎないように）
const IN_CHUNK = 100;

function targetMonth(month?: string): string {
  const m = month ?? currentMonth();
  if (!isMonth(m)) {
    throw new Error("月は \"2026-11\" の形で指定してください");
  }
  return m;
}

/** その月（省略したら今月）の予定と、結びついた支出 */
async function loadMonth(month: string, client?: DataClient) {
  const events = await getEvents(month, client);
  const expenses = await getExpensesForEvents(
    events.map((e) => e.id),
    client,
  );
  return { events, expenses };
}

/**
 * 記録し忘れた予定の一覧：その月の予定のうち、もう終わっていて、結びついた支出（expenses.event_id）が1件も無いもの。
 * 種類が work の予定と、予想金額が0円の予定（Google から同期した授業や会議など）は外す。
 */
export async function getMissedEvents(month?: string, client?: DataClient): Promise<MissedEvent[]> {
  const m = targetMonth(month);
  const { events, expenses } = await loadMonth(m, client);
  return findMissedEvents(events, expenses, new Date());
}

/**
 * 予想と実際：その月の予定ごとに、予想金額・実際（結びついた支出の合計）・差（実際 − 予想）を返す。
 * work の予定は外す。予想金額が0円の予定は入れる。まとめ（summary）の合計は、支出が記録されている予定だけで出す。
 */
export async function getEventActuals(month?: string, client?: DataClient): Promise<EventActualsResult> {
  const m = targetMonth(month);
  const { events, expenses } = await loadMonth(m, client);
  const actuals = buildEventActuals(events, expenses, new Date());
  return { month: m, events: actuals, summary: summarizeActuals(actuals) };
}

/**
 * 種類ごとの実際の平均（No.39 の土台）：もう終わっていて、支出が記録されている予定だけを使う（月は区切らない）。
 * work の予定は外す。
 */
export async function getKindAverages(client?: DataClient): Promise<KindAverage[]> {
  const supabase = getSupabase(client);
  const { data: expenses, error } = await supabase
    .from("expenses")
    .select("amount, event_id")
    .not("event_id", "is", null);
  if (error) fail("予定に結びついた支出の読み込みに失敗しました", error);

  const ids = [...new Set(expenses.map((e) => e.event_id).filter((id): id is number => id !== null))];
  const events: ActualEvent[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const { data, error: eventsError } = await supabase
      .from("events")
      .select("id, title, kind, starts_at, ends_at, estimated_amount")
      .in("id", ids.slice(i, i + IN_CHUNK));
    if (eventsError) fail("予定の読み込みに失敗しました", eventsError);
    events.push(...data);
  }
  return averageByKind(events, expenses, new Date());
}

/**
 * 記録済みの支出を、予定に結びつける（eventId を null にすると結びつきを外す）。
 * 記録し忘れの一覧から「もう記録してある支出」を選んで結びつけるときに使う。
 */
export async function linkExpenseToEvent(expenseId: number, eventId: number | null): Promise<Expense> {
  // 結びつけるときは、先に自分の予定かを確かめる（addExpense と同じ）
  if (eventId !== null) await assertOwnEvent(eventId);
  const { data, error } = await getSupabase()
    .from("expenses")
    .update({ event_id: eventId })
    .eq("id", expenseId)
    .select();
  if (error) fail("支出と予定の結びつけに失敗しました", error);
  return assertFound(data);
}
