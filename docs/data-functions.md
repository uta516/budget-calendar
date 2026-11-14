# データの関数の使い方（画面担当向け）

Supabase のデータを読み書きする関数です。中身は `src/lib/supabase/` にあります。

## 基本のルール

- **`"use client"` のコンポーネントから呼ぶ**（ブラウザ用の Supabase クライアントを使うため）
- import はまとめて 1か所から：

  ```ts
  import { getIncomes, addIncome } from "@/lib/supabase";
  ```

- 関数はすべて `async`。`await` で結果を受け取る
- **金額は円の整数**。小数やマイナスを渡すと Error になる
- **失敗したら日本語のメッセージで Error を投げる**。`try/catch` で受け取り、`error.message` をそのまま画面に出してよい
- 自分のデータしか読み書きできない（ログイン中のユーザーのものだけ）
- 戻り値の行は DB の列名のまま（`monthly_budget`、`spent_on` など、`src/lib/dummy.ts` と同じ形）。引数はキャメルケース（`monthlyBudget` など）

## 関数の一覧

| 種類 | 関数 | 戻り値 |
|---|---|---|
| 収入 | `getIncomes()` | 収入の配列（古い順） |
| | `addIncome(name, amount)` | 追加した収入 |
| | `updateIncome(id, name, amount)` | 変更した収入 |
| | `deleteIncome(id)` | なし |
| 固定費 | `getFixedCosts()` | 固定費の配列（古い順） |
| | `addFixedCost(name, amount)` | 追加した固定費 |
| | `updateFixedCost(id, name, amount)` | 変更した固定費 |
| | `deleteFixedCost(id)` | なし |
| カテゴリ | `getCategories()` | カテゴリの配列（古い順） |
| | `addCategory(name, monthlyBudget)` | 追加したカテゴリ |
| | `updateCategory(id, name, monthlyBudget)` | 変更したカテゴリ |
| | `deleteCategory(id)` | なし（そのカテゴリの支出は「カテゴリなし」になる） |
| | `ensureDefaultCategories()` | カテゴリの配列。0件なら 食費25000・交際費12000・旅行12000・交通費3000・その他10300 を作ってから返す |
| 支出 | `getExpenses(month)` | その月の支出の配列（新しい日付順）。`month` は `"2026-11"` の形 |
| | `addExpense({ amount, categoryId, eventId?, spentOn? })` | 追加した支出。`spentOn`（`"2026-11-14"` の形）を省略したら今日 |
| | `deleteExpense(id)` | なし |
| 目標 | `getGoal()` | 目標。まだ無ければ `null` |
| | `saveGoal({ name, targetAmount, months, savedAmount })` | 保存した目標（1人1つ。無ければ作成、あれば更新） |
| 設定 | `getSettings()` | `{ hourlyWage, nightRate, holidayBonus }`。まだ無ければ初期値（1100・1.25・0） |
| | `saveSettings({ hourlyWage, nightRate, holidayBonus })` | 保存した設定 |
| 予定 | `getEvents(month)` | その月（日本時間）に始まる予定の配列（開始日時の早い順）。`month` は `"2026-11"` の形 |
| | `addEvent({ title, kind, startsAt, endsAt?, estimatedAmount })` | 追加した予定（手入力の予定） |
| | `updateEvent(id, { title, kind, startsAt, endsAt?, estimatedAmount })` | 変更した予定 |
| | `deleteEvent(id)` | なし（その予定に結びついた支出は残り、結びつきだけ外れる） |
| | `syncGoogleCalendar(month)` | `{ added, updated, deleted }`。Googleカレンダーのその月の予定をアプリに同期する |

型も import できます：`Income`、`FixedCost`、`Category`、`Expense`、`Goal`、`Settings`、`Event`、`EventKind`、`SyncResult`。

### 予定について

