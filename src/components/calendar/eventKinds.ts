import type { EventKind } from "@/lib/supabase";

type KindStyle = {
  label: string;
  /** カレンダーの点の色（FullCalendar に渡す） */
  color: string;
  /** 凡例や一覧の点に使う Tailwind のクラス */
  dotClass: string;
};

// 予定の種類ごとの名前と色
export const KIND_STYLES: Record<EventKind, KindStyle> = {
  drink: { label: "飲み会", color: "#ea580c", dotClass: "bg-orange-600" },
  meal: { label: "食事", color: "#f59e0b", dotClass: "bg-amber-500" },
  fun: { label: "遊び", color: "#8b5cf6", dotClass: "bg-violet-500" },
  trip: { label: "旅行", color: "#2563eb", dotClass: "bg-blue-600" },
  shop: { label: "買い物", color: "#db2777", dotClass: "bg-pink-600" },
  work: { label: "バイト", color: "#0f766e", dotClass: "bg-teal-700" },
  other: { label: "その他", color: "#71717a", dotClass: "bg-zinc-500" },
};

/** DB の kind（文字列）から見た目を取る。知らない種類は「その他」 */
export function kindStyle(kind: string): KindStyle {
  return KIND_STYLES[kind as EventKind] ?? KIND_STYLES.other;
}
