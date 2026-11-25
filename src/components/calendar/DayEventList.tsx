import Link from "next/link";
import type { Event } from "@/lib/supabase";
import { kindStyle } from "./eventKinds";
import { dayLabel, isAllDay, jstTime } from "./dates";

type Props = {
  /** "2026-11-28" */
  date: string;
  /** その日の予定（開始の早い順） */
  events: Event[];
};

function timeText(e: Event): string {
  if (isAllDay(e.starts_at, e.ends_at)) return "終日";
  return e.ends_at ? `${jstTime(e.starts_at)}〜${jstTime(e.ends_at)}` : jstTime(e.starts_at);
}

// 選んだ日の予定と予想金額の一覧
export default function DayEventList({ date, events }: Props) {
  const total = events
    .filter((e) => e.kind !== "work")
    .reduce((sum, e) => sum + e.estimated_amount, 0);

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-bold">{dayLabel(date)}の予定</h2>
        {total > 0 && (
          <p className="text-xs text-zinc-500">
            予想 <span className="font-bold text-orange-600">−{total.toLocaleString("ja-JP")}円</span>
          </p>
        )}
      </div>

      {events.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">予定はありません</p>
      ) : (
        <ul className="mt-2 divide-y divide-zinc-100">
          {events.map((e) => {
            const style = kindStyle(e.kind);
            const isWork = e.kind === "work";
            return (
              <li key={e.id} className="flex items-start gap-3 py-3">
                <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${style.dotClass}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{e.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {timeText(e)}・{style.label}
                    {e.google_event_id && "・Googleカレンダー"}
                  </p>
                </div>
                <p
                  className={`shrink-0 font-bold ${
                    isWork ? "text-teal-700" : e.estimated_amount > 0 ? "text-orange-600" : "text-zinc-400"
                  }`}
                >
                  {isWork
                    ? "バイト"
                    : e.estimated_amount > 0
                      ? `−${e.estimated_amount.toLocaleString("ja-JP")}円`
                      : "金額未設定"}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href={`/events/new?date=${date}`}
        className="mt-3 block rounded-2xl border border-dashed border-teal-300 py-3 text-center text-sm font-bold text-teal-700 hover:bg-teal-50"
      >
        ＋ この日に予定を追加
      </Link>
    </section>
  );
}
