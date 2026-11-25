import type { Expense } from "@/lib/supabase";

/** "2026-11-20" どうしの日数の差（絶対値） */
function dayDistance(a: string, b: string): number {
  return Math.abs(Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000;
}

/** 予定に結びつける候補：どの予定にも結びついていない支出を、予定の日に近い順に並べる */
export function linkCandidates(expenses: Expense[], eventDate: string): Expense[] {
  return expenses
    .filter((x) => x.event_id === null)
    .sort((a, b) => dayDistance(a.spent_on, eventDate) - dayDistance(b.spent_on, eventDate) || b.id - a.id);
}
