import type { PlannedEvent } from "@/lib/summary";
import BudgetBar from "./BudgetBar";
import { yen } from "./format";

type Props = {
  name: string;
  /** 月の予算。カテゴリなしの行は null */
  budget: number | null;
  spent: number;
  planned: number;
  plannedEvents: PlannedEvent[];
  /** 残り（予算 − 使った額 − 予定の額）。カテゴリなしの行は null */
  left: number | null;
};

// カテゴリ1つ分（名前・残り・バー・バーの色ごとの金額）
export default function CategoryRow({ name, budget, spent, planned, plannedEvents, left }: Props) {
  const over = left !== null && left < 0;

  return (
    <li className="py-3 text-zinc-800">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className={`font-bold ${over ? "text-red-600" : ""}`}>{name}</h3>
        {left !== null && (
          <p className={`text-sm ${over ? "font-bold text-red-600" : ""}`}>
            {over ? (
              <>
                <span className="font-bold">{yen(-left)}円</span> オーバー
              </>
            ) : (
              <>
                あと <span className="font-bold">{yen(left)}円</span>
              </>
            )}
          </p>
        )}
      </div>

      <BudgetBar budget={budget} spent={spent} planned={planned} />

      {/* バーの色と同じ印をつけて、どの色がいくらかを並べる */}
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-600">
        <Legend swatch={over ? "bg-red-600" : "bg-teal-700"} label="使った" amount={spent} />
        {planned > 0 && (
          <Legend swatch={over ? "bg-red-300" : "bg-teal-300"} label="予定" amount={planned} />
        )}
        {left !== null && !over && (
          <Legend swatch="bg-zinc-100 ring-1 ring-inset ring-zinc-300" label="残り" amount={left} />
        )}
        {budget !== null && (
          <li className="ml-auto text-zinc-400">予算 {yen(budget)}円</li>
        )}
      </ul>
      {plannedEvents.length > 0 && (
        <p className="mt-1 truncate text-xs text-zinc-400">
          予定：{plannedEvents.map((e) => e.title).join("・")}
        </p>
      )}
    </li>
  );
}

function Legend({ swatch, label, amount }: { swatch: string; label: string; amount: number }) {
  return (
    <li className="flex items-center gap-1">
      <span className={`h-2.5 w-2.5 rounded-sm ${swatch}`} aria-hidden />
      {label} <span className="font-bold text-zinc-800">{yen(amount)}円</span>
    </li>
  );
}
