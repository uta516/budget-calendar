"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  addExpense,
  ensureDefaultCategories,
  getEvents,
  getMissedEvents,
  type Category,
} from "@/lib/supabase";
import EventPicker from "@/components/record/EventPicker";
import MissedBanner from "@/components/record/MissedBanner";
import { pickableEvents, prevMonth, type PickableEvent } from "@/components/record/pickableEvents";
import { getBudgetSummary, getHomeSummary, type BudgetSummary, type HomeSummary } from "@/lib/summary";
import RecordHeader from "@/components/record/RecordHeader";
import AmountDisplay, { type LeftPreview } from "@/components/record/AmountDisplay";
import CategoryPicker from "@/components/record/CategoryPicker";
import NumberPad from "@/components/record/NumberPad";
import DateMemoFields from "@/components/record/DateMemoFields";
import { todayInJapan } from "@/components/record/format";

/** 金額の桁数の上限（999万9999円まで） */
const MAX_DIGITS = 7;

/** URL の ?event の値が正の整数ならその数、違えば null */
function eventParam(value: string | null): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return id > 0 ? id : null;
}

export default function RecordPage() {
  const router = useRouter();
  const [today] = useState(todayInJapan);
  // 「記録し忘れた予定」から来たとき（?event=12&from=missed）は、その予定を選んだ状態で開く
  const params = useSearchParams();
  const eventFromUrl = eventParam(params.get("event"));
  const fromMissed = params.get("from") === "missed";

  const [events, setEvents] = useState<PickableEvent[] | null>(null);
  const [missedCount, setMissedCount] = useState(0);
  const [eventId, setEventId] = useState<number | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [budget, setBudget] = useState<BudgetSummary | null>(null);
  const [home, setHome] = useState<HomeSummary | null>(null);

  const [digits, setDigits] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(today);
  const [memo, setMemo] = useState("");

  const [warning, setWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    ensureDefaultCategories()
      .then((list) => {
        setCategories(list);
        setCategoryId((current) => current ?? list[0]?.id ?? null);
      })
      .catch((e: Error) => setLoadError(e.message));
    // 「残りがどうなるか」の表示用。読めなくても入力はできるので、失敗しても何も出さない
    getBudgetSummary().then(setBudget).catch(() => {});
    getHomeSummary().then(setHome).catch(() => {});
  }, []);

  // 選べる予定（最近の予定と、記録し忘れた予定）。今月と先月の分を読む。
  // この画面はほかの画面に移っても隠れて残るので、見えるたびに読み直す（記録し忘れの数を新しくするため）
  useEffect(() => {
    let ignore = false;
    const month = today.slice(0, 7);
    const last = prevMonth(month);
    Promise.all([getEvents(month), getEvents(last), getMissedEvents(month), getMissedEvents(last)])
      .then(([thisEvents, lastEvents, thisMissed, lastMissed]) => {
        if (ignore) return;
        const missed = [...thisMissed, ...lastMissed];
        setEvents(pickableEvents([...thisEvents, ...lastEvents], missed, today));
        setMissedCount(missed.length);
      })
      // 予定が読めなくても支出は記録できるので、選ぶ欄を空にするだけ
      .catch(() => !ignore && setEvents([]));
    return () => {
      ignore = true;
    };
  }, [today]);

  // ?event の予定を選び、日付をその予定の日にする
  useEffect(() => {
    if (!events || eventFromUrl === null) return;
    const event = events.find((e) => e.id === eventFromUrl);
    if (!event) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL（外のもの）に合わせるため
    setEventId(event.id);
    setDate(event.date);
  }, [events, eventFromUrl]);

  function selectEvent(event: PickableEvent | null) {
    setEventId(event?.id ?? null);
    if (event) setDate(event.date);
  }

  /** 記録したあとに入力を最初に戻す（この画面は隠れて残るので、次に開いたとき前の入力が残らないように） */
  function resetForm() {
    setDigits("");
    setEventId(null);
    setDate(today);
    setMemo("");
    setWarning(null);
    setSaving(false);
  }

  const amount = Number(digits || "0");

  function addDigits(d: string) {
    setWarning(null);
    setDigits((current) => {
      const next = (current + d).replace(/^0+/, "");
      return next.length > MAX_DIGITS ? current : next;
    });
  }

  function deleteDigit() {
    setDigits((current) => current.slice(0, -1));
  }

  // 選んだ日が今月・今週のときだけ、残りの変化を出す
  const previews: LeftPreview[] = [];
  const category = budget?.categories.find((c) => c.id === categoryId);
  if (category && date.startsWith(budget!.month)) {
    previews.push({ label: `${category.name}の今月の残り`, before: category.left });
  }
  if (home && home.days.some((d) => d.date === date && d.inMonth)) {
    previews.push({ label: "今週あと使えるお金", before: home.weekLeft });
  }

  async function save() {
    if (saving) return;
    if (amount <= 0) {
      setWarning("金額を入れてください（1円以上）");
      return;
    }
    if (categoryId === null) {
      setWarning("カテゴリを選んでください");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      // 予定を選んでいれば eventId を渡す（予想と実際の「実際」になる）
      await addExpense({ amount, categoryId, spentOn: date, eventId: eventId ?? undefined });
      resetForm();
      router.push(fromMissed ? "/record/missed" : "/");
    } catch (e) {
      setSaveError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-100">
      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pb-8 pt-5">
        <RecordHeader date={date} />

        <MissedBanner count={missedCount} />
        <AmountDisplay amount={amount} previews={previews} />

        {loadError ? (
          <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {loadError}
          </p>
        ) : categories.length === 0 ? (
          <p className="text-center text-sm text-zinc-500">カテゴリを読み込み中…</p>
        ) : (
          <CategoryPicker
            categories={categories}
            selectedId={categoryId}
            onSelect={(id) => {
              setCategoryId(id);
              setWarning(null);
            }}
          />
        )}

        <EventPicker events={events} selectedId={eventId} onSelect={selectEvent} />

        <DateMemoFields
          date={date}
          maxDate={today}
          memo={memo}
          onDateChange={(d) => setDate(d || today)}
          onMemoChange={setMemo}
        />

        <NumberPad onDigit={addDigits} onDelete={deleteDigit} />

        {warning && (
          <p className="rounded-2xl bg-orange-50 p-3 text-sm font-bold text-orange-700" role="alert">
            {warning}
          </p>
        )}
        {saveError && (
          <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {saveError}
          </p>
        )}

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-14 w-full rounded-2xl bg-teal-700 text-lg font-bold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50"
        >
          {saving ? "記録中…" : "記録する"}
        </button>
      </main>
    </div>
  );
}
