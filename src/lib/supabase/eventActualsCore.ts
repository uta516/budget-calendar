// 予定の「予想」と「実際」の計算（DB に触らない純関数。テストは eventActualsCore.test.ts）
// vitest には "@/" の設定が無いので、import は相対パスにする

import type { Event } from "./events";
import type { Expense } from "./expenses";
import { EVENT_KINDS } from "./eventInput";
import { toJstDate } from "./month";

/** 計算に使う予定の列 */
export type ActualEvent = Pick<
  Event,
  "id" | "title" | "kind" | "starts_at" | "ends_at" | "estimated_amount"
>;

/** 計算に使う支出の列（event_id で予定と結びつく） */
export type LinkedExpense = Pick<Expense, "amount" | "event_id">;

/** 出費として数えない種類（バイトはお金をもらう予定のため） */
export const NON_SPENDING_KINDS: readonly string[] = ["work"];

const isSpendingKind = (kind: string) => !NON_SPENDING_KINDS.includes(kind);

/** 予定の終わり（ミリ秒）。終了日時が無い予定は、開始日時で判定する */
export function eventEnd(event: Pick<ActualEvent, "starts_at" | "ends_at">): number {
  return Date.parse(event.ends_at ?? event.starts_at);
}

/** 予定がもう終わっているか（終わりが now より前） */
export function isEnded(event: Pick<ActualEvent, "starts_at" | "ends_at">, now: Date): boolean {
  return eventEnd(event) < now.getTime();
}

/** 予定ごとの、結びついた支出の合計と件数 */
function totalsByEvent(expenses: LinkedExpense[]): Map<number, { sum: number; count: number }> {
  const map = new Map<number, { sum: number; count: number }>();
  for (const e of expenses) {
    if (e.event_id === null) continue;
    const t = map.get(e.event_id) ?? { sum: 0, count: 0 };
    t.sum += e.amount;
    t.count += 1;
    map.set(e.event_id, t);
  }
  return map;
}

const byStart = (a: ActualEvent, b: ActualEvent) =>
  Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id - b.id;

// ───────── 1. 記録し忘れた予定 ─────────

export type MissedEvent = {
  eventId: number;
  title: string;
  kind: string;
  /** 日本時間の日付 "2026-11-20" */
  date: string;
  startsAt: string;
  endsAt: string | null;
  /** 予想金額 */
  estimated: number;
};

/**
 * 記録し忘れた予定：もう終わっていて、結びついた支出が1件も無いもの（開始日時の早い順）。
 * 次の予定は外す：種類が work（出費ではない）、予想金額が0円（Google から同期した授業や会議など）
 */
export function findMissedEvents(
  events: ActualEvent[],
  expenses: LinkedExpense[],
  now: Date,
): MissedEvent[] {
  const totals = totalsByEvent(expenses);
  return events
    .filter(
      (e) =>
        isSpendingKind(e.kind) &&
        e.estimated_amount > 0 &&
        isEnded(e, now) &&
        !totals.has(e.id),
    )
    .sort(byStart)
    .map((e) => ({
      eventId: e.id,
      title: e.title,
      kind: e.kind,
      date: toJstDate(e.starts_at),
      startsAt: e.starts_at,
      endsAt: e.ends_at,
      estimated: e.estimated_amount,
    }));
}

// ───────── 2. 予想と実際 ─────────

export type EventActual = {
  eventId: number;
  title: string;
  kind: string;
  /** 日本時間の日付 "2026-11-20" */
  date: string;
  startsAt: string;
  /** もう終わっているか */
  ended: boolean;
  /** 予想金額 */
  estimated: number;
  /** 実際（結びついた支出の合計）。記録が無ければ 0 */
  actual: number;
  /** 差（実際 − 予想。プラスなら予想より多く使った）。記録が無ければ null */
  diff: number | null;
  /** 結びついた支出の件数 */
  expenseCount: number;
  /** 支出が1件以上記録されているか */
  recorded: boolean;
};

/** 予定ごとの予想と実際（開始日時の早い順。work は外す。予想金額が0円の予定は入れる） */
export function buildEventActuals(
  events: ActualEvent[],
  expenses: LinkedExpense[],
  now: Date,
): EventActual[] {
  const totals = totalsByEvent(expenses);
  return events
    .filter((e) => isSpendingKind(e.kind))
    .sort(byStart)
    .map((e) => {
      const t = totals.get(e.id);
      const recorded = t !== undefined;
      const actual = t?.sum ?? 0;
      return {
        eventId: e.id,
        title: e.title,
        kind: e.kind,
        date: toJstDate(e.starts_at),
        startsAt: e.starts_at,
        ended: isEnded(e, now),
        estimated: e.estimated_amount,
        actual,
        diff: recorded ? actual - e.estimated_amount : null,
        expenseCount: t?.count ?? 0,
        recorded,
      };
    });
}

export type ActualsSummary = {
  /** 支出が記録されている予定の件数 */
  recordedCount: number;
  /** 記録し忘れた予定の件数（終わっていて記録が無く、予想金額が1円以上） */
  missedCount: number;
  /** まだ終わっていない予定の件数 */
  upcomingCount: number;
  /** 記録されている予定だけの、予想の合計・実際の合計・差（実際 − 予想） */
  estimated: number;
  actual: number;
  diff: number;
};

/** 予想と実際のまとめ。合計は、支出が記録されている予定だけで出す（記録が無い予定を混ぜると差が意味を持たないため） */
export function summarizeActuals(actuals: EventActual[]): ActualsSummary {
  const recorded = actuals.filter((a) => a.recorded);
  const estimated = recorded.reduce((s, a) => s + a.estimated, 0);
  const actual = recorded.reduce((s, a) => s + a.actual, 0);
  return {
    recordedCount: recorded.length,
    missedCount: actuals.filter((a) => a.ended && !a.recorded && a.estimated > 0).length,
    upcomingCount: actuals.filter((a) => !a.ended).length,
    estimated,
    actual,
    diff: actual - estimated,
  };
}

// ───────── 3. 種類ごとの実際の平均（No.39 の土台） ─────────

export type KindAverage = {
  kind: string;
  /** 1回あたりの実際の支出（1円単位で四捨五入） */
  average: number;
  /** 平均に使った予定の件数 */
  count: number;
  /** 実際の支出の合計 */
  total: number;
};

/**
 * 種類ごとの実際の平均。もう終わっていて、支出が記録されている予定だけを使う（work は外す）。
 * 並びは EVENT_KINDS の順（決まっていない種類は最後）
 */
export function averageByKind(
  events: ActualEvent[],
  expenses: LinkedExpense[],
  now: Date,
): KindAverage[] {
  const totals = totalsByEvent(expenses);
  const byKind = new Map<string, { total: number; count: number }>();
  for (const e of events) {
    const t = totals.get(e.id);
    if (!t || !isSpendingKind(e.kind) || !isEnded(e, now)) continue;
    const k = byKind.get(e.kind) ?? { total: 0, count: 0 };
    k.total += t.sum;
    k.count += 1;
    byKind.set(e.kind, k);
  }
  const order = (kind: string) => {
    const i = (EVENT_KINDS as readonly string[]).indexOf(kind);
    return i === -1 ? EVENT_KINDS.length : i;
  };
  return [...byKind.entries()]
    .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b))
    .map(([kind, { total, count }]) => ({
      kind,
      average: Math.round(total / count),
      count,
      total,
    }));
}
