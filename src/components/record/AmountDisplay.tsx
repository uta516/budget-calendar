import { yen } from "./format";

/** 入れた額を引くと、残りがどうなるか */
export type LeftPreview = {
  label: string;
  /** 今の残り */
  before: number;
};

type Props = {
  amount: number;
  previews: LeftPreview[];
};

// 入力中の金額と、引いたあとの残り
export default function AmountDisplay({ amount, previews }: Props) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-right" aria-live="polite">
        <span className={`text-5xl font-bold tracking-tight ${amount === 0 ? "text-zinc-300" : ""}`}>
          {yen(amount)}
        </span>
        <span className="ml-1 text-sm">円</span>
      </p>

      {previews.length > 0 && (
        <dl className="mt-4 space-y-1.5 border-t border-zinc-100 pt-3 text-xs">
          {previews.map((p) => {
            const after = p.before - amount;
            return (
              <div key={p.label} className="flex justify-between gap-2">
                <dt className="text-zinc-500">{p.label}</dt>
                <dd className="text-zinc-500">
                  {yen(p.before)}円 →{" "}
                  <span className={`font-bold ${after < 0 ? "text-orange-600" : "text-zinc-900"}`}>
                    {yen(after)}円
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}
