"use client";

import Link from "next/link";
import { useState } from "react";
import type { Expense, MissedEvent } from "@/lib/supabase";
import { kindStyle } from "@/components/calendar/eventKinds";
import { shortDate, yen } from "@/components/record/format";

type Props = {
  event: MissedEvent;
  /** 結びつけられる支出（まだどの予定にも結びついていないもの。予定の日に近い順） */
  expenses: Expense[];
  categoryName: (categoryId: number | null) => string;
  busy: boolean;
  onLink: (expense: Expense) => void;
};

/** 結びつける候補として最初に見せる数 */
const FIRST_COUNT = 5;

// 記録し忘れた予定1つ分。「記録する」か、記録済みの支出から選んで結びつける
export default function MissedEventCard({ event, expenses, categoryName, busy, onLink }: Props) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const style = kindStyle(event.kind);
  const shown = showAll ? expenses : expenses.slice(0, FIRST_COUNT);

  return (
    <li className="rounded-3xl bg-white p-4 text-zinc-800 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dotClass}`} aria-hidden />
        <span className="shrink-0 text-xs text-zinc-500">
          {shortDate(event.date)}・{style.label}
        </span>
        <span className="ml-auto shrink-0 text-xs text-zinc-500">予想 {yen(event.estimated)}円</span>
      </div>
      <p className="mt-1 font-bold">{event.title}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href={`/record?event=${event.eventId}&from=missed`}
          className="rounded-xl bg-teal-700 py-2.5 text-center text-sm font-bold text-white hover:bg-teal-800"
        >
          使った額を記録する
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="rounded-xl border border-zinc-200 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
        >
          記録済みから選ぶ
        </button>
      </div>

      {open && (
        <div className="mt-3 border-t border-zinc-100 pt-3">
          {expenses.length === 0 ? (
            <p className="text-xs text-zinc-500">結びつけられる支出がありません（どの予定にも結びついていない支出だけ出ます）</p>
          ) : (
            <>
              <p className="text-xs text-zinc-500">この予定で使った支出を選んでください</p>
              <ul className="mt-2 space-y-1.5">
                {shown.map((x) => (
                  <li key={x.id}>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onLink(x)}
                      className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-left text-sm hover:bg-zinc-50 disabled:opacity-50"
                    >
                      <span className="w-10 shrink-0 text-xs text-zinc-500">{shortDate(x.spent_on)}</span>
                      <span className="min-w-0 flex-1 truncate">{categoryName(x.category_id)}</span>
                      <span className="shrink-0 font-bold">{yen(x.amount)}円</span>
                    </button>
                  </li>
                ))}
              </ul>
              {!showAll && expenses.length > FIRST_COUNT && (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="mt-2 w-full text-center text-xs font-bold text-teal-700"
                >
                  もっと見る（あと{expenses.length - FIRST_COUNT}件）
                </button>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}
