import type { Event } from "@/lib/supabase";
import type { DayGuide } from "@/lib/summary";
import WeekEventList from "./WeekEventList";
import { shortDate, yen } from "./yen";

type Props = {
  days: DayGuide[];
  /** 今週の予定（予定名を出すため）。読み込み中・読めなかったときは null */
  events: Event[] | null;
};

/** 棒に出す額：過ぎた日は使った額、今日以降は目安 */
function amountOf(day: DayGuide): number {
  return day.guide ?? day.spent;
}

function barColor(day: DayGuide): string {
  if (!day.inMonth) return "bg-zinc-100";
  if (day.isToday) return "bg-teal-700";
  if (day.isPast) return "bg-zinc-200";
  if (day.eventCount > 0) return "bg-orange-500";
  return "bg-teal-100";
}

function labelColor(day: DayGuide): string {
  if (day.isToday) return "font-bold text-teal-700";
  if (!day.inMonth) return "text-zinc-300";
  return "text-zinc-600";
}

// 今週の日ごとの目安（棒グラフ）
export default function DailyGuideChart({ days, events }: Props) {
  const max = Math.max(...days.filter((d) => d.inMonth).map(amountOf), 1);
  const hasEvent = days.some((d) => !d.isPast && d.inMonth && d.eventCount > 0);

  return (
    <section className="rounded-3xl bg-white p-5 text-zinc-800 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-bold">今週の日ごとの目安</h2>
        {hasEvent && <p className="text-xs text-zinc-500">オレンジは予定がある日</p>}
      </div>

      <ul className="mt-4 grid grid-cols-7 gap-1.5">
        {days.map((day) => {
          const amount = amountOf(day);
          const height = day.inMonth ? Math.max((amount / max) * 64, 6) : 6;
          return (
            <li key={day.date} className="flex flex-col items-center">
              <div className="flex h-[88px] w-full flex-col items-center justify-end">
                <span
                  className={`mb-1 text-[10px] ${
                    day.isToday ? "font-bold text-teal-700" : "text-zinc-500"
                  }`}
                >
                  {day.inMonth ? yen(amount) : "−"}
                </span>
                <div
                  className={`w-full rounded-md ${barColor(day)}`}
                  style={{ height: `${height}px` }}
                />
              </div>
              <span className={`mt-1.5 text-[10px] leading-tight ${labelColor(day)}`}>
                {shortDate(day.date)}
              </span>
              <span className={`text-xs leading-tight ${labelColor(day)}`}>（{day.weekday}）</span>
              {day.eventCount > 0 && (
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-orange-500" aria-label={`予定${day.eventCount}件`} />
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-zinc-500">過ぎた日は使った額、今日からは目安を表示</p>
      <WeekEventList days={days} events={events} />
    </section>
  );
}
