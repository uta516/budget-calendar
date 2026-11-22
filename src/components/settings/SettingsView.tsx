"use client";

import type { GoalInput, Settings } from "@/lib/supabase";
import AccountCard from "./AccountCard";
import GoalForm from "./GoalForm";
import MoneyListCard from "./MoneyListCard";
import type { MoneyItem } from "./MoneyItemRow";
import WageForm from "./WageForm";

export type ListActions = {
  add: (name: string, amount: number) => Promise<void>;
  update: (id: number, name: string, amount: number) => Promise<void>;
  remove: (id: number) => Promise<void>;
};

type Props = {
  incomes: MoneyItem[];
  fixedCosts: MoneyItem[];
  goal: GoalInput | null;
  settings: Settings;
  incomeActions: ListActions;
  fixedCostActions: ListActions;
  onSaveGoal: (goal: GoalInput) => Promise<void>;
  onSaveSettings: (settings: Settings) => Promise<void>;
};

// 設定画面の中身（データの読み書きはページ側で渡す）
export default function SettingsView({
  incomes,
  fixedCosts,
  goal,
  settings,
  incomeActions,
  fixedCostActions,
  onSaveGoal,
  onSaveSettings,
}: Props) {
  return (
    <>
      <MoneyListCard
        label="収入"
        totalLabel="毎月の合計"
        namePlaceholder="例：仕送り"
        items={incomes}
        onAdd={incomeActions.add}
        onUpdate={incomeActions.update}
        onDelete={incomeActions.remove}
      />
      <MoneyListCard
        label="固定費"
        totalLabel="毎月の合計"
        namePlaceholder="例：スマホ代"
        items={fixedCosts}
        onAdd={fixedCostActions.add}
        onUpdate={fixedCostActions.update}
        onDelete={fixedCostActions.remove}
      />
      <GoalForm initial={goal} onSave={onSaveGoal} />
      <WageForm initial={settings} onSave={onSaveSettings} />
      <AccountCard />
    </>
  );
}
