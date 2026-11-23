import { yen, shortDate } from "./yen";

type Props = {
  weekLeft: number;
  todayGuide: number;
  weekSpent: number;
  weekBudget: number;
  /** 今週の月曜と日曜 "2026-11-09" */
  weekStart: string;
  weekEnd: string;
};

// 「今週あと使えるお金」と「今日の目安」の大きいカード
export default function WeekMoneyCard({
  weekLeft,
  todayGuide,
  weekSpent,
  weekBudget,
  weekStart,
  weekEnd,
}: Props) {
  const usedRate = weekBudget > 0 ? Math.min(Math.max(weekSpent / weekBudget, 0), 1) : 0;

  return (
    <section className="rounded-3xl bg-teal-700 p-5 text-white shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">今週あと使えるお金</h2>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
          {shortDate(weekStart)}〜{shortDate(weekEnd)}
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <p className={weekLeft < 0 ? "text-orange-200" : undefined}>
          <span className="text-5xl font-bold tracking-tight">{yen(weekLeft)}</span>
          <span className="ml-1 text-sm">円</span>
        </p>
        <div className="text-right">
          <p className="text-xs">今日の目安</p>
          <p className="text-xl font-bold">{yen(todayGuide)}円</p>
        </div>
      </div>

      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-white/25"
        role="progressbar"
        aria-label="今週の予算のうち使った割合"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(usedRate * 100)}
      >
        <div className="h-full rounded-full bg-white" style={{ width: `${usedRate * 100}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs font-bold">
        <span>使った {yen(weekSpent)}円</span>
        <span>今週の予算 {yen(weekBudget)}円</span>
      </div>
    </section>
  );
}
