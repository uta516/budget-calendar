// うたのデータ関数ができるまでの仮データ。できたら差しかえる。
export const dummyIncomes = [
  { id: 1, name: "仕送り", amount: 52000 },
  { id: 2, name: "バイト", amount: 30800 },
];
export const dummyFixedCosts = [
  { id: 1, name: "スマホ代", amount: 3000 },
  { id: 2, name: "サブスク", amount: 1500 },
  { id: 3, name: "定期代", amount: 6000 },
];
export const dummyCategories = [
  { id: 1, name: "食費", monthly_budget: 25000 },
  { id: 2, name: "遊び・飲み会", monthly_budget: 12000 },
  { id: 3, name: "旅行", monthly_budget: 12000 },
  { id: 4, name: "交通費", monthly_budget: 3000 },
  { id: 5, name: "その他", monthly_budget: 10300 },
];
export const dummyExpenses = [
  { id: 1, category_id: 1, amount: 850, spent_on: "2026-11-12" },
  { id: 2, category_id: 2, amount: 2500, spent_on: "2026-11-10" },
];
export const dummyGoal = { id: 1, name: "春休みの旅行資金", target_amount: 30000, months: 3, saved_amount: 10000 };