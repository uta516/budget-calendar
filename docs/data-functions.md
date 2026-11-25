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
| | `ensureDefaultCategories()` | カテゴリの配列。0件なら 食費 25000、遊び・飲み会 12000、旅行 12000、交通費 3000、その他 10300 を作ってから返す |
| 支出 | `getExpenses(month)` | その月の支出の配列（新しい日付順）。`month` は `"2026-11"` の形 |
| | `addExpense({ amount, categoryId, eventId?, spentOn? })` | 追加した支出。`spentOn`（`"2026-11-14"` の形）を省略したら今日。`eventId` を渡すとその予定と結びつく（予想と実際の「実際」に入る）。先に自分の予定かを確かめ、見つからなければ「結びつける予定が見つかりませんでした」の Error |
| | `deleteExpense(id)` | なし |
| 目標 | `getGoal()` | 目標。まだ無ければ `null` |
| | `saveGoal({ name, targetAmount, months, savedAmount })` | 保存した目標（1人1つ。無ければ作成、あれば更新） |
| 設定 | `getSettings()` | `{ hourlyWage, nightRate, holidayBonus }`。まだ無ければ初期値（1100・1.25・0） |
| | `saveSettings({ hourlyWage, nightRate, holidayBonus })` | 保存した設定 |
| 予定 | `getEvents(month)` | その月（日本時間）に始まる予定の配列（開始日時の早い順）。`month` は `"2026-11"` の形 |
| | `addEvent({ title, kind, startsAt, endsAt?, estimatedAmount, addToGoogle? })` | 追加した予定 ＋ `google: { added, reason?, message? }`。`addToGoogle` を省略したら true で、**Googleカレンダーにも追加する**。Google に追加できなかったときも Error は投げず、アプリにだけ保存する |
| | `updateEvent(id, { title, kind, startsAt, endsAt?, estimatedAmount })` | 変更した予定。Google とつながっている予定は **Googleカレンダーも変わる** |
| | `deleteEvent(id)` | なし。Google とつながっている予定は **本物の Googleカレンダーからも消える**（その予定に結びついた支出は残り、結びつきだけ外れる） |
| | `syncGoogleCalendar(month)` | `{ added, updated, deleted }`。Googleカレンダーのその月の予定をアプリに同期する（手動の同期。「今すぐ同期」ボタンなど） |
| | `autoSyncCalendar()` | `{ synced, reason?, added, updated, deleted, lastSyncedAt, error?, needsRelogin? }`。前の自動同期から30分以上たっていれば、今月と来月を同期する。**Error を投げない** |

型も import できます：`Income`、`FixedCost`、`Category`、`Expense`、`Goal`、`Settings`、`Event`、`EventKind`、`SyncResult`、`AutoSyncResult`、`NewEventInput`、`AddEventResult`、`GoogleAddResult`、`MissedEvent`、`EventActual`、`ActualsSummary`、`EventActualsResult`、`KindAverage`。

### 予定について

- `kind`（種類）は `drink`（飲み会）／`meal`（食事）／`fun`（遊び）／`trip`（旅行）／`shop`（買い物）／`work`（バイト）／`other`（その他）のどれか。それ以外は Error。一覧は `EVENT_KINDS` で import できる
- `startsAt`・`endsAt` は ISO 形式の文字列（例：`"2026-11-20T19:00:00+09:00"`）。戻り値の `starts_at` は UTC 表記（`...+00:00`）で返ってくるので、表示するときは `new Date(starts_at).toLocaleString("ja-JP")` などで日本時間にする
- `google_event_id` が入っている予定は Googleカレンダーとつながっている予定（Google から読み込んだもの、またはアプリから Google にも追加したもの）。null はアプリだけの予定
- **Googleカレンダーへの書き込み**（addEvent・updateEvent・deleteEvent）の決まり
  - Google に送るのは**タイトルと日時だけ**。予想金額と種類は送らない（お金の情報を Googleカレンダーに出さないため）
  - 終了日時が無い予定は、開始の1時間後を終了として Google に送る（アプリの `ends_at` にも同じ値が入る）
  - 終日の予定（日本時間の 0:00 から、何日か後の 0:00 まで）は、Google にも終日の予定として送る
  - **追加**：Google に追加できなかったとき（連携が切れている、など）も止めずに、アプリにだけ保存する。戻り値の `google.added` が false になり、`google.message`（例：「Googleカレンダーには追加できませんでした（もう一度ログインしてください）」）が入るので、画面に出す。`google.reason` が `"needs-relogin"` ならログインし直しを案内する
  - **変更・削除**：Google が失敗したら、アプリも変えずに Error を投げる（Google とアプリでずれないように）。Google ですでに消えていた予定は、エラーにせずアプリだけ処理する（変更のときは、その予定はアプリだけの予定になる）
  - Google から同期した予定も、タイトルと日時を変えられる（Google 側も同じように変わるので、次の同期で元に戻らない）
  - **削除の前に「Googleカレンダーからも消えます」と確認を出す**（`google_event_id` がある予定は、本物の Googleカレンダーから消えるため）
