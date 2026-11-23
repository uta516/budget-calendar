import type { Tables } from "@/types/database";
import { fail, getSupabase, type DataClient } from "./helpers";
import { isMonth, monthTimeRange } from "./month";
import {
  toEventRow,
  type EventInput,
  type GoogleAddResult,
  type NewEventInput,
} from "./eventInput";

// 予定の入力の形とチェックは eventInput.ts にまとめた（サーバーからも使うため）。これまでどおりここからも import できる
export { EVENT_KINDS } from "./eventInput";
export type { EventKind, EventInput, NewEventInput, GoogleAddResult } from "./eventInput";

export type Event = Tables<"events">;

export type SyncResult = { added: number; updated: number; deleted: number };

/** addEvent の戻り値：保存した予定 ＋ Googleカレンダーに追加できたか */
export type AddEventResult = Event & { google: GoogleAddResult };

/** 予定の API を呼び、失敗なら日本語のメッセージで Error を投げる */
async function callEventsApi<T>(
  path: string,
  init: { method: "POST" | "PATCH" | "DELETE"; body?: unknown },
  failMessage: string,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method,
      headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch (e) {
    fail(`${failMessage}（通信エラー）`, e);
  }
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !body) {
    throw new Error(body?.error ?? failMessage);
  }
  return body;
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

/**
 * 予定を追加する。addToGoogle を省略したら true で、Googleカレンダーにも追加する（タイトルと日時だけ。金額と種類は送らない）。
 * Google に追加できなかったときも Error は投げず、アプリにだけ保存して、戻り値の google.added が false になる。
 * 入力が正しくないとき・アプリへの保存に失敗したとき（どこにも保存されていないとき）は、日本語のメッセージで Error を投げる。
 */
export async function addEvent(input: NewEventInput): Promise<AddEventResult> {
  toEventRow(input); // 画面ですぐ分かるように、先にチェックする（サーバーでももう一度チェックする）
  const { event, google } = await callEventsApi<{ event: Event; google: GoogleAddResult }>(
    "/api/calendar/events",
    { method: "POST", body: input },
    "予定の追加に失敗しました",
  );
  return { ...event, google };
}

/**
 * 予定を変更する。Google とつながっている予定（google_event_id がある）は、Googleカレンダーのタイトルと日時も変える。
 * Google の変更に失敗したら、アプリも変えずに Error を投げる（Google とアプリでずれないように）。
 */
export async function updateEvent(id: number, input: EventInput): Promise<Event> {
  toEventRow(input);
  return callEventsApi<Event>(
    `/api/calendar/events/${id}`,
    { method: "PATCH", body: input },
    "予定の変更に失敗しました",
  );
}

/**
 * 予定を削除する（その予定に結びついた支出は残り、結びつきだけ外れる）。
 * Google とつながっている予定は、本物の Googleカレンダーからも消える。
 * Google の削除に失敗したら、アプリも消さずに Error を投げる。
 */
export async function deleteEvent(id: number): Promise<void> {
  await callEventsApi<{ deleted: true }>(
    `/api/calendar/events/${id}`,
    { method: "DELETE" },
    "予定の削除に失敗しました",
  );
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
