"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCategories,
  getExpenses,
  getMissedEvents,
  linkExpenseToEvent,
  type Category,
  type Expense,
  type MissedEvent,
} from "@/lib/supabase";
import MissedHeader from "@/components/missed/MissedHeader";
import MissedEventCard from "@/components/missed/MissedEventCard";
import { linkCandidates } from "@/components/missed/linkCandidates";
import { prevMonth } from "@/components/record/pickableEvents";
import { todayInJapan, yen } from "@/components/record/format";

type Loaded = {
  missed: MissedEvent[];
  expenses: Expense[];
  categories: Category[];
};

/** 結びつけたあとに出す知らせ（「元に戻す」用に、どの支出かを持っておく） */
type Linked = { expense: Expense; title: string };

export default function MissedEventsPage() {
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linked, setLinked] = useState<Linked | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // 今月と先月の、記録し忘れた予定・支出・カテゴリを読む
  const load = useCallback(async () => {
    const month = todayInJapan().slice(0, 7);
    const last = prevMonth(month);
    const [thisMissed, lastMissed, thisExpenses, lastExpenses, categories] = await Promise.all([
      getMissedEvents(month),
      getMissedEvents(last),
      getExpenses(month),
      getExpenses(last),
      getCategories(),
    ]);
    return {
      // 新しい予定を上にする
      missed: [...thisMissed, ...lastMissed].sort((a, b) => (a.startsAt < b.startsAt ? 1 : -1)),
      expenses: [...thisExpenses, ...lastExpenses],
      categories,
    };
  }, []);

  // この画面はほかの画面に移っても隠れて残るので、見えるたびに読み直す（記録して戻ってきたときのため）
  useEffect(() => {
    let ignore = false;
    load()
      .then((d) => {
        if (ignore) return;
        setData(d);
        setLoadError(null);
      })
      .catch((e: Error) => !ignore && setLoadError(e.message));
    return () => {
      ignore = true;
    };
  }, [load]);

  async function reload() {
    try {
      setData(await load());
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }

  function categoryName(id: number | null): string {
    return data?.categories.find((c) => c.id === id)?.name ?? "カテゴリなし";
  }

  async function link(event: MissedEvent, expense: Expense) {
    setBusy(true);
    setActionError(null);
    try {
      await linkExpenseToEvent(expense.id, event.eventId);
      setLinked({ expense, title: event.title });
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  /** 結びつけたのを取り消す（eventId を null にする） */
  async function undo() {
    if (!linked) return;
    setBusy(true);
    setActionError(null);
    try {
      await linkExpenseToEvent(linked.expense.id, null);
      setLinked(null);
      await reload();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-100">
      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pb-8 pt-5">
        <MissedHeader />
        <p className="text-xs leading-relaxed text-zinc-500">
          終わった予定のうち、使ったお金がまだ記録されていないものです（今月と先月。バイトと予想0円の予定は出ません）。
          記録すると、予想と実際の差が分かるようになります。
        </p>

        {linked && (
          <div
            className="flex items-center gap-2 rounded-2xl bg-teal-50 p-3 text-sm text-teal-800"
            role="status"
          >
            <span className="min-w-0 flex-1">
              「{linked.title}」に {yen(linked.expense.amount)}円の支出を結びつけました
            </span>
            <button
              type="button"
              onClick={undo}
              disabled={busy}
              className="shrink-0 text-xs font-bold underline disabled:opacity-50"
            >
              元に戻す
            </button>
          </div>
        )}
        {actionError && (
          <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {actionError}
          </p>
        )}

        {loadError ? (
          <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {loadError}
          </p>
        ) : !data ? (
          <p className="py-10 text-center text-sm text-zinc-500">読み込み中…</p>
        ) : data.missed.length === 0 ? (
          <p className="rounded-3xl bg-white p-6 text-center text-sm text-zinc-600 shadow-sm">
            記録し忘れた予定はありません 🎉
          </p>
        ) : (
          <ul className="space-y-3">
            {data.missed.map((event) => (
              <MissedEventCard
                key={event.eventId}
                event={event}
                expenses={linkCandidates(data.expenses, event.date)}
                categoryName={categoryName}
                busy={busy}
                onLink={(expense) => link(event, expense)}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
