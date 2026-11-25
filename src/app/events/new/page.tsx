"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { addEvent, type EventKind } from "@/lib/supabase";
import { KIND_STYLES } from "@/components/calendar/eventKinds";
import EventFormHeader from "@/components/event/EventFormHeader";
import TitleField from "@/components/event/TitleField";
import KindPicker from "@/components/event/KindPicker";
import DateTimeFields from "@/components/event/DateTimeFields";
import AmountField from "@/components/event/AmountField";
import { estimateAmount } from "@/components/event/estimateAmount";
import { checkEventForm, toJstIso } from "@/components/event/validateEvent";
import { dateParam } from "@/components/calendar/dates";

/** 日本時間の今日 "2026-11-20" */
function todayInJapan(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });
}

const DEFAULT_START = "19:00";
const DEFAULT_END = "21:00";

export default function NewEventPage() {
  const router = useRouter();
  // カレンダーの「＋ この日に予定を追加」から来たときは、その日付を最初から入れる
  const dateFromUrl = dateParam(useSearchParams().get("date"));

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<EventKind>("other");
  const [date, setDate] = useState(() => dateFromUrl ?? todayInJapan());
  const [startTime, setStartTime] = useState(DEFAULT_START);
  const [endTime, setEndTime] = useState(DEFAULT_END);
  const [amountText, setAmountText] = useState("");
  /** 金額が種類から自動で入ったままなら、その種類 */
  const [autoKind, setAutoKind] = useState<EventKind | null>(null);

  const [warning, setWarning] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // この画面は、ほかの画面に移っても隠れて残る（Cache Components の決まり）。
  // 2回目以降に開いたときも ?date の日付を入れるため、画面が見えるたびに読み直す
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL（外のもの）に合わせるため
    if (dateFromUrl) setDate(dateFromUrl);
  }, [dateFromUrl]);

  /** 保存したあとに、入力を最初の状態に戻す（次に開いたとき、前の入力や「保存中…」が残らないように） */
  function resetForm() {
    setTitle("");
    setKind("other");
    setStartTime(DEFAULT_START);
    setEndTime(DEFAULT_END);
    setAmountText("");
    setAutoKind(null);
    setWarning(null);
    setSaving(false);
  }

  function selectKind(next: EventKind) {
    setKind(next);
    setAmountText(String(estimateAmount(next)));
    setAutoKind(next);
    setWarning(null);
  }

  async function save() {
    if (saving) return;
    const problem = checkEventForm({ title, date, startTime, endTime, amountText });
    if (problem) {
      setWarning(problem);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await addEvent({
        title: title.trim(),
        kind,
        startsAt: toJstIso(date, startTime),
        endsAt: endTime ? toJstIso(date, endTime) : null,
        estimatedAmount: Number(amountText.trim()),
      });
      resetForm();
      router.push(`/calendar?date=${date}`); // 戻ったときに、その日を選んだ状態にする
    } catch (e) {
      setSaveError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-100">
      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pb-8 pt-5">
        <EventFormHeader />

        <TitleField
          value={title}
          onChange={(t) => {
            setTitle(t);
            setWarning(null);
          }}
        />

        <KindPicker selected={kind} onSelect={selectKind} />

        <DateTimeFields
          date={date}
          startTime={startTime}
          endTime={endTime}
          onDateChange={(d) => {
            setDate(d);
            setWarning(null);
          }}
          onStartChange={(t) => {
            setStartTime(t);
            setWarning(null);
          }}
          onEndChange={(t) => {
            setEndTime(t);
            setWarning(null);
          }}
        />

        <AmountField
          value={amountText}
          autoFrom={autoKind ? KIND_STYLES[autoKind].label : null}
          onChange={(text) => {
            setAmountText(text);
            setAutoKind(null);
            setWarning(null);
          }}
        />

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
          {saving ? "保存中…" : "予定を保存"}
        </button>
      </main>
    </div>
  );
}