- `kind`（種類）は `drink`（飲み会）／`meal`（食事）／`fun`（遊び）／`trip`（旅行）／`shop`（買い物）／`work`（バイト）／`other`（その他）のどれか。それ以外は Error。一覧は `EVENT_KINDS` で import できる
- `startsAt`・`endsAt` は ISO 形式の文字列（例：`"2026-11-20T19:00:00+09:00"`）。戻り値の `starts_at` は UTC 表記（`...+00:00`）で返ってくるので、表示するときは `new Date(starts_at).toLocaleString("ja-JP")` などで日本時間にする
- `google_event_id` が入っている予定は Googleカレンダーから読み込んだもの、null は手入力の予定
- `syncGoogleCalendar` の決まり
  - 新しく入る予定は `kind: "other"`、`estimated_amount: 0`
  - すでにある予定は、タイトルと日時だけ更新する（ユーザーが直した種類と金額は消さない）
  - Googleで消された予定は、アプリでも消える
  - 「もう一度ログインしてください」の Error が出たら、ログアウトしてログインし直してもらう
- 終日の予定は、その日の 0:00（日本時間）に始まり、翌日の 0:00 に終わる予定として入る

## 呼び出し例

### 画面での基本の形

```tsx
"use client";

import { useEffect, useState } from "react";
import { getIncomes, type Income } from "@/lib/supabase";

export default function IncomeList() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getIncomes()
      .then(setIncomes)
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  return (
    <ul>
      {incomes.map((i) => (
        <li key={i.id}>{i.name}：{i.amount.toLocaleString()}円</li>
      ))}
    </ul>
  );
}
```

### 収入

```ts
const incomes = await getIncomes();
const income = await addIncome("バイト", 30800);
await updateIncome(income.id, "バイト（11月）", 32000);
await deleteIncome(income.id);
```

### 固定費

```ts
const costs = await getFixedCosts();
const cost = await addFixedCost("スマホ代", 3000);
await updateFixedCost(cost.id, "スマホ代", 3300);
await deleteFixedCost(cost.id);
```

### カテゴリ

```ts
// 初めて開いた画面では、これを呼べば必ずカテゴリがある状態になる
const categories = await ensureDefaultCategories();

const all = await getCategories();
const category = await addCategory("推し活", 5000);
await updateCategory(category.id, "推し活", 8000);
await deleteCategory(category.id);
```

### 支出

```ts
const expenses = await getExpenses("2026-11");

// 日付を省略すると今日
const expense = await addExpense({ amount: 850, categoryId: 1 });
// 日付と予定を指定する場合
await addExpense({ amount: 2500, categoryId: 2, eventId: 10, spentOn: "2026-11-10" });

await deleteExpense(expense.id);
```

### 目標

```ts
const goal = await getGoal(); // 無ければ null
await saveGoal({ name: "春休みの旅行資金", targetAmount: 30000, months: 3, savedAmount: 10000 });
```

### 設定

```ts
const settings = await getSettings(); // 無ければ { hourlyWage: 1100, nightRate: 1.25, holidayBonus: 0 }
await saveSettings({ ...settings, hourlyWage: 1200 });
```

### 予定

```ts
const events = await getEvents("2026-11");

const event = await addEvent({
  title: "サークルの飲み会",
  kind: "drink",
  startsAt: "2026-11-20T19:00:00+09:00",
  endsAt: "2026-11-20T22:00:00+09:00",
  estimatedAmount: 4000,
});
await updateEvent(event.id, {
  title: "サークルの飲み会",
  kind: "drink",
  startsAt: "2026-11-20T19:00:00+09:00",
  estimatedAmount: 3500,
});
await deleteEvent(event.id);

// Googleカレンダーの今月の予定を読み込む（カレンダー画面を開いたときなど）
const { added, updated, deleted } = await syncGoogleCalendar("2026-11");
```

### エラーの受け取り方

```ts
try {
  await addExpense({ amount: Number(input), categoryId });
} catch (e) {
  setError((e as Error).message); // 例：「金額は0以上の整数（円）で入力してください」
}
```

## 動作確認ページ

`npm run dev` のあと、ログインして http://localhost:3000/dev/data-check を開き、「すべて試す」を押すと各関数を順に試せます（本番では開けません）。
