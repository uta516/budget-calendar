"use client";

import { useState } from "react";
import {
  addCategory,
  addEvent,
  addExpense,
  addFixedCost,
  addIncome,
  deleteCategory,
  deleteEvent,
  deleteExpense,
  deleteFixedCost,
  deleteIncome,
  ensureDefaultCategories,
  getCategories,
  getEvents,
  getExpenses,
  getFixedCosts,
  getGoal,
  getIncomes,
  getSettings,
  saveGoal,
  saveSettings,
  syncGoogleCalendar,
  updateCategory,
  updateEvent,
  updateFixedCost,
  updateIncome,
  type Event,
  type EventKind,
  type SyncResult,
} from "@/lib/supabase";

type Result = { ok: boolean; label: string; detail: string };

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function DataCheck() {
  const [results, setResults] = useState<Result[]>([]);
  const [running, setRunning] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);

  async function syncNow() {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const month = thisMonth();
      setSyncResult(await syncGoogleCalendar(month));
      setEvents(await getEvents(month));
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncing(false);
    }
  }

  async function runAll() {
    setRunning(true);
    setResults([]);
    const push = (r: Result) => setResults((prev) => [...prev, r]);

    async function step<T>(
      label: string,
      fn: () => Promise<T>,
      show: (v: T) => string = (v) => JSON.stringify(v),
    ): Promise<T | undefined> {
      try {
        const value = await fn();
        push({ ok: true, label, detail: show(value) });
        return value;
      } catch (e) {
        push({
          ok: false,
          label,
          detail: e instanceof Error ? e.message : String(e),
        });
        return undefined;
      }
    }
    const count = (rows: unknown[]) => `${rows.length}件`;

    // 収入（追加 → 変更 → 一覧 → 削除）
    const income = await step("addIncome", () => addIncome("テスト収入", 1000));
    if (income) {
      await step("updateIncome", () => updateIncome(income.id, "テスト収入（変更）", 1200));
    }
    await step("getIncomes", getIncomes, count);
    if (income) await step("deleteIncome", () => deleteIncome(income.id), () => "削除しました");

    // 固定費
    const cost = await step("addFixedCost", () => addFixedCost("テスト固定費", 500));
    if (cost) {
      await step("updateFixedCost", () => updateFixedCost(cost.id, "テスト固定費（変更）", 600));
    }
    await step("getFixedCosts", getFixedCosts, count);
    if (cost) await step("deleteFixedCost", () => deleteFixedCost(cost.id), () => "削除しました");

    // カテゴリ
    const categories = await step("ensureDefaultCategories", ensureDefaultCategories, count);
    const category = await step("addCategory", () => addCategory("テストカテゴリ", 1000));
    if (category) {
      await step("updateCategory", () => updateCategory(category.id, "テストカテゴリ（変更）", 2000));
    }
    await step("getCategories", getCategories, count);

    // 支出（テストカテゴリに付けて追加 → 今月の一覧 → 削除）
    const categoryId = category?.id ?? categories?.[0]?.id;
    if (categoryId !== undefined) {
      const expense = await step("addExpense（日付省略＝今日）", () =>
        addExpense({ amount: 300, categoryId }),
      );
      await step(`getExpenses("${thisMonth()}")`, () => getExpenses(thisMonth()), count);
      if (expense) await step("deleteExpense", () => deleteExpense(expense.id), () => "削除しました");
    } else {
      push({ ok: false, label: "addExpense", detail: "カテゴリが無いためスキップしました" });
    }
    if (category) await step("deleteCategory", () => deleteCategory(category.id), () => "削除しました");

    // 予定（手入力の予定を追加 → 変更 → 今月の一覧 → 削除）
    const month = thisMonth();
    const startsAt = `${month}-15T19:00:00+09:00`;
    const event = await step("addEvent", () =>
      addEvent({ title: "テスト予定", kind: "drink", startsAt, estimatedAmount: 3000 }),
    );
    if (event) {
      await step("updateEvent", () =>
        updateEvent(event.id, {
          title: "テスト予定（変更）",
          kind: "meal",
          startsAt,
          endsAt: `${month}-15T21:00:00+09:00`,
          estimatedAmount: 2500,
        }),
      );
    }
    await step(`getEvents("${month}")`, () => getEvents(month), count);
    if (event) await step("deleteEvent", () => deleteEvent(event.id), () => "削除しました");
    try {
      await addEvent({
        title: "種類のテスト",
        kind: "party" as EventKind,
        startsAt,
        estimatedAmount: 0,
      });
      push({ ok: false, label: "予定の種類チェック", detail: "決まっていない種類が保存できてしまいました" });
    } catch (e) {
      push({ ok: true, label: "予定の種類チェック", detail: `正しくエラー：${(e as Error).message}` });
    }

    // 入力チェック（エラーになれば成功）
    try {
      await addIncome("小数のテスト", 100.5);
      push({ ok: false, label: "入力チェック", detail: "小数の金額が保存できてしまいました" });
    } catch (e) {
      push({ ok: true, label: "入力チェック", detail: `正しくエラー：${(e as Error).message}` });
    }

    // 目標（読んだ値をそのまま保存し直すので、データは変わらない）
    const goal = await step("getGoal", getGoal, (g) => (g ? JSON.stringify(g) : "null（まだ無い）"));
    if (goal) {
      await step("saveGoal（同じ値で保存）", () =>
        saveGoal({
          name: goal.name,
          targetAmount: goal.target_amount,
          months: goal.months,
          savedAmount: goal.saved_amount,
        }),
      );
    } else if (goal === null) {
      push({ ok: true, label: "saveGoal", detail: "目標がまだ無いので、勝手に作らないようスキップしました" });
    }

    // 設定（同じく、読んだ値をそのまま保存し直す）
    const settings = await step("getSettings", getSettings);
    if (settings) await step("saveSettings（同じ値で保存）", () => saveSettings(settings));

    setRunning(false);
  }

  const failed = results.filter((r) => !r.ok).length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">データ関数の動作確認</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        ボタンを押すと、各関数を順に試します。テスト用に追加した収入・固定費・カテゴリ・支出・予定は最後に削除します。
        目標と設定は、読んだ値をそのまま保存し直すだけです。カテゴリが0件のときは初期カテゴリが5件作られます。
      </p>
      <button
        type="button"
        onClick={runAll}
        disabled={running}
        className="self-start rounded-full bg-foreground px-5 py-2 text-background disabled:opacity-50"
      >
        {running ? "実行中…" : "すべて試す"}
      </button>
      {results.length > 0 && !running && (
        <p className="font-medium">
          {failed === 0 ? "すべて成功しました" : `${failed}件失敗しました`}
        </p>
      )}
      <ul className="flex flex-col gap-2 text-sm">
        {results.map((r, i) => (
          <li key={i} className="break-all">
            {r.ok ? "✅" : "❌"} <span className="font-mono font-semibold">{r.label}</span>：{r.detail}
          </li>
        ))}
      </ul>

      <hr className="my-4 border-black/[.08] dark:border-white/[.145]" />

      <h2 className="text-lg font-semibold">Googleカレンダーの同期（{thisMonth()}）</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Googleカレンダーの今月の予定を、アプリの予定に同期します。新しい予定は種類 other・予想金額 0円で入ります。
      </p>
      <button
        type="button"
        onClick={syncNow}
        disabled={syncing}
        className="self-start rounded-full bg-foreground px-5 py-2 text-background disabled:opacity-50"
      >
        {syncing ? "同期中…" : "Googleカレンダーを同期"}
      </button>
      {syncError && <p className="text-sm text-red-600">❌ {syncError}</p>}
      {syncResult && (
        <>
          <p className="font-medium">
            ✅ 追加 {syncResult.added}件・更新 {syncResult.updated}件・削除 {syncResult.deleted}件
          </p>
          <p className="text-sm">今月の予定：{events.length}件</p>
          <ul className="flex flex-col gap-1 text-sm">
            {events.map((e) => (
              <li key={e.id} className="break-all">
                <span className="font-mono">{formatDateTime(e.starts_at)}</span>　{e.title}
                <span className="text-zinc-500">
                  （{e.kind}・{e.estimated_amount.toLocaleString()}円
                  {e.google_event_id ? "・Google" : "・手入力"}）
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
