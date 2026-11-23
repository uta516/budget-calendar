import Link from "next/link";
import type { GoalSummary } from "@/lib/summary";
import { percent, yen } from "./format";

type Props = {
  goal: GoalSummary | null;
};

// 目標（あといくら・たまった割合）
export default function GoalCard({ goal }: Props) {
  if (!goal) {
    return (
      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-600">まだ目標がありません。</p>
        <Link href="/settings" className="mt-2 inline-block text-sm font-bold text-teal-700">
          目標を決める ›
        </Link>
      </section>
    );
  }

  const done = goal.remaining <= 0;
  const monthsLeft = goal.perMonth > 0 ? Math.ceil(goal.remaining / goal.perMonth) : 0;

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-zinc-500">目標：{goal.name}</p>
        <Link href="/settings" className="shrink-0 text-xs font-bold text-teal-700">
          変更
        </Link>
      </div>

      {done ? (
        <p className="mt-2 text-xl font-bold text-teal-700">目標を達成しました！</p>
      ) : (
        <p className="mt-2">
          <span className="text-sm">目標まであと </span>
          <span className="text-3xl font-bold tracking-tight">{yen(goal.remaining)}</span>
          <span className="ml-1 text-sm">円</span>
        </p>
      )}

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-teal-700"
          style={{ width: `${percent(goal.savedAmount, goal.targetAmount)}%` }}
        />
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
        {yen(goal.targetAmount)}円のうち{yen(goal.savedAmount)}円たまった。
        {!done && `毎月${yen(goal.perMonth)}円ずつで、あと${monthsLeft}か月。`}
      </p>
    </section>
  );
}