- `syncGoogleCalendar` の決まり
  - 新しく入る予定は、タイトルから種類と予想金額を入れる（計算担当の `estimateEvent`。例：「サークル飲み会」→ drink・4,000円、「バイト」→ work・0円、当てはまらない「授業」など → other・0円）
  - すでにある予定は、タイトルと日時だけ更新する（ユーザーが直した種類と金額は消さない）。Google でタイトルを変えても、種類と金額は入れ直さない
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

// Googleカレンダーにも追加する（addToGoogle を省略したら true）
const event = await addEvent({
  title: "サークルの飲み会",
  kind: "drink",
  startsAt: "2026-11-20T19:00:00+09:00",
  endsAt: "2026-11-20T22:00:00+09:00",
  estimatedAmount: 4000,
});
if (!event.google.added && event.google.reason !== "not-requested") {
  setNotice(event.google.message); // 「Googleカレンダーには追加できませんでした」（予定はアプリに保存できている）
}

// アプリにだけ追加する
await addEvent({ title: "家計簿の見直し", kind: "other", startsAt: "2026-11-21T10:00:00+09:00", estimatedAmount: 0, addToGoogle: false });

// 変更（Google とつながっていれば Google も変わる）
await updateEvent(event.id, {
  title: "サークルの飲み会",
  kind: "drink",
  startsAt: "2026-11-20T19:00:00+09:00",
  estimatedAmount: 3500,
});

// 削除（Google とつながっていれば、本物の Googleカレンダーからも消える）
if (!event.google_event_id || window.confirm("Googleカレンダーからも消えます。削除しますか？")) {
  await deleteEvent(event.id);
}

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

## 予想と実際（記録し忘れた予定・予想と実際・種類ごとの平均）

予定の「予想金額」と、実際に使った額を比べるための関数です（No.29・34・39 の土台）。中身は `src/lib/supabase/eventActuals.ts`、計算は `eventActualsCore.ts`（テスト付き）。

```ts
import { getMissedEvents, getEventActuals, getKindAverages, linkExpenseToEvent } from "@/lib/supabase";
```

**「実際」は、予定に結びついた支出（`expenses.event_id`）の合計です。** 支出を記録するときに `addExpense({ ..., eventId })` で予定を選んでおかないと、「実際」は空（記録なし）のままになります。支出の日付が予定と別の月でも、結びついていれば数えます。

| 関数 | 戻り値 |
|---|---|
| `getMissedEvents(month?)` | 記録し忘れた予定の配列 `{ eventId, title, kind, date, startsAt, endsAt, estimated }`（開始日時の早い順）。`month` を省略したら今月 |
| `getEventActuals(month?)` | `{ month, events, summary }`。`events` は予定ごとの `{ eventId, title, kind, date, startsAt, ended, estimated, actual, diff, expenseCount, recorded }`、`summary` はまとめ |
| `getKindAverages()` | 種類ごとの `{ kind, average, count, total }`（1回あたりの実際の支出・件数・合計） |
| `linkExpenseToEvent(expenseId, eventId)` | 記録済みの支出を予定に結びつける。`eventId` を `null` にすると結びつきを外す。戻り値は変更後の支出。`addExpense` と同じく、先に自分の予定かを確かめる |

### 記録し忘れた予定（getMissedEvents）
- その月の予定のうち、**もう終わっていて**（終了日時が今より前。終了日時が無い予定は開始日時で判定）、**結びついた支出が1件も無い**もの
- **外すもの**：種類が `work`（バイトは出費ではないため）、**予想金額が0円の予定**（Google から同期した授業や会議などは other・0円で入るので、一覧がそれで埋まらないように）
- 予想金額を入れ直せば（0円 → 1円以上）、一覧に出るようになる

### 予想と実際（getEventActuals）
- `work` の予定は外す。予想金額が0円の予定は入れる（0円の予定に支出を結びつけた場合も見られるように）
- `actual`：結びついた支出の合計（記録が無ければ 0）。`expenseCount`：その件数。`recorded`：1件以上あるか
- `diff`：**実際 − 予想**（プラスなら予想より多く使った）。記録が無い予定は `null`
- `ended`：もう終わっているか（まだ終わっていない予定も一覧に入る）
- `summary`：`{ recordedCount, missedCount, upcomingCount, estimated, actual, diff }`
  - `estimated`・`actual`・`diff` は、**支出が記録されている予定だけ**の合計（記録が無い予定を混ぜると、差が意味を持たないため）
  - `missedCount` は `getMissedEvents` と同じ数え方（予想0円は数えない）

