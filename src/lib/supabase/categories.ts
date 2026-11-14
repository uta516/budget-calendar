import type { Tables } from "@/types/database";
import {
  assertFound,
  assertYen,
  fail,
  getSupabase,
  getUserId,
  requireName,
} from "./helpers";

export type Category = Tables<"categories">;

/** カテゴリが0件のときに作る初期カテゴリ（月の予算・円） */
export const DEFAULT_CATEGORIES = [
  { name: "食費", monthlyBudget: 25000 },
  { name: "交際費", monthlyBudget: 12000 },
  { name: "旅行", monthlyBudget: 12000 },
  { name: "交通費", monthlyBudget: 3000 },
  { name: "その他", monthlyBudget: 10300 },
] as const;

/** カテゴリの一覧（古い順） */
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await getSupabase()
    .from("categories")
    .select("*")
    .order("id");
  if (error) fail("カテゴリの読み込みに失敗しました", error);
  return data;
}

/** カテゴリを追加する */
export async function addCategory(
  name: string,
  monthlyBudget: number,
): Promise<Category> {
  const trimmed = requireName(name, "カテゴリ名");
  assertYen(monthlyBudget, "月の予算");
  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from("categories")
    .insert({ user_id: userId, name: trimmed, monthly_budget: monthlyBudget })
    .select()
    .single();
  if (error) fail("カテゴリの追加に失敗しました", error);
  return data;
}

/** カテゴリを変更する */
export async function updateCategory(
  id: number,
  name: string,
  monthlyBudget: number,
): Promise<Category> {
  const trimmed = requireName(name, "カテゴリ名");
  assertYen(monthlyBudget, "月の予算");
  const { data, error } = await getSupabase()
    .from("categories")
    .update({ name: trimmed, monthly_budget: monthlyBudget })
    .eq("id", id)
    .select();
  if (error) fail("カテゴリの変更に失敗しました", error);
  return assertFound(data);
}

/** カテゴリを削除する（そのカテゴリの支出は「カテゴリなし」になる） */
export async function deleteCategory(id: number): Promise<void> {
  const { data, error } = await getSupabase()
    .from("categories")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) fail("カテゴリの削除に失敗しました", error);
  assertFound(data);
}

/** カテゴリが0件なら初期カテゴリを作る。最後にカテゴリの一覧を返す */
export async function ensureDefaultCategories(): Promise<Category[]> {
  const current = await getCategories();
  if (current.length > 0) return current;

  const userId = await getUserId();
  const { data, error } = await getSupabase()
    .from("categories")
    .insert(
      DEFAULT_CATEGORIES.map((c) => ({
        user_id: userId,
        name: c.name,
        monthly_budget: c.monthlyBudget,
      })),
    )
    .select()
    .order("id");
  if (error) fail("初期カテゴリの作成に失敗しました", error);
  return data;
}
