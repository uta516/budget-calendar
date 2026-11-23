import type { EventKind } from "@/lib/supabase";

// 【仮】種類ごとのだいたいの予想金額（円）
// 計算担当の No.24〜26（src/lib/budget.ts）ができたら、
// estimateAmount() の中身をその関数を呼ぶ形に差し替える。画面側はこの関数だけを使う
const TEMPORARY_AMOUNTS: Record<EventKind, number> = {
  drink: 4000,
  meal: 1500,
  fun: 3000,
  trip: 20000,
  shop: 3000,
  work: 0,
  other: 0,
};

/** 予定の種類から、予想金額（円の整数）を出す */
export function estimateAmount(kind: EventKind): number {
  return TEMPORARY_AMOUNTS[kind];
}