### 種類ごとの実際の平均（getKindAverages）
- もう終わっていて、支出が記録されている予定だけを使う（月は区切らず、過去の予定すべて）。`work` は外す
- `average` は1円単位で四捨五入。並びは種類の順（drink・meal・fun・trip・shop・other）
- 例：飲み会3回で 3,000円・5,500円・4,001円 → `{ kind: "drink", average: 4167, count: 3, total: 12501 }`

### 呼び出し例

```tsx
// 記録し忘れた予定を出し、押したら「記録する」画面へ（その予定の eventId を渡す）
const missed = await getMissedEvents();
missed.map((m) => <li key={m.eventId}>{m.date} {m.title}（予想 {m.estimated.toLocaleString()}円）</li>);

// 新しく記録するとき：予定を選んで eventId を渡す
await addExpense({ amount: 2800, categoryId, eventId: m.eventId });

// もう記録してある支出を、あとから予定に結びつける（外すときは null）
await linkExpenseToEvent(expense.id, m.eventId);

// 予想と実際
const { events, summary } = await getEventActuals();
events.filter((a) => a.recorded).map((a) => `${a.title}：予想 ${a.estimated}円・実際 ${a.actual}円（${a.diff! >= 0 ? "+" : ""}${a.diff}円）`);

// 種類ごとの平均（No.39：予想金額を自動で直すときに使う）
const averages = await getKindAverages();
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
| `weekLeft` | 今週あと使えるお金（予定で使う分も込み） |
| `todayGuide` | 今日の目安（`days` の今日の `guide` と同じ。今日の予定分も込み）。決め方は下の「日ごとの目安の決め方」 |
| `plannedTotal` | 今日〜（日曜と月末の早いほう）の予定で取り分けた額の合計 |
| `normalLeft` | 普段使いに回せる残り（`weekLeft − plannedTotal`。マイナスなら0） |
| `shortage` | 予定分が今週あとを超えた額（足りない額。超えなければ0）。1円以上なら「予定だけで今週の予算を超えています」などを出す |
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
| `guide` | その日の目安（`normal + planned`）。過ぎた日は `null`。**翌月の日は 0**（今日の月の数字だけで計算するため。日付だけ出す） |
| `normal` | その日の普段使いの目安。過ぎた日と翌月の日は `null` |
| `planned` | その日に予定分として取り分けた額。過ぎた日と翌月の日は `null`。work・予想0円・記録済みの予定は入らない |
| `spent` | その日に使った額（今日と同じ月の日だけ。前の月の日は0） |
| `plannedAmount` / `eventCount` | その日の予定の予想金額の合計と件数（work・記録済みの予定も含む。目安の `planned` とは別） |

#### 日ごとの目安の決め方
計算は `src/lib/budget.ts` の `allocateDailyBudget(days, weekLeft, plans)`（計算担当）。summary.ts は、次の3つを用意して渡す。
- `days`：今日〜（その週の日曜と、今日の月の月末の早いほう）。翌月の日は渡さない
- `weekLeft`：今週あと（今までと同じ）
- `plans`：`days` の日に始まる予定のうち、次を外したもの（`{ date, amount }`）
  - 種類が `work`
  - 予想金額が0円
  - 記録済み（`expenses.event_id` で支出が1件でも結びついている。支出の日付が別の月でも記録済み）
  - 今日すでに終わった予定は、記録されていなければ入れる（時刻は見ない）
  - 何日もまたぐ予定は、始まる日の分として数える

`allocateDailyBudget` は、予定分を取り分けた残り（`normalLeft`）を `days` で均等に割って `normal`（10円単位で切り捨て）にし、予定のある日はその予定分を足して `guide` にする。

例：今週あと 6,000円、今日（水）〜日曜の5日、金曜に飲み会 2,000円
→ `plannedTotal` 2,000円・`normalLeft` 4,000円・`normal` 800円 → 今日の目安 800円、金曜の目安 2,800円

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
| `categories` | カテゴリごとの `{ id, name, budget, spent, planned, plannedEvents, left }`（予算・使った額・予定の額・予定の一覧・残り）。下の表 |
| `uncategorizedSpent` | カテゴリなし（カテゴリを削除した）の支出の合計 |
| `uncategorizedPlanned` / `uncategorizedPlannedEvents` | 入れるカテゴリが見つからなかった予定（「その他」も無いとき）の予想金額の合計と、その一覧 |
| `goal` | `{ name, targetAmount, savedAmount, remaining, perMonth }`（目標額・たまった額・あといくら・月にいくら）。目標が無ければ `null` |

`categories` の1件分（`CategorySummary`）：

| 項目 | 意味 |
|---|---|
| `budget` | 月の予算 |
| `spent` | 使った額（モックの緑） |
| `planned` | 予定で使う額（モックのオレンジ）。今日以降でその月の予定の予想金額を、予定の種類からカテゴリに振り分けた合計 |
| `plannedEvents` | そのカテゴリに入った予定 `{ id, title, date, amount }` の一覧（日付の早い順）。予想金額が0円の予定は入れない |
| `left` | 残り（予算 − 使った額 − 予定の額）。マイナスもそのまま |

予定の種類 → カテゴリ（`KIND_TO_CATEGORY` で import できる）：

| 種類 | カテゴリ |
|---|---|
| drink（飲み会）・fun（遊び） | 遊び・飲み会 |
| meal（食事） | 食費 |
| trip（旅行） | 旅行 |
| shop（買い物）・other（その他） | その他 |
| work（バイト） | 数えない |

- カテゴリは名前で探す。名前を変えたなどで見つからなければ「その他」に入れ、「その他」も無ければ `uncategorizedPlanned` に入る
- 対象は今日以降の予定だけ。過去の月を指定すると予定の額は0、来月以降を指定するとその月の予定すべて
- Googleから新しく同期した予定は、タイトルから種類と予想金額が入る（当てはまらないタイトルは other・0円なので数えない）。この決まりより前に同期した予定は other・0円のまま

`perMonth` は（目標額 − たまった額）÷ 月数を1円単位で切り上げた額です。達成したら0になります。

```tsx
const summary = await getBudgetSummary();

