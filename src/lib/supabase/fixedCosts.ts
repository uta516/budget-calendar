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

export type FixedCost = Tables<"fixed_costs">;

/** 固定費の一覧（古い順） */
export async function getFixedCosts(client?: DataClient): Promise<FixedCost[]> {
  const { data, error } = await getSupabase(client)
    .from("fixed_costs")
    .select("*")
    .order("id");
  if (error) fail("固定費の読み込みに失敗しました", error);
  return data;
}

/** 固定費を追加する */
export async function addFixedCost(
  name: string,
  amount: number,
): Promise<FixedCost> {
  const trimmed = requireName(name);
  assertYen(amount);
  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from("fixed_costs")
    .insert({ user_id: userId, name: trimmed, amount })
    .select()
    .single();
  if (error) fail("固定費の追加に失敗しました", error);
  return data;
}

/** 固定費を変更する */
export async function updateFixedCost(
  id: number,
  name: string,
  amount: number,
): Promise<FixedCost> {
  const trimmed = requireName(name);
  assertYen(amount);
  const { data, error } = await getSupabase()
    .from("fixed_costs")
    .update({ name: trimmed, amount })
    .eq("id", id)
    .select();
  if (error) fail("固定費の変更に失敗しました", error);
  return assertFound(data);
}

/** 固定費を削除する */
export async function deleteFixedCost(id: number): Promise<void> {
  const { data, error } = await getSupabase()
    .from("fixed_costs")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail("固定費の削除に失敗しました", error);
  assertFound(data);
}
