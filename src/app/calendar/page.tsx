"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { autoSyncCalendar, getEvents, type AutoSyncResult, type Event } from "@/lib/supabase";
import MonthCalendar from "@/components/calendar/MonthCalendar";
import KindLegend from "@/components/calendar/KindLegend";
import DayEventList from "@/components/calendar/DayEventList";
import SyncStatus from "@/components/calendar/SyncStatus";
import { dateParam, jstDate, todayInJapan } from "@/components/calendar/dates";

export default function CalendarPage() {
  // 予定の追加画面から戻ったとき（?date=）は、その日を選んだ状態で開く
  const dateFromUrl = dateParam(useSearchParams().get("date"));
  const [month, setMonth] = useState(() => (dateFromUrl ?? todayInJapan()).slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(() => dateFromUrl ?? todayInJapan());

  // この画面は、ほかの画面に移っても隠れて残る（Cache Components の決まり）。
  // 予定を追加して戻ったときも ?date の日を選ぶため、画面が見えるたびに読み直す
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- URL（外のもの）に合わせるため
    if (dateFromUrl) setSelectedDate(dateFromUrl);
  }, [dateFromUrl]);
  const [sync, setSync] = useState<AutoSyncResult | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 開いたら、まず Googleカレンダーを自動同期する（Error は投げない関数）
  useEffect(() => {
    autoSyncCalendar().then(setSync);
  }, []);

  // 同期が終わってから、表示している月の予定を読み込む
  useEffect(() => {
    if (!sync) return;
    let ignore = false;
    getEvents(month)
      .then((list) => {
        if (ignore) return;
        setEvents(list);
        setError(null);
      })
      .catch((e: Error) => {
        if (!ignore) setError(e.message);
      });
    return () => {
      ignore = true;
    };
  }, [sync, month]);

  const dayEvents = events.filter((e) => jstDate(e.starts_at) === selectedDate);

  return (
    <div className="flex flex-1 flex-col bg-zinc-100">
      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pb-8 pt-6">
        <header>
          <h1 className="text-2xl font-bold">カレンダー</h1>
          <div className="mt-1">
            <SyncStatus result={sync} />
          </div>
        </header>

        {error && (
          <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <MonthCalendar
          events={events}
          selectedDate={selectedDate}
          focusDate={dateFromUrl}
          onDateClick={setSelectedDate}
          onMonthChange={setMonth}
        />
        <KindLegend />
        <DayEventList date={selectedDate} events={dayEvents} />
      </main>
    </div>
  );
}
