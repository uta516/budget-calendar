<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
# プロジェクトのルール
- 技術：Next.js（App Router）、TypeScript、Tailwind、Supabase、FullCalendar、Vitest
- 金額はすべて「円の整数」で扱う
- データの型は src/types/database.ts を使う（手で書き換えない）
- 担当外のファイルは変更しない
  - 画面：src/app の各ページ、src/components
  - データ・連携：src/lib/supabase、src/lib/summary.ts、src/app/api/calendar、src/app/login、src/app/auth、src/app/dev、src/proxy.ts、supabase/、docs/data-functions.md
  - 計算：src/lib/budget.ts、テスト、src/app/api/ai
- 計算処理は src/lib/budget.ts に書き、必ずテストを付ける
- APIキーなどの秘密はコードに書かず、環境変数を使う

## プルリクエスト
- main に直接 push しない。必ずブランチを作り、PRを出す
- ブランチ名は feature/〇〇（機能）、fix/〇〇（修正）、chore/〇〇（設定など）
- PRの本文は .github/pull_request_template.md の形に従って、全項目を埋める
- PRは1つの機能（ユーザーストーリー1〜3個）ごとに小さく出す
- PRのユーザーストーリー番号は docs/user-stories.md を見て No.〇 の形で書く。作業が終わったら状態を更新する
- 他の1人以上が確認してから main に入れる

## 計算の関数（src/lib/budget.ts）
中間発表までは、予定のことは考えない単純な版にする。

| 関数 | 意味 | 決まり |
|---|---|---|
| freeMoney(収入合計, 固定費合計, 貯金) | 今月自由に使えるお金 | 収入 − 固定費 − 貯金。マイナスなら0 |
| monthLeft(自由に使えるお金, 今月使った額) | 今月あと使えるお金 | 引き算。マイナスもそのまま返す |
| weekBudget(自由に使えるお金, 今日の日付) | 今週の予算 | 自由に使えるお金 ÷ その月の日数 × 7。10円単位で切り捨て |
| weekLeft(今週の予算, 今週使った額) | 今週あと使えるお金 | 引き算。マイナスもそのまま返す |
| todayGuide(今週あと, 今日の日付) | 今日の目安 | 今週あと ÷ 日曜までの残り日数（今日を含む）。10円単位で切り捨て。マイナスなら0 |
| categoryLeft(カテゴリの予算, そのカテゴリで使った額) | カテゴリ別の残り | 引き算。マイナスもそのまま返す |

- 週は月曜はじまり
- 月をまたぐ週は、今日がある月の数字で計算する
- 金額は円の整数で扱う

## データの関数（src/lib/supabase/）
使い方と呼び出し例は docs/data-functions.md を見る。`import { ... } from "@/lib/supabase"` で、"use client" のコンポーネントから呼ぶ。
- 収入：getIncomes、addIncome(name, amount)、updateIncome(id, name, amount)、deleteIncome(id)
- 固定費：getFixedCosts、addFixedCost(name, amount)、updateFixedCost(id, name, amount)、deleteFixedCost(id)
- カテゴリ：getCategories、addCategory(name, monthlyBudget)、updateCategory(id, name, monthlyBudget)、deleteCategory(id)、ensureDefaultCategories()
- 支出：getExpenses("2026-11")、addExpense({ amount, categoryId, eventId?, spentOn? })、deleteExpense(id)
- 目標：getGoal()（無ければ null）、saveGoal({ name, targetAmount, months, savedAmount })（1人1つ）
- 設定：getSettings()（無ければ初期値）、saveSettings({ hourlyWage, nightRate, holidayBonus })
- 予定：getEvents("2026-11")、addEvent({ title, kind, startsAt, endsAt?, estimatedAmount })、updateEvent(id, { 同じ形 })、deleteEvent(id)、syncGoogleCalendar("2026-11")（Googleカレンダーのその月の予定を同期し、{ added, updated, deleted } を返す）
- まとめ（src/lib/summary.ts）：getHomeSummary(today?)（ホーム画面の数字）、getBudgetSummary(month?)（予算画面の数字）。`import { ... } from "@/lib/summary"`
- 失敗したときは日本語のメッセージの Error を投げる
- これらができるまで、画面は src/lib/dummy.ts の仮データを使う

## 中間発表ToDo（Issue #11）
- PRを作ったら、このPRで終わった項目を Issue #11 でチェックする
- やり方：
  1. 書きかえる直前に gh issue view 11 --json body で最新の本文を取る
  2. 終わった項目の行だけ「- [ ]」を「- [x]」にし、行の最後に「（PR #番号）」を足す
  3. ほかの行は1文字も変えない
  4. gh issue edit 11 --body-file で保存する
- どの項目が終わったか分からないときは、チェックせずに PR の本文で聞く
- PRの本文の最後に「Issue #11 でチェックした項目」を書く