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
| | `syncGoogleCalendar(month)` | `{ added, updated, deleted }`。Googleカレンダーのその月の予定をアプリに同期する（手動の同期。「今すぐ同期」ボタンなど） |
| | `autoSyncCalendar()` | `{ synced, reason?, added, updated, deleted, lastSyncedAt, error?, needsRelogin? }`。前の自動同期から30分以上たっていれば、今月と来月を同期する。**Error を投げない** |

型も import できます：`Income`、`FixedCost`、`Category`、`Expense`、`Goal`、`Settings`、`Event`、`EventKind`、`SyncResult`、`AutoSyncResult`。

### 予定について

- `kind`（種類）は `drink`（飲み会）／`meal`（食事）／`fun`（遊び）／`trip`（旅行）／`shop`（買い物）／`work`（バイト）／`other`（その他）のどれか。それ以外は Error。一覧は `EVENT_KINDS` で import できる
- `startsAt`・`endsAt` は ISO 形式の文字列（例：`"2026-11-20T19:00:00+09:00"`）。戻り値の `starts_at` は UTC 表記（`...+00:00`）で返ってくるので、表示するときは `new Date(starts_at).toLocaleString("ja-JP")` などで日本時間にする
- `google_event_id` が入っている予定は Googleカレンダーから読み込んだもの、null は手入力の予定
- `syncGoogleCalendar` の決まり
  - 新しく入る予定は `kind: "other"`、`estimated_amount: 0`
  - すでにある予定は、タイトルと日時だけ更新する（ユーザーが直した種類と金額は消さない）
  - Googleで消された予定は、アプリでも消える
  - 「もう一度ログインしてください」の Error が出たら、ログアウトしてログインし直してもらう
- 自動同期（`autoSyncCalendar`）の決まり
  - **ホームとカレンダーを開いたときに呼ぶ**。前の自動同期から30分たっていなければ、何もせずにすぐ返る（30分の判定はサーバー側なので、何度呼んでもよい）
  - 同期するのは今月と来月（日本時間）。決まりは `syncGoogleCalendar` と同じ
  - ログインした直後にも、今月と来月を自動で同期している（8秒を超えたら打ち切ってホームに移動し、ホームを開いたときの自動同期でやり直す）
  - 失敗しても Error は投げず、`synced: false, reason: "error", error: "…"` を返す。`needsRelogin` が true なら、ログインし直してもらう
  - 同期したあとは、`getEvents` や `getHomeSummary` を読み直すと新しい予定が反映される
  - 最後に自動同期した時刻は `lastSyncedAt`（google_tokens.last_synced_at）。手動の `syncGoogleCalendar` では変わらない
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

