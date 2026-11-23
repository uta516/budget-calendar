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
  autoSyncCalendar,
  type AutoSyncResult,
  updateCategory,
  updateEvent,
  updateFixedCost,
  updateIncome,
  type Event,
  type EventKind,
  type SyncResult,
} from "@/lib/supabase";
import {
  getBudgetSummary,
  getHomeSummary,
  type BudgetSummary,
  type HomeSummary,
} from "@/lib/summary";

import { clearDemoData, seedDemoData } from "./seed";
import { getAdvice, type AdviceResult } from "@/lib/ai/advice";
import {
  getEventActuals,
  getKindAverages,
  getMissedEvents,
  linkExpenseToEvent,
  type EventActualsResult,
  type KindAverage,
  type MissedEvent,
} from "@/lib/supabase";

const ADVICE_REASON: Record<string, string> = {
  "no-key": "サーバーに GEMINI_API_KEY が無い",
  limit: "今日の作り直しの回数（10回）を使い切った",
  timeout: "AI が10秒以内に答えなかった",
  error: "AI の失敗・答えの形がおかしい など（ターミナルの [ai-advice] を見る）",
};

const yen = (n: number) => `${n.toLocaleString()}円`;

const DEMO_WARNING =
  "自分のアカウントの収入・固定費・支出・手入力の予定・目標がすべて消えます（カテゴリ・設定・Googleから同期した予定は残ります）。";

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

  const [home, setHome] = useState<HomeSummary | null>(null);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  async function loadSummary(kind: "home" | "budget") {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      if (kind === "home") setHome(await getHomeSummary());
      else setBudget(await getBudgetSummary());
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : String(e));
    } finally {
      setSummaryLoading(false);
    }
  }

  const [demoBusy, setDemoBusy] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  async function seedDemo() {
    if (!window.confirm(`見本データを入れます。\n${DEMO_WARNING}\nよろしいですか？`)) return;
    setDemoBusy(true);
    setDemoMessage(null);
    try {
      const r = await seedDemoData();
      setDemoMessage(
        `✅ 入れました：収入${r.incomes}件・固定費${r.fixedCosts}件・目標1件・支出${r.expenses}件（合計${yen(r.expenseTotal)}）・予定${r.events}件・過ぎた予定${r.pastEvents}件` +
          (r.eventsSkipped ? "（今日が月末なので、これからの予定は入れていません）" : "") +
          (r.pastEvents === 0 ? "（今月の過ぎた日が無いので、過ぎた予定は入れていません）" : ""),
      );
      setBudget(null);
      await loadSummary("home");
    } catch (e) {
      setDemoMessage(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDemoBusy(false);
    }
  }

  async function clearDemo() {
    if (!window.confirm(`見本データを消します。\n${DEMO_WARNING}\nよろしいですか？`)) return;
    setDemoBusy(true);
    setDemoMessage(null);
    try {
      await clearDemoData();
      setDemoMessage("✅ 消しました（カテゴリ・設定・Googleから同期した予定は残っています）");
      setHome(null);
      setBudget(null);
    } catch (e) {
      setDemoMessage(`❌ ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setDemoBusy(false);
    }
  }

  const [autoSyncing, setAutoSyncing] = useState(false);
  const [autoResult, setAutoResult] = useState<AutoSyncResult | null>(null);

  const [adviceLoading, setAdviceLoading] = useState(false);
  const [advice, setAdvice] = useState<AdviceResult | null>(null);

  async function tryAdvice() {
    setAdviceLoading(true);
    setAdvice(null);
    // getAdvice は Error を投げないので try/catch は不要
    setAdvice(await getAdvice());
    setAdviceLoading(false);
  }

  // 記録し忘れ・予想と実際・種類ごとの平均
  const [actualsLoading, setActualsLoading] = useState(false);
  const [actualsError, setActualsError] = useState<string | null>(null);
  const [missed, setMissed] = useState<MissedEvent[] | null>(null);
  const [actuals, setActuals] = useState<EventActualsResult | null>(null);
  const [averages, setAverages] = useState<KindAverage[] | null>(null);

  async function loadActuals(kind: "missed" | "actuals" | "averages") {
    setActualsLoading(true);
    setActualsError(null);
    try {
      if (kind === "missed") setMissed(await getMissedEvents());
      else if (kind === "actuals") setActuals(await getEventActuals());
      else setAverages(await getKindAverages());
    } catch (e) {
      setActualsError(e instanceof Error ? e.message : String(e));
    } finally {
      setActualsLoading(false);
    }
  }

  // Googleカレンダーへの書き込み（作る → 変更 → 削除）
  const [gwRunning, setGwRunning] = useState(false);
  const [gwResults, setGwResults] = useState<Result[]>([]);
  const [gwKeep, setGwKeep] = useState(false);
  const [gwKeptId, setGwKeptId] = useState<number | null>(null);

  async function gwStep<T>(label: string, fn: () => Promise<T>, show: (v: T) => string) {
    try {
      const value = await fn();
      setGwResults((prev) => [...prev, { ok: true, label, detail: show(value) }]);
      return value;
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      setGwResults((prev) => [...prev, { ok: false, label, detail }]);
      return undefined;
    }
  }

  async function tryGoogleWrite() {
    if (
      !window.confirm(
        "本物の Googleカレンダーに「アプリからのテスト予定」を作り、変更します。" +
          (gwKeep ? "（最後に削除しません）" : "最後に削除します。") +
          "\nよろしいですか？",
      )
    )
      return;
    setGwRunning(true);
    setGwResults([]);
    setGwKeptId(null);
    // 明日（日本時間）のお昼
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString("sv-SE", {
      timeZone: "Asia/Tokyo",
    });
    const linked = (e: { google_event_id: string | null }) =>
      e.google_event_id ? `google_event_id：${e.google_event_id}` : "google_event_id：なし（アプリだけ）";

    const created = await gwStep(
      "addEvent（Googleにも追加）",
      () =>
        addEvent({
          title: "アプリからのテスト予定",
          kind: "meal",
          startsAt: `${tomorrow}T12:00:00+09:00`, // 終了日時なし → 開始の1時間後になる
          estimatedAmount: 1500,
        }),
      (e) =>
        e.google.added
          ? `✅ Googleに追加できた（${linked(e)}、終了：${formatDateTime(e.ends_at ?? e.starts_at)}）`
          : `⚠ Googleには追加できず、アプリにだけ保存した：${e.google.message}（${linked(e)}）`,
    );
    if (created) {
      const updated = await gwStep(
        "updateEvent（Googleも変更）",
        () =>
          updateEvent(created.id, {
            title: "アプリからのテスト予定（変更）",
            kind: "meal",
            startsAt: `${tomorrow}T13:00:00+09:00`,
            endsAt: `${tomorrow}T14:30:00+09:00`,
            estimatedAmount: 2000,
          }),
        (e) => `タイトル「${e.title}」、${formatDateTime(e.starts_at)}〜（${linked(e)}）`,
      );
      if (updated && gwKeep) {
        setGwKeptId(created.id);
        setGwResults((prev) => [
          ...prev,
          { ok: true, label: "deleteEvent", detail: "削除せずに残しました。Googleカレンダーで確かめたあと、下のボタンで消してください" },
        ]);
      } else {
        await gwStep("deleteEvent（Googleからも削除）", () => deleteEvent(created.id), () => "削除しました");
      }
    }
    setGwRunning(false);
  }

  async function deleteKeptGoogleEvent() {
    if (gwKeptId === null) return;
    if (!window.confirm("残したテスト予定を削除します。Googleカレンダーからも消えます。よろしいですか？")) return;
    setGwRunning(true);
    const done = await gwStep("deleteEvent（残したテスト予定）", () => deleteEvent(gwKeptId), () => "削除しました");
    if (done !== undefined) setGwKeptId(null);
    setGwRunning(false);
  }

  async function tryAutoSync() {
    setAutoSyncing(true);
    setAutoResult(null);
    // autoSyncCalendar は Error を投げないので try/catch は不要
    setAutoResult(await autoSyncCalendar());
    setAutoSyncing(false);
  }

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
      // 「すべて試す」では本物の Googleカレンダーに入れない（Google は下の専用ボタンで試す）
      addEvent({ title: "テスト予定", kind: "drink", startsAt, estimatedAmount: 3000, addToGoogle: false }),
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

    // 支出と予定の結びつけ（昨日の予定と支出を作って結びつけ、外して、最後に消す）
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleDateString("sv-SE", {
      timeZone: "Asia/Tokyo",
    });
    const linkCategoryId = categories?.[0]?.id;
    const pastEvent = await step(
      "addEvent（過ぎた予定）",
      () =>
        addEvent({
          title: "テスト予定（過去）",
          kind: "meal",
          startsAt: `${yesterday}T12:00:00+09:00`,
          endsAt: `${yesterday}T13:00:00+09:00`,
          estimatedAmount: 1000,
          addToGoogle: false,
        }),
      (e) => `id ${e.id}`,
    );
    const linkExpense =
      pastEvent && linkCategoryId !== undefined
        ? await step(
            "addExpense（結びつけ用）",
            () => addExpense({ amount: 1200, categoryId: linkCategoryId, spentOn: yesterday }),
            (e) => `id ${e.id}`,
          )
        : undefined;
    if (pastEvent && linkExpense) {
      await step(
        "linkExpenseToEvent（結びつける）",
        () => linkExpenseToEvent(linkExpense.id, pastEvent.id),
        (e) => `event_id ${e.event_id}`,
      );
      await step(
        "getEventActuals（実際に入るか）",
        () => getEventActuals(yesterday.slice(0, 7)),
        (r) => {
          const a = r.events.find((x) => x.eventId === pastEvent.id);
          if (!a || a.actual !== 1200 || a.diff !== 200) {
            throw new Error(`実際・差が想定と違います：${JSON.stringify(a)}`);
          }
          return `予想 ${yen(a.estimated)}・実際 ${yen(a.actual)}・差 +${yen(a.diff)}`;
        },
      );
      await step(
        "linkExpenseToEvent（外す）",
        () => linkExpenseToEvent(linkExpense.id, null),
        (e) => `event_id ${e.event_id ?? "null"}`,
      );
      await step("deleteExpense（結びつけ用）", () => deleteExpense(linkExpense.id), () => "削除しました");
    }
    if (pastEvent) {
      await step("deleteEvent（過ぎた予定）", () => deleteEvent(pastEvent.id), () => "削除しました");
    }
    // 自分の予定でない（存在しない）eventId では、支出を記録できない（エラーになれば成功）
    if (linkCategoryId !== undefined) {
      try {
        const wrong = await addExpense({ amount: 100, categoryId: linkCategoryId, eventId: 2147483647 });
        await deleteExpense(wrong.id);
        push({ ok: false, label: "addExpense の予定チェック", detail: "存在しない予定に結びつけて記録できてしまいました" });
      } catch (e) {
        push({ ok: true, label: "addExpense の予定チェック", detail: `正しくエラー：${(e as Error).message}` });
      }
    }

    try {
      await addEvent({
        title: "種類のテスト",
        kind: "party" as EventKind,
        startsAt,
        estimatedAmount: 0,
        addToGoogle: false,
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

      <h2 className="text-lg font-semibold">見本データ（デモ用）</h2>
      <p className="text-sm text-red-600">⚠ {DEMO_WARNING}</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={seedDemo}
          disabled={demoBusy}
          className="rounded-full bg-foreground px-5 py-2 text-background disabled:opacity-50"
        >
          見本データを入れる
        </button>
        <button
          type="button"
          onClick={clearDemo}
          disabled={demoBusy}
          className="rounded-full border border-black/[.08] px-5 py-2 disabled:opacity-50 dark:border-white/[.145]"
        >
          見本データを消す
        </button>
      </div>
      {demoBusy && <p className="text-sm">処理中…</p>}
      {demoMessage && <p className="text-sm">{demoMessage}</p>}

      <hr className="my-4 border-black/[.08] dark:border-white/[.145]" />

      <h2 className="text-lg font-semibold">まとめの関数（src/lib/summary.ts）</h2>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => loadSummary("home")}
          disabled={summaryLoading}
          className="rounded-full bg-foreground px-5 py-2 text-background disabled:opacity-50"
        >
          ホームのまとめ
        </button>
        <button
          type="button"
          onClick={() => loadSummary("budget")}
          disabled={summaryLoading}
          className="rounded-full bg-foreground px-5 py-2 text-background disabled:opacity-50"
        >
          予算のまとめ
        </button>
      </div>
      {summaryError && <p className="text-sm text-red-600">❌ {summaryError}</p>}

      {home && (
        <section className="flex flex-col gap-2 text-sm">
          <h3 className="font-semibold">getHomeSummary()（今日 {home.today}）</h3>
          <ul>
            <li>今月自由に使えるお金：{yen(home.freeMoney)}</li>
            <li>今月あと使えるお金：{yen(home.monthLeft)}</li>
            <li>今週の予算：{yen(home.weekBudget)}・今週使った額：{yen(home.weekSpent)}・今週あと：{yen(home.weekLeft)}</li>
            <li>今日の目安：{yen(home.todayGuide)}</li>
            <li>
              月末までに予定で使う見込み：{yen(home.plannedUntilMonthEnd.amount)}（{home.plannedUntilMonthEnd.count}件）
            </li>
            <li>普段使いに回せるお金：{yen(home.dailyMoney)}</li>
          </ul>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th>日付</th><th>目安</th><th>使った額</th><th>予定</th>
              </tr>
            </thead>
            <tbody>
              {home.days.map((d) => (
                <tr key={d.date} className={d.isToday ? "font-semibold" : d.inMonth ? "" : "text-zinc-400"}>
                  <td>{d.date.slice(5)}({d.weekday}){d.isToday ? " 今日" : ""}</td>
                  <td>{d.guide === null ? "−" : yen(d.guide)}</td>
                  <td>{yen(d.spent)}</td>
                  <td>{d.eventCount}件・{yen(d.plannedAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>これからの予定：</p>
          <ul>
            {home.upcomingEvents.length === 0 && <li>なし</li>}
            {home.upcomingEvents.map((e) => (
              <li key={e.id}>
                {e.date}　{e.title}（{e.kind}・{yen(e.estimatedAmount)}）
              </li>
            ))}
          </ul>
          <details>
            <summary>戻り値（JSON）</summary>
            <pre className="overflow-x-auto text-xs">{JSON.stringify(home, null, 2)}</pre>
          </details>
        </section>
      )}

      {budget && (
        <section className="flex flex-col gap-2 text-sm">
          <h3 className="font-semibold">getBudgetSummary()（{budget.month}）</h3>
          <ul>
            <li>今月の収入合計：{yen(budget.incomeTotal)}</li>
            <li>今月あと使えるお金：{yen(budget.monthLeft)}</li>
            <li>カテゴリなしの支出：{yen(budget.uncategorizedSpent)}</li>
            <li>
              カテゴリなしの予定：{yen(budget.uncategorizedPlanned)}
              {budget.uncategorizedPlannedEvents.length > 0 &&
                `（${budget.uncategorizedPlannedEvents.map((e) => e.title).join("・")}）`}
            </li>
          </ul>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th>カテゴリ</th><th>予算</th><th>使った額</th><th>予定</th><th>残り</th>
              </tr>
            </thead>
            <tbody>
              {budget.categories.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{yen(c.budget)}</td>
                  <td>{yen(c.spent)}</td>
                  <td>
                    {yen(c.planned)}
                    {c.plannedEvents.length > 0 &&
                      `（${c.plannedEvents.map((e) => e.title).join("・")}）`}
                  </td>
                  <td className={c.left < 0 ? "text-red-600" : ""}>{yen(c.left)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            目標：
            {budget.goal
              ? `${budget.goal.name}　目標 ${yen(budget.goal.targetAmount)}・たまった ${yen(budget.goal.savedAmount)}・あと ${yen(budget.goal.remaining)}・月に ${yen(budget.goal.perMonth)}`
              : "なし"}
          </p>
          <details>
            <summary>戻り値（JSON）</summary>
            <pre className="overflow-x-auto text-xs">{JSON.stringify(budget, null, 2)}</pre>
          </details>
        </section>
      )}

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

      <hr className="my-4 border-black/[.08] dark:border-white/[.145]" />

      <h2 className="text-lg font-semibold">先読みアドバイス（getAdvice）</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        ホームのまとめをもとに、AI（Gemini）でアドバイスを作ります。同じ日・同じデータなら使い回し、
        支出や予定が変わったときだけ作り直します（1日10回まで。失敗も数える）。AI が使えないときは決まった文になります。
      </p>
      <button
        type="button"
        onClick={tryAdvice}
        disabled={adviceLoading}
        className="self-start rounded-full bg-foreground px-5 py-2 text-background disabled:opacity-50"
      >
        {adviceLoading ? "作成中…" : "先読みアドバイスを試す"}
      </button>
      {advice && (
        <div className="flex flex-col gap-1 text-sm">
          {advice.advice ? (
            <p className="rounded-lg border border-black/[.08] p-3 text-base dark:border-white/[.145]">
              💡 {advice.advice}
            </p>
          ) : (
            <p className="font-medium text-red-600">
              ❌ {advice.error}
              {advice.needsRelogin ? "（再ログインが必要）" : ""}
            </p>
          )}
          {advice.source && (
            <p>
              作り方：
              {advice.source === "ai"
                ? advice.cached
                  ? "🤖 AI（今日作ったものを使い回し）"
                  : "🤖 AI（今作った）"
                : `📝 決まった文（理由：${ADVICE_REASON[advice.reason ?? "error"] ?? advice.reason}）`}
            </p>
          )}
          {advice.remainingToday !== null && <p>今日あと {advice.remainingToday} 回作り直せます</p>}
        </div>
      )}

      <hr className="my-4 border-black/[.08] dark:border-white/[.145]" />

      <h2 className="text-lg font-semibold">予想と実際（getMissedEvents・getEventActuals・getKindAverages）</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        「実際」は、予定に結びついた支出（expenses.event_id）の合計です。見本データには、今月の過ぎた予定
        「ランチ会」（予想 1,500円・食費 2,300円 と結びつけ済み）と「カラオケ」（予想 2,500円・支出なし）が入ります。
      </p>
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["missed", "記録し忘れた予定"],
            ["actuals", "今月の予想と実際"],
            ["averages", "種類ごとの実際の平均"],
          ] as const
        ).map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            onClick={() => loadActuals(kind)}
            disabled={actualsLoading}
            className="rounded-full bg-foreground px-5 py-2 text-background disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>
      {actualsError && <p className="text-sm text-red-600">❌ {actualsError}</p>}

      {missed && (
        <section className="flex flex-col gap-1 text-sm">
          <h3 className="font-semibold">記録し忘れた予定（今月・{missed.length}件）</h3>
          {missed.length === 0 && <p>なし</p>}
          <ul>
            {missed.map((m) => (
              <li key={m.eventId}>
                {m.date}　{m.title}（{m.kind}・予想 {yen(m.estimated)}）
              </li>
            ))}
          </ul>
        </section>
      )}

      {actuals && (
        <section className="flex flex-col gap-1 text-sm">
          <h3 className="font-semibold">予想と実際（{actuals.month}）</h3>
          <p>
            記録あり {actuals.summary.recordedCount}件：予想 {yen(actuals.summary.estimated)}・実際{" "}
            {yen(actuals.summary.actual)}・差 {actuals.summary.diff >= 0 ? "+" : ""}
            {yen(actuals.summary.diff)}　／　記録し忘れ {actuals.summary.missedCount}件　／　これから{" "}
            {actuals.summary.upcomingCount}件
          </p>
          <table className="w-full text-left">
            <thead>
              <tr>
                <th>日付</th><th>予定</th><th>予想</th><th>実際</th><th>差</th>
              </tr>
            </thead>
            <tbody>
              {actuals.events.map((a) => (
                <tr key={a.eventId} className={a.ended ? "" : "text-zinc-400"}>
                  <td>{a.date}</td>
                  <td>
                    {a.title}（{a.kind}）{a.ended ? "" : " まだ"}
                  </td>
                  <td>{yen(a.estimated)}</td>
                  <td>{a.recorded ? `${yen(a.actual)}（${a.expenseCount}件）` : "−"}</td>
                  <td className={a.diff !== null && a.diff > 0 ? "text-red-600" : ""}>
                    {a.diff === null ? "−" : `${a.diff >= 0 ? "+" : ""}${yen(a.diff)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {averages && (
        <section className="flex flex-col gap-1 text-sm">
          <h3 className="font-semibold">種類ごとの実際の平均（過去の予定すべて）</h3>
          {averages.length === 0 && <p>なし（支出が結びついた、過ぎた予定がまだありません）</p>}
          <ul>
            {averages.map((a) => (
              <li key={a.kind}>
                {a.kind}：1回あたり {yen(a.average)}（{a.count}件・合計 {yen(a.total)}）
              </li>
            ))}
          </ul>
        </section>
      )}

      <hr className="my-4 border-black/[.08] dark:border-white/[.145]" />

      <h2 className="text-lg font-semibold">Googleカレンダーへの書き込み</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        明日のお昼に「アプリからのテスト予定」を Googleにも追加して作り、タイトルと時間を変更し、最後に削除します。
        Google に送るのはタイトルと日時だけです（金額と種類は送りません）。
      </p>
      <p className="text-sm text-red-600">⚠ 本物の Googleカレンダーに書き込みます。</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={gwKeep} onChange={(e) => setGwKeep(e.target.checked)} />
        最後に削除しない（途中の様子を Googleカレンダーで確かめるため）
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={tryGoogleWrite}
          disabled={gwRunning}
          className="rounded-full bg-foreground px-5 py-2 text-background disabled:opacity-50"
        >
          {gwRunning ? "実行中…" : "Googleにも追加して作る → 変更 → 削除"}
        </button>
        {gwKeptId !== null && (
          <button
            type="button"
            onClick={deleteKeptGoogleEvent}
            disabled={gwRunning}
            className="rounded-full border border-black/[.08] px-5 py-2 disabled:opacity-50 dark:border-white/[.145]"
          >
            残したテスト予定を削除
          </button>
        )}
      </div>
      <ul className="flex flex-col gap-2 text-sm">
        {gwResults.map((r, i) => (
          <li key={i} className="break-all">
            {r.ok ? "✅" : "❌"} <span className="font-mono font-semibold">{r.label}</span>：{r.detail}
          </li>
        ))}
      </ul>

      <hr className="my-4 border-black/[.08] dark:border-white/[.145]" />

      <h2 className="text-lg font-semibold">自動同期（autoSyncCalendar）</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        前の自動同期から30分以上たっていれば、今月と来月を同期します（30分の判定はサーバー側）。
        30分たっていなければ何もしません。手動の「Googleカレンダーを同期」では、最後に同期した時刻は変わりません。
      </p>
      <button
        type="button"
        onClick={tryAutoSync}
        disabled={autoSyncing}
        className="self-start rounded-full bg-foreground px-5 py-2 text-background disabled:opacity-50"
      >
        {autoSyncing ? "確認中…" : "自動同期を試す"}
      </button>
      {autoResult && (
        <div className="flex flex-col gap-1 text-sm">
          {autoResult.synced ? (
            <p className="font-medium">
              ✅ 同期しました：追加 {autoResult.added}件・更新 {autoResult.updated}件・削除 {autoResult.deleted}件
            </p>
          ) : autoResult.reason === "recent" ? (
            <p className="font-medium">⏸ 前の同期から30分たっていないので、同期しませんでした</p>
          ) : (
            <p className="font-medium text-red-600">
              ❌ {autoResult.error}
              {autoResult.needsRelogin ? "（再ログインが必要）" : ""}
            </p>
          )}
          <p>
            最後に同期した時刻（last_synced_at）：
            {autoResult.lastSyncedAt
              ? new Date(autoResult.lastSyncedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })
              : autoResult.reason === "error"
                ? "取得できませんでした"
                : "まだ同期していない"}
          </p>
        </div>
      )}
    </main>
  );
}
