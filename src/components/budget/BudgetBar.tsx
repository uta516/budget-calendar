import type { ReactNode } from "react";
import { percent, yen } from "./format";

type Props = {
  /** 月の予算。カテゴリなしの行は null */
  budget: number | null;
  spent: number;
  planned: number;
};

/** バーの中に金額を書くのに必要な幅（%）。これより細いところには書かない */
const LABEL_MIN_WIDTH = 22;

// 1本のバー：全体＝予算。濃い色＝使った額、薄い色＝予定の額（使った額の続き）、残りは灰色。
// 予算を超えるときは、使った額＋予定の額を全体にして赤で描き、予算の位置に縦の線を引く
export default function BudgetBar({ budget, spent, planned }: Props) {
  const used = spent + planned;
  const over = budget !== null && used > budget;
  const whole = Math.max(budget ?? 0, used);
  const spentWidth = percent(spent, whole);
  const plannedWidth = percent(planned, whole);
  const budgetLine = over && budget !== null ? percent(budget, whole) : null;
  const left = budget !== null ? budget - used : null;

  return (
    <div className="relative mt-2">
      <div
        className={`flex h-6 overflow-hidden rounded-lg ${over ? "bg-red-50" : "bg-zinc-100"}`}
        role="img"
        aria-label={[
          `使った ${yen(spent)}円`,
          `予定 ${yen(planned)}円`,
          left !== null && (left < 0 ? `${yen(-left)}円オーバー` : `残り ${yen(left)}円`),
          budget !== null && `予算 ${yen(budget)}円`,
        ]
          .filter(Boolean)
          .join("、")}
      >
        <Segment width={spentWidth} className={over ? "bg-red-600 text-white" : "bg-teal-700 text-white"}>
          {yen(spent)}
        </Segment>
        <Segment width={plannedWidth} className={over ? "bg-red-300 text-red-900" : "bg-teal-300 text-teal-900"}>
          {yen(planned)}
        </Segment>
        {left !== null && left > 0 && (
          <Segment width={percent(left, whole)} className="text-zinc-500">
            {yen(left)}
          </Segment>
        )}
      </div>

      {budgetLine !== null && (
        <div
          className="absolute -bottom-1 -top-1 w-0.5 rounded bg-zinc-900"
          style={{ left: `calc(${budgetLine}% - 1px)` }}
          aria-hidden
        />
      )}
    </div>
  );
}

function Segment({
  width,
  className,
  children,
}: {
  width: number;
  className: string;
  children: ReactNode;
}) {
  if (width <= 0) return null;
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden whitespace-nowrap text-[11px] font-bold ${className}`}
      style={{ width: `${width}%` }}
    >
      {width >= LABEL_MIN_WIDTH && children}
    </div>
  );
}
