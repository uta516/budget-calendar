import type { Event } from "@/lib/supabase";
import type { DayGuide } from "@/lib/summary";
import { kindStyle } from "@/components/calendar/eventKinds";
import { jstDate } from "@/components/calendar/dates";
import { shortDate, yen } from "./yen";

type Props = {
  days: DayGuide[];
  /** 今週の予定。読み込み中・読めなかったときは null */
  events: Event[] | null;
};

// 日ごとの目安の下に出す「今週の予定」（日付・曜日・予定名・予想金額）
export default function WeekEventList({ days, events }: Props) {
  if (!events) return null;

  const rows = days
    .map((day) => ({
      day,
      events: events
        .filter((e) => jstDate(e.starts_at) === day.date)
        .sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1)),
    }))
    .filter((row) => row.events.length > 0);

  if (rows.length === 0) {
    return <p className="mt-3 text-xs text-zinc-400">今週の予定はありません</p>;
  }

  return (
    <ul className="mt-3 space-y-1.5 border-t border-zinc-100 pt-3">
      {rows.map(({ day, events: dayEvents }) => (
        <li key={day.date} className={`flex gap-2 text-sm ${day.isPast ? "text-zinc-400" : "text-zinc-800"}`}>
          <span
            className={`w-[4.5rem] shrink-0 text-xs leading-5 ${
              day.isToday ? "font-bold text-teal-700" : day.isPast ? "" : "text-zinc-500"
            }`}
          >
            {shortDate(day.date)}（{day.weekday}）
          </span>
          <ul className="min-w-0 flex-1 space-y-0.5">
            {dayEvents.map((e) => {
              const style = kindStyle(e.kind);
              return (
                <li key={e.id} className="flex items-center gap-1.5 leading-5">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${style.dotClass}`} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{e.title}</span>
                  <span className="shrink-0 text-xs">
                    {e.kind === "work" ? "バイト" : e.estimated_amount > 0 ? `${yen(e.estimated_amount)}円` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
