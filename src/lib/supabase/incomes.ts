import type { Tables } from "@/types/database";
import {
  assertFound,
  assertYen,
  fail,
  getSupabase,
  type DataClient,
  getUserId,
  requireName,
} from "./helpers";

export type Income = Tables<"incomes">;

/** 収入の一覧（古い順） */
export async function getIncomes(client?: DataClient): Promise<Income[]> {
  const { data, error } = await getSupabase(client)
    .from("incomes")
    .select("*")
    .order("id");
  if (error) fail("収入の読み込みに失敗しました", error);
  return data;
}

/** 収入を追加する */
export async function addIncome(name: string, amount: number): Promise<Income> {
  const trimmed = requireName(name);
  assertYen(amount);
  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from("incomes")
    .insert({ user_id: userId, name: trimmed, amount })
    .select()
    .single();
  if (error) fail("収入の追加に失敗しました", error);
  return data;
}

/** 収入を変更する */
export async function updateIncome(
  id: number,
  name: string,
  amount: number,
): Promise<Income> {
  const trimmed = requireName(name);
  assertYen(amount);
  const { data, error } = await getSupabase()
    .from("incomes")
    .update({ name: trimmed, amount })
    .eq("id", id)
    .select();
  if (error) fail("収入の変更に失敗しました", error);
  return assertFound(data);
}

/** 収入を削除する */
export async function deleteIncome(id: number): Promise<void> {
  const { data, error } = await getSupabase()
    .from("incomes")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail("収入の削除に失敗しました", error);
  assertFound(data);
}
