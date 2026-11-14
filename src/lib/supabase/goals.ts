import type { Tables } from "@/types/database";
import {
  assertNonNegativeInt,
  assertYen,
  fail,
  getSupabase,
  getUserId,
  requireName,
} from "./helpers";

export type Goal = Tables<"goals">;

export type GoalInput = {
  name: string;
  /** 目標額（円の整数） */
  targetAmount: number;
  /** 何か月で貯めるか */
  months: number;
  /** 今までに貯めた額（円の整数） */
  savedAmount: number;
};

/** 自分の目標。まだ無ければ null */
export async function getGoal(): Promise<Goal | null> {
  const { data, error } = await getSupabase()
    .from("goals")
    .select("*")
    .maybeSingle();
  if (error) fail("目標の読み込みに失敗しました", error);
  return data;
}

/** 目標を保存する（1人1つ。無ければ作成、あれば更新） */
export async function saveGoal({
  name,
  targetAmount,
  months,
  savedAmount,
}: GoalInput): Promise<Goal> {
  const trimmed = requireName(name, "目標の名前");
  assertYen(targetAmount, "目標額");
  assertYen(savedAmount, "貯めた額");
  assertNonNegativeInt(months, "月数");
  if (months === 0) {
    throw new Error("月数は1以上の整数で入力してください");
  }
  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from("goals")
    .upsert(
      {
        user_id: userId,
        name: trimmed,
        target_amount: targetAmount,
        months,
        saved_amount: savedAmount,
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();
  if (error) fail("目標の保存に失敗しました", error);
  return data;
}
