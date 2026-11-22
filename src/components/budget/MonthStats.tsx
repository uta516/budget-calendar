import { yen } from "./format";

type Props = {
  incomeTotal: number;
  monthLeft: number;
};

// 今月の収入と、今月あと使えるお金の2つの数字
export default function MonthStats({ incomeTotal, monthLeft }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-xs text-zinc-500">今月の収入</h2>
        <p className="mt-1 text-xl font-bold">{yen(incomeTotal)}円</p>
      </section>
      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="text-xs text-zinc-500">今月あと使える</h2>
        <p className={`mt-1 text-xl font-bold ${monthLeft < 0 ? "text-red-600" : "text-teal-700"}`}>
          {yen(monthLeft)}円
        </p>
      </section>
    </div>
  );
}