// 「今すぐ同期」ボタンなどで、指定した月を同期する
const { added, updated, deleted } = await syncGoogleCalendar("2026-11");
```

### 自動同期（ホーム・カレンダーを開いたとき）

```tsx
useEffect(() => {
  (async () => {
    const result = await autoSyncCalendar(); // Error は投げない
    if (result.needsRelogin) {
      setMessage("Googleカレンダーと連携するため、もう一度ログインしてください");
    } else if (result.synced && result.added + result.updated + result.deleted > 0) {
      setHome(await getHomeSummary()); // 予定が変わったので読み直す
    }
  })();
}, []);
```

### エラーの受け取り方

```ts
try {
  await addExpense({ amount: Number(input), categoryId });
} catch (e) {
  setError((e as Error).message); // 例：「金額は0以上の整数（円）で入力してください」
}
```

## まとめの関数（src/lib/summary.ts）

データを読み込み、`src/lib/budget.ts` の計算までして、**画面がそのまま表示できる数字**を返す関数です。画面では、収入や支出を自分で合計したり、budget.ts を呼んだりしなくて大丈夫です。

```ts
import { getHomeSummary, getBudgetSummary } from "@/lib/summary";
```

- `"use client"` のコンポーネントから呼ぶ（中でデータの関数を使うため）
- 金額はすべて円の整数。データが0件でもエラーにせず、0円で返す
- 日付は日本時間、週は月曜はじまり
- 目標がある場合は、目標の「月にいくら」を貯金として引いてから、自由に使えるお金を計算する
- 型も import できる：`HomeSummary`、`DayGuide`、`UpcomingEvent`、`BudgetSummary`、`CategorySummary`、`GoalSummary`

### getHomeSummary(today?) … ホーム画面

`today`（Date）を省略したら今。戻り値 `HomeSummary`：

| 項目 | 意味 |
|---|---|
| `today` / `month` | 今日 `"2026-11-18"`、今月 `"2026-11"`（日本時間） |
| `freeMoney` | 今月自由に使えるお金（収入 − 固定費 − 目標の月の貯金） |
| `monthLeft` | 今月あと使えるお金 |
| `weekBudget` | 今週の予算 |
| `weekSpent` | 今週使った額（今週のうち、今日と同じ月の日の分だけ） |
| `weekLeft` | 今週あと使えるお金 |
| `todayGuide` | 今日の目安 |
| `plannedUntilMonthEnd` | `{ amount, count }`：今日から月末までの予定の予想金額の合計と件数 |
| `dailyMoney` | 普段使いに回せるお金（今月あと − 予定で使う見込み。マイナスもそのまま） |
| `days` | 今週（月〜日）の7日分。下の表 |
| `upcomingEvents` | これからの予定（今日以降、近い順に最大3件）：`{ id, title, kind, startsAt, date, estimatedAmount }` |

`days` の1日分（`DayGuide`）：

| 項目 | 意味 |
|---|---|
| `date` / `weekday` | `"2026-11-18"` / `"水"` |
| `isToday` / `isPast` | 今日か、今日より前か |
| `inMonth` | 今日と同じ月の日か（月をまたぐ週で、前後の月の日は false。灰色にするなどに使う） |
| `guide` | その日の目安。過ぎた日は `null`。今は今日以降の日を均等に割った額（予定を考えた計算ができたら変わる） |
| `spent` | その日に使った額（今日と同じ月の日だけ。前の月の日は0） |
| `plannedAmount` / `eventCount` | その日の予定の予想金額の合計と件数 |

```tsx
const [home, setHome] = useState<HomeSummary | null>(null);
useEffect(() => {
  getHomeSummary().then(setHome).catch((e: Error) => setError(e.message));
}, []);

// 表示例
<p>今週あと {home.weekLeft.toLocaleString()}円</p>
<p>今日の目安 {home.todayGuide.toLocaleString()}円</p>
{home.days.map((d) => (
  <span key={d.date}>{d.weekday} {d.guide === null ? "−" : `${d.guide}円`}</span>
))}
```

### getBudgetSummary(month?) … 予算画面

`month`（`"2026-11"`）を省略したら今月。戻り値 `BudgetSummary`：

| 項目 | 意味 |
|---|---|
| `month` | `"2026-11"` |
| `incomeTotal` | 収入の合計 |
| `monthLeft` | その月あと使えるお金 |
| `categories` | カテゴリごとの `{ id, name, budget, spent, planned, left }`（予算・使った額・予定の額・残り）。`planned` は、予定とカテゴリを結びつけるまでは0。`left` はマイナスもそのまま |
| `uncategorizedSpent` | カテゴリなし（カテゴリを削除した）の支出の合計 |
| `goal` | `{ name, targetAmount, savedAmount, remaining, perMonth }`（目標額・たまった額・あといくら・月にいくら）。目標が無ければ `null` |

`perMonth` は（目標額 − たまった額）÷ 月数を1円単位で切り上げた額です。達成したら0になります。

```ts
const summary = await getBudgetSummary();
summary.categories.forEach((c) => console.log(c.name, c.left));
if (summary.goal) console.log(`あと${summary.goal.remaining}円、月に${summary.goal.perMonth}円`);
```

※ カテゴリが0件の人には、先に `ensureDefaultCategories()` を呼んでおく（`getBudgetSummary` はカテゴリを作らない）

## 動作確認ページ

`npm run dev` のあと、ログインして http://localhost:3000/dev/data-check を開き、「すべて試す」を押すと各関数を順に試せます（本番では開けません）。
