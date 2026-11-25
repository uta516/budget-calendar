import type { Event, MissedEvent } from "@/lib/supabase";
import { jstDate } from "@/components/calendar/dates";

/** 記録画面で選べる予定 */
export type PickableEvent = {
  id: number;
  title: string;
  kind: string;
  /** 日本時間の日付 "2026-11-20" */
  date: string;
  /** 予想金額 */
  estimated: number;
  /** 記録し忘れ（終わっていて、まだ支出が結びついていない） */
  missed: boolean;
};

/** 何日前までの予定を「最近の予定」として出すか */
export const RECENT_DAYS = 14;

/** "2026-11-20" に日数を足す（マイナスで引く） */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "2026-11" の前の月 "2026-10" */
export function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
}

/**
 * 記録画面で選べる予定を作る。
 * 今日から RECENT_DAYS 日前までに始まった予定と、記録し忘れた予定を、新しい順に並べる。
 * バイト（work）と、まだ来ていない日の予定は出さない（支出は今日より後の日付にできないため）
 */
export function pickableEvents(events: Event[], missed: MissedEvent[], today: string): PickableEvent[] {
  const from = addDays(today, -RECENT_DAYS);
  const missedIds = new Set(missed.map((m) => m.eventId));
  const byId = new Map<number, PickableEvent>();

  for (const e of events) {
    const date = jstDate(e.starts_at);
    if (e.kind === "work" || date < from || date > today) continue;
    byId.set(e.id, {
      id: e.id,
      title: e.title,
      kind: e.kind,
      date,
      estimated: e.estimated_amount,
      missed: missedIds.has(e.id),
    });
  }
  for (const m of missed) {
    if (byId.has(m.eventId) || m.date > today) continue;
    byId.set(m.eventId, {
      id: m.eventId,
      title: m.title,
      kind: m.kind,
      date: m.date,
      estimated: m.estimated,
      missed: true,
    });
  }

  return [...byId.values()].sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));
}
