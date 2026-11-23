// 予定の入力の形とチェック（ブラウザ・サーバーのどちらからも使う。Supabase には触らない）

import { assertYen, requireName } from "./validate";

/** 予定の種類 */
export const EVENT_KINDS = [
  "drink",
  "meal",
  "fun",
  "trip",
  "shop",
  "work",
  "other",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export type EventInput = {
  title: string;
  kind: EventKind;
  /** 開始日時（ISO 形式。例："2026-11-20T19:00:00+09:00"） */
  startsAt: string;
  /** 終了日時（ISO 形式）。省略可 */
  endsAt?: string | null;
  /** 予想金額（円の整数） */
  estimatedAmount: number;
};

/** addEvent の入力。addToGoogle を省略したら true（Googleカレンダーにも追加する） */
export type NewEventInput = EventInput & { addToGoogle?: boolean };

/** Googleカレンダーへの追加の結果 */
export type GoogleAddResult = {
  /** Googleカレンダーにも追加できたか */
  added: boolean;
  /**
   * 追加しなかった・できなかった理由
   * "not-requested"＝addToGoogle が false、"needs-relogin"＝Googleとの連携が切れている（ログインし直す）、
   * "error"＝そのほかの失敗
   */
  reason?: "not-requested" | "needs-relogin" | "error";
  /** できなかったときの日本語のメッセージ */
  message?: string;
};

/** DB に保存する予定の列（Google から決まる google_event_id と user_id は含まない） */
export type EventRow = {
  title: string;
  kind: EventKind;
  starts_at: string;
  ends_at: string | null;
  estimated_amount: number;
};

function assertKind(kind: unknown): asserts kind is EventKind {
  if (typeof kind !== "string" || !(EVENT_KINDS as readonly string[]).includes(kind)) {
    throw new Error(`予定の種類は ${EVENT_KINDS.join(" / ")} のどれかで指定してください`);
  }
}

function toTimestamp(value: unknown, label: string): number {
  const time = typeof value === "string" ? Date.parse(value) : NaN;
  if (Number.isNaN(time)) {
    throw new Error(`${label}の日時の形が正しくありません`);
  }
  return time;
}

/** 入力をチェックして、DB の列の形にする。正しくなければ日本語のメッセージで Error を投げる */
export function toEventRow(input: EventInput): EventRow {
  const { title, kind, startsAt, endsAt, estimatedAmount } = input;
  const trimmed = requireName(title, "予定のタイトル");
  assertKind(kind);
  assertYen(estimatedAmount, "予想金額");
  const start = toTimestamp(startsAt, "開始");
  if (endsAt) {
    const end = toTimestamp(endsAt, "終了");
    if (end < start) {
      throw new Error("終了日時は開始日時より後にしてください");
    }
  }
  return {
    title: trimmed,
    kind,
    starts_at: startsAt,
    ends_at: endsAt ?? null,
    estimated_amount: estimatedAmount,
  };
}

/** 終了日時が無い予定を Google に送るときの終了（開始の1時間後） */
export function oneHourLater(startsAt: string): string {
  return new Date(Date.parse(startsAt) + 60 * 60 * 1000).toISOString();
}
