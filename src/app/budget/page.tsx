"use client";

import { useEffect, useState } from "react";
import { ensureDefaultCategories } from "@/lib/supabase";
import { getBudgetSummary, type BudgetSummary } from "@/lib/summary";
import GoalCard from "@/components/budget/GoalCard";
import MonthStats from "@/components/budget/MonthStats";
import CategoryList from "@/components/budget/CategoryList";

export default function BudgetPage() {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // getBudgetSummary はカテゴリを作らないので、0件の人には先に初期のカテゴリを作る
    ensureDefaultCategories()
      .then(() => getBudgetSummary())
      .then(setSummary)
      .catch((e: Error) => setError(e.message));
  }, []);

  const monthNumber = summary ? Number(summary.month.slice(5)) : null;

  return (
    <div className="flex flex-1 flex-col bg-zinc-100">
      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pb-8 pt-6">
        <h1 className="text-2xl font-bold">予算{monthNumber !== null && `（${monthNumber}月）`}</h1>

        {error && (
          <p className="rounded-2xl bg-red-50 p-4 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        {!summary && !error && (
          <p className="py-20 text-center text-sm text-zinc-500">読み込み中…</p>
        )}

        {summary && (
          <>
            <GoalCard goal={summary.goal} />
            <MonthStats incomeTotal={summary.incomeTotal} monthLeft={summary.monthLeft} />
            <CategoryList summary={summary} />
          </>
        )}
      </main>
    </div>
  );
}
