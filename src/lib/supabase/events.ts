import type { Tables } from "@/types/database";
import {
  assertFound,
  assertYen,
  fail,
  getSupabase,
  type DataClient,
  getUserId,
  requireName,
} from "./helpers";
import { isMonth, monthTimeRange } from "./month";

export type Event = Tables<"events">;

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

export type SyncResult = { added: number; updated: number; deleted: number };

function assertKind(kind: string): asserts kind is EventKind {
  if (!(EVENT_KINDS as readonly string[]).includes(kind)) {
    throw new Error(
      `予定の種類は ${EVENT_KINDS.join(" / ")} のどれかで指定してください`,
    );
  }
}

function toTimestamp(value: string, label: string): number {
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    throw new Error(`${label}の日時の形が正しくありません`);
  }
  return time;
}

/** 入力をチェックして、DB の列の形にする */
function toRow({ title, kind, startsAt, endsAt, estimatedAmount }: EventInput) {
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

/** その月（日本時間）に始まる予定の一覧（開始日時の早い順） */
export async function getEvents(month: string, client?: DataClient): Promise<Event[]> {
  const { from, to } = monthTimeRange(month);
  const { data, error } = await getSupabase(client)
    .from("events")
    .select("*")
    .gte("starts_at", from)
    .lt("starts_at", to)
    .order("starts_at")
    .order("id");
  if (error) fail("予定の読み込みに失敗しました", error);
  return data;
}

/** 予定を追加する（手入力の予定） */
export async function addEvent(input: EventInput): Promise<Event> {
  const row = toRow(input);
  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from("events")
    .insert({ ...row, user_id: userId })
    .select()
    .single();
  if (error) fail("予定の追加に失敗しました", error);
  return data;
}

/** 予定を変更する */
export async function updateEvent(id: number, input: EventInput): Promise<Event> {
  const row = toRow(input);
  const { data, error } = await getSupabase()
    .from("events")
    .update(row)
    .eq("id", id)
    .select();
  if (error) fail("予定の変更に失敗しました", error);
  return assertFound(data);
}

/** 予定を削除する（その予定に結びついた支出は残り、結びつきだけ外れる） */
export async function deleteEvent(id: number): Promise<void> {
  const { data, error } = await getSupabase()
    .from("events")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail("予定の削除に失敗しました", error);
  assertFound(data);
}

/** Googleカレンダーのその月の予定を、アプリの予定に同期する */
export async function syncGoogleCalendar(month: string): Promise<SyncResult> {
  if (!isMonth(month)) {
    throw new Error("月は \"2026-11\" の形で指定してください");
  }
  let res: Response;
  try {
    res = await fetch("/api/calendar/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month }),
    });
  } catch (e) {
    fail("Googleカレンダーの同期に失敗しました（通信エラー）", e);
  }
  const body = (await res.json().catch(() => null)) as
    | (Partial<SyncResult> & { error?: string })
    | null;
  if (!res.ok || !body) {
    throw new Error(body?.error ?? "Googleカレンダーの同期に失敗しました");
  }
  return {
    added: body.added ?? 0,
    updated: body.updated ?? 0,
    deleted: body.deleted ?? 0,
  };
}

export type AutoSyncResult = {
  /** 今回、同期したか */
  synced: boolean;
  /** 同期しなかった理由。"recent"＝前の同期から30分たっていない、"error"＝失敗した */
  reason?: "recent" | "error";
  added: number;
  updated: number;
  deleted: number;
  /** 最後に自動同期した時刻（ISO 形式）。一度も同期していなければ null */
  lastSyncedAt: string | null;
  /** 失敗したときの日本語のメッセージ */
  error?: string;
  /** 再ログインが必要なとき true（ログアウトしてログインし直してもらう） */
  needsRelogin?: boolean;
};

/**
 * アプリを開いたときに呼ぶ。前の自動同期から30分以上たっていれば、今月と来月の予定を同期する。
 * 30分の判定はサーバー側で行う。画面を開くたびに呼ぶ想定なので、失敗しても Error は投げず、戻り値で返す。
 */
export async function autoSyncCalendar(): Promise<AutoSyncResult> {
  const empty = { added: 0, updated: 0, deleted: 0, lastSyncedAt: null };
  try {
    const res = await fetch("/api/calendar/auto-sync", { method: "POST" });
    const body = (await res.json().catch(() => null)) as
      | (Partial<AutoSyncResult> & { error?: string; needsRelogin?: boolean })
      | null;
    if (!res.ok || !body) {
      return {
        ...empty,
        synced: false,
        reason: "error",
        error: body?.error ?? "Googleカレンダーの自動同期に失敗しました",
        needsRelogin: body?.needsRelogin ?? res.status === 401,
      };
    }
    return {
      synced: body.synced ?? false,
      reason: body.reason,
      added: body.added ?? 0,
      updated: body.updated ?? 0,
      deleted: body.deleted ?? 0,
      lastSyncedAt: body.lastSyncedAt ?? null,
    };
  } catch {
    return {
      ...empty,
      synced: false,
      reason: "error",
      error: "Googleカレンダーの自動同期に失敗しました（通信エラー）",
    };
  }
}
