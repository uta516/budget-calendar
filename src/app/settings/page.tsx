"use client";

import { useEffect, useState } from "react";
import {
  addFixedCost,
  addIncome,
  deleteFixedCost,
  deleteIncome,
  getFixedCosts,
  getGoal,
  getIncomes,
  getSettings,
  saveGoal,
  saveSettings,
  updateFixedCost,
  updateIncome,
  type GoalInput,
  type Settings,
} from "@/lib/supabase";
import SettingsView from "@/components/settings/SettingsView";
import type { MoneyItem } from "@/components/settings/MoneyItemRow";

type Loaded = {
  incomes: MoneyItem[];
  fixedCosts: MoneyItem[];
  goal: GoalInput | null;
  settings: Settings;
};

export default function SettingsPage() {
  const [data, setData] = useState<Loaded | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getIncomes(), getFixedCosts(), getGoal(), getSettings()])
      .then(([incomes, fixedCosts, goal, settings]) =>
        setData({
          incomes,
          fixedCosts,
          goal: goal && {
            name: goal.name,
            targetAmount: goal.target_amount,
            months: goal.months,
            savedAmount: goal.saved_amount,
          },
          settings,
        }),
      )
      .catch((e: Error) => setLoadError(e.message));
  }, []);

  /** 収入・固定費は、変えたあとに一覧を読み直す */
  async function reloadIncomes() {
    const incomes = await getIncomes();
    setData((d) => d && { ...d, incomes });
  }
  async function reloadFixedCosts() {
    const fixedCosts = await getFixedCosts();
    setData((d) => d && { ...d, fixedCosts });
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-100">
      <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pb-8 pt-5">
        <h1 className="text-center font-bold">設定</h1>

        {loadError ? (
          <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700" role="alert">
            {loadError}
          </p>
        ) : !data ? (
          <p className="text-center text-sm text-zinc-500">読み込み中…</p>
        ) : (
          <SettingsView
            incomes={data.incomes}
            fixedCosts={data.fixedCosts}
            goal={data.goal}
            settings={data.settings}
            incomeActions={{
              add: async (name, amount) => {
                await addIncome(name, amount);
                await reloadIncomes();
              },
              update: async (id, name, amount) => {
                await updateIncome(id, name, amount);
                await reloadIncomes();
              },
              remove: async (id) => {
                await deleteIncome(id);
                await reloadIncomes();
              },
            }}
            fixedCostActions={{
              add: async (name, amount) => {
                await addFixedCost(name, amount);
                await reloadFixedCosts();
              },
              update: async (id, name, amount) => {
                await updateFixedCost(id, name, amount);
                await reloadFixedCosts();
              },
              remove: async (id) => {
                await deleteFixedCost(id);
                await reloadFixedCosts();
              },
            }}
            onSaveGoal={async (goal) => {
              await saveGoal(goal);
            }}
            onSaveSettings={async (settings) => {
              await saveSettings(settings);
            }}
          />
        )}
      </main>
    </div>
  );
}
