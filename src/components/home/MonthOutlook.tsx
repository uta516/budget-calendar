import { yen } from "./yen";

type Props = {
  monthLeft: number;
  plannedAmount: number;
  plannedCount: number;
  dailyMoney: number;
};

// 月末までの見通し（予定で使う見込みと、普段使いに回せるお金）
export default function MonthOutlook({ monthLeft, plannedAmount, plannedCount, dailyMoney }: Props) {
  const total = plannedAmount + Math.max(dailyMoney, 0);
  const plannedRate = total > 0 ? (plannedAmount / total) * 100 : 0;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="font-bold">月末までの見通し</h2>

      <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-zinc-200">
        {total > 0 && (
          <>
            <div className="h-full bg-orange-500" style={{ width: `${plannedRate}%` }} />
            <div className="h-full flex-1 bg-teal-300" />
          </>
        )}
      </div>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-500" aria-hidden />
            予定で使う見込み（{plannedCount}件）
          </dt>
          <dd className="font-bold">{yen(plannedAmount)}円</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-teal-300" aria-hidden />
            普段使いに回せるお金
          </dt>
          <dd className={`font-bold ${dailyMoney < 0 ? "text-orange-600" : ""}`}>
            {yen(dailyMoney)}円
          </dd>
        </div>
      </dl>

      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
        今月あと使えるお金 {yen(monthLeft)}円 のうち、カレンダーの予定の分を先に取り分けている。
      </p>
    </section>
  );
}