// 表示例：遊び・飲み会　使った 2,500円　予定 7,500円（サークル飲み会・映画）　残り 2,000円
summary.categories.map((c) => (
  <p key={c.id}>
    {c.name}　使った {c.spent.toLocaleString()}円
    {c.planned > 0 && `　予定 ${c.planned.toLocaleString()}円（${c.plannedEvents.map((e) => e.title).join("・")}）`}
    　残り {c.left.toLocaleString()}円
  </p>
));

if (summary.goal) console.log(`あと${summary.goal.remaining}円、月に${summary.goal.perMonth}円`);
```

※ カテゴリが0件の人には、先に `ensureDefaultCategories()` を呼んでおく（`getBudgetSummary` はカテゴリを作らない）

## AI の先読みアドバイス（src/lib/ai/advice.ts）

ホームのまとめ（今週あと、今日の目安、予定で使う見込み、これからの予定など）をもとに、AI（Gemini）が短いアドバイスを1〜2文で作ります。

```ts
import { getAdvice } from "@/lib/ai/advice";
```

- `"use client"` のコンポーネントから呼ぶ（AI の鍵はサーバー側だけで使う。`src/lib/ai/gemini.ts` は画面から import しない。import すると build エラーになる）
- **Error は投げない**。失敗も戻り値で返す
- 同じ日・同じデータなら、サーバーに保存したアドバイスを使い回す（AI を呼ばないので速い）。支出や予定が変わったときだけ作り直す
- AI での作り直しは1人1日10回まで（失敗した回も数える）。使い切ったら、決まった文になる
- AI が使えないとき（鍵が無い・失敗・時間切れ・回数の上限）は、決まった文（例：「金曜にサークル飲み会（4,000円）があるので、木曜までは1日1,200円以内がおすすめです。」）を返す

戻り値 `AdviceResult`：

| 項目 | 意味 |
|---|---|
| `advice` | アドバイスの文。取得そのものに失敗したとき（ログインしていないなど）だけ `null` |
| `source` | `"ai"`＝AIで作った、`"fallback"`＝決まった文。取得に失敗したときは `null` |
| `reason` | 決まった文になった理由：`"no-key"`（鍵が無い）、`"limit"`（今日の10回を使い切った）、`"timeout"`（10秒以内に答えなかった）、`"error"`（そのほかの失敗） |
| `cached` | 今日作ったアドバイスを使い回したか |
| `remainingToday` | 今日あと何回 AI で作り直せるか |
| `error` / `needsRelogin` | 取得そのものに失敗したときのメッセージ／再ログインが必要か |

```tsx
const [advice, setAdvice] = useState<string | null>(null);
useEffect(() => {
  getAdvice().then((r) => setAdvice(r.advice)); // Error は投げない
}, []);

{advice && <p>💡 {advice}</p>}
```

- 支出を入れたあとなどに呼び直すと、データが変わっていれば新しいアドバイスになる
- AI で作ったか決まった文かで見た目を変えたいときは、`source` を見る
- AI に何を聞くか（プロンプト）は計算担当の `src/lib/ai/prompts.ts`

## 動作確認ページ

`npm run dev` のあと、ログインして http://localhost:3000/dev/data-check を開き、「すべて試す」を押すと各関数を順に試せます（本番では開けません）。
