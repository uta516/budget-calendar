import type { EventKind } from "./supabase/eventInput";

// 中間発表向けの計算関数は実装済み。
// 決まりは AGENTS.md の「計算の関数」を見ること。

/** 今月自由に使えるお金 */
export function freeMoney(income: number, fixedCosts: number, saving: number): number {
  return Math.max(0, income - fixedCosts - saving);
}

/** 今月あと使えるお金 */
export function monthLeft(free: number, spentThisMonth: number): number {
  return free - spentThisMonth;
}

/** 今週の予算 */
export function weekBudget(free: number, today: Date): number {
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return Math.floor(((free / daysInMonth) * 7) / 10) * 10;
}

/** 今週あと使えるお金 */
export function weekLeft(weekly: number, spentThisWeek: number): number {
  return weekly - spentThisWeek;
}

/** 今日の目安 */
export function todayGuide(weekLeftAmount: number, today: Date): number {
  const daysRemaining = today.getDay() === 0 ? 1 : 8 - today.getDay();
  return Math.max(0, Math.floor(weekLeftAmount / daysRemaining / 10) * 10);
}

/** カテゴリ別の残り */
export function categoryLeft(budget: number, spent: number): number {
  return budget - spent;
}
// 画面担当の仮設定を引き継いだ初期値。実際の相場や個人の支出を表すものではない。
const EVENT_ESTIMATE_AMOUNTS: Record<EventKind, number> = {
  drink: 4000,
  meal: 1500,
  fun: 3000,
  trip: 20000,
  shop: 3000,
  work: 0,
  other: 0,
};

const EVENT_TITLE_KEYWORDS: readonly {
  kind: EventKind;
  keywords: readonly string[];
}[] = [
  { kind: "work", keywords: ["バイト", "アルバイト", "シフト"] },
  { kind: "drink", keywords: ["飲み会", "飲み", "打ち上げ"] },
  { kind: "trip", keywords: ["旅行", "日帰り旅行"] },
  { kind: "meal", keywords: ["ランチ", "ディナー", "外食"] },
  { kind: "fun", keywords: ["映画", "カラオケ", "遊び", "デート"] },
  { kind: "shop", keywords: ["買い物", "ショッピング"] },
];

/** 種類に対応する仮の目安金額（円）を返す。 */
export function estimateEventAmount(kind: EventKind): number {
  return EVENT_ESTIMATE_AMOUNTS[kind];
}

/** タイトルを部分一致で分類する。複数種類に一致する場合は「その他」。 */
export function classifyEventTitle(title: string): EventKind {
  const trimmed = title.trim();
  const matches = EVENT_TITLE_KEYWORDS.filter(({ keywords }) =>
    keywords.some((keyword) => trimmed.includes(keyword)),
  );
  return matches.length === 1 ? matches[0].kind : "other";
}

/** タイトルから種類と仮の目安金額をまとめて返す。保存や外部API呼び出しは行わない。 */
export function estimateEvent(title: string): {
  kind: EventKind;
  estimatedAmount: number;
} {
  const kind = classifyEventTitle(title);
  return { kind, estimatedAmount: estimateEventAmount(kind) };
}
