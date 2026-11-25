"use client";

import { useState, type ReactNode } from "react";
import { kindStyle } from "@/components/calendar/eventKinds";
import { shortDate, yen } from "./format";
import type { PickableEvent } from "./pickableEvents";

type Props = {
  /** 選べる予定（新しい順）。まだ読み込み中なら null */
  events: PickableEvent[] | null;
  selectedId: number | null;
  onSelect: (event: PickableEvent | null) => void;
};

/** 最初に見せる数（ほかは「もっと見る」） */
const FIRST_COUNT = 4;

// どの予定で使ったお金かを選ぶ（選ばなくてもよい）
export default function EventPicker({ events, selectedId, onSelect }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (events === null) {
    return (
      <section className="rounded-3xl bg-white p-4 text-zinc-800 shadow-sm">
        <h2 className="text-sm font-bold">どの予定で使った？</h2>
        <p className="mt-2 text-sm text-zinc-500">予定を読み込み中…</p>
      </section>
    );
  }

  // 選んでいる予定は、「もっと見る」を押さなくても見えるようにする
  const selectedIndex = events.findIndex((e) => e.id === selectedId);
  const shown =
    showAll || events.length <= FIRST_COUNT
      ? events
      : events.filter((e, i) => i < FIRST_COUNT || i === selectedIndex);
  const hiddenCount = events.length - shown.length;

  return (
    <section className="rounded-3xl bg-white p-4 text-zinc-800 shadow-sm">
      <h2 className="text-sm font-bold">
        どの予定で使った？<span className="ml-1 text-xs font-normal text-zinc-400">（選ばなくてもよい）</span>
      </h2>

      <ul role="radiogroup" aria-label="予定" className="mt-2 space-y-1.5">
        <li>
          <Option selected={selectedId === null} onClick={() => onSelect(null)}>
            <span className="text-sm text-zinc-600">予定なし</span>
          </Option>
        </li>
        {shown.map((e) => {
          const style = kindStyle(e.kind);
          return (
            <li key={e.id}>
              <Option selected={e.id === selectedId} onClick={() => onSelect(e)}>
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dotClass}`} aria-hidden />
                <span className="w-10 shrink-0 text-xs text-zinc-500">{shortDate(e.date)}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
                {e.missed && (
                  <span className="shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                    未記録
                  </span>
                )}
                {e.estimated > 0 && (
                  <span className="shrink-0 text-xs text-zinc-500">予想{yen(e.estimated)}円</span>
                )}
              </Option>
            </li>
          );
        })}
      </ul>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-2 w-full text-center text-xs font-bold text-teal-700"
        >
          もっと見る（あと{hiddenCount}件）
        </button>
      )}
      {events.length === 0 && (
        <p className="mt-2 text-xs text-zinc-400">最近の予定はありません</p>
      )}
    </section>
  );
}

function Option({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left ${
        selected ? "border-teal-700 bg-teal-50" : "border-zinc-200 hover:bg-zinc-50"
      }`}
    >
      {children}
    </button>
  );
}
