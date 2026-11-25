import type { BudgetSummary } from "@/lib/summary";
import CategoryRow from "./CategoryRow";

type Props = {
  summary: BudgetSummary;
};

// カテゴリ別の残りの一覧
export default function CategoryList({ summary }: Props) {
  const hasUncategorized = summary.uncategorizedSpent > 0 || summary.uncategorizedPlanned > 0;

  return (
    <section className="rounded-3xl bg-white px-5 pb-2 pt-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold">カテゴリ別の残り</h2>
        <p className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-teal-700" aria-hidden />
            使った
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-teal-300" aria-hidden />
            予定
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-zinc-100 ring-1 ring-inset ring-zinc-300" aria-hidden />
            残り
          </span>
        </p>
      </div>

      {summary.categories.length === 0 && !hasUncategorized ? (
        <p className="py-4 text-sm text-zinc-500">カテゴリがまだありません。</p>
      ) : (
        <ul className="mt-1 divide-y divide-zinc-100">
          {summary.categories.map((c) => (
            <CategoryRow
              key={c.id}
              name={c.name}
              budget={c.budget}
              spent={c.spent}
              planned={c.planned}
              plannedEvents={c.plannedEvents}
              left={c.left}
            />
          ))}
          {hasUncategorized && (
            <CategoryRow
              name="カテゴリなし"
              budget={null}
              spent={summary.uncategorizedSpent}
              planned={summary.uncategorizedPlanned}
              plannedEvents={summary.uncategorizedPlannedEvents}
              left={null}
            />
          )}
        </ul>
      )}
    </section>
  );
}
