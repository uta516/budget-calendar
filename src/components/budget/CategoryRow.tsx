import type { PlannedEvent } from "@/lib/summary";
import { percent, yen } from "./format";

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

// カテゴリ1つ分（名前・残り・バー・内訳）
export default function CategoryRow({ name, budget, spent, planned, plannedEvents, left }: Props) {
  const over = left !== null && left < 0;
  // 予算を超えたときは、使った額＋予定の額を100%としてバーを描く
  const whole = Math.max(budget ?? 0, spent + planned);
  const spentWidth = percent(spent, whole);
  const plannedWidth = percent(planned, whole);

  return (
    <li className="py-3">
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

      <div
        className={`mt-1.5 flex h-2 overflow-hidden rounded-full ${over ? "bg-red-100" : "bg-zinc-200"}`}
        role="img"
        aria-label={`使った ${yen(spent)}円、予定 ${yen(planned)}円${budget !== null ? `、予算 ${yen(budget)}円` : ""}`}
      >
        <div className={over ? "bg-red-600" : "bg-teal-700"} style={{ width: `${spentWidth}%` }} />
        <div className={over ? "bg-red-300" : "bg-orange-500"} style={{ width: `${plannedWidth}%` }} />
      </div>

      <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
        使った {yen(spent)}円
        {planned > 0 && (
          <>
            　予定 {yen(planned)}円（{plannedEvents.map((e) => e.title).join("・")}）
          </>
        )}
        {budget !== null && <>　予算 {yen(budget)}円</>}
      </p>
    </li>
  );
}
