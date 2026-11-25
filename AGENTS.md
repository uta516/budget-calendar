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
  - データ・連携：src/lib/supabase（src/lib/supabase の中のテストを含む）、src/lib/summary.ts、src/lib/summary.test.ts、src/lib/ai（prompts.ts を除く。Gemini を呼ぶ仕組み）、src/app/api/ai、src/app/api/calendar、src/app/login、src/app/auth、src/app/dev、src/proxy.ts、supabase/、docs/data-functions.md
  - 計算：src/lib/budget.ts、テスト、src/lib/ai/prompts.ts（AI に何を聞くか）
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
ホームの今日の目安・日ごとの目安は、予定分を取り分ける allocateDailyBudget で出す（todayGuide はホームでは使っていない）。

| 関数 | 意味 | 決まり |
|---|---|---|
| freeMoney(収入合計, 固定費合計, 貯金) | 今月自由に使えるお金 | 収入 − 固定費 − 貯金。マイナスなら0 |
| monthLeft(自由に使えるお金, 今月使った額) | 今月あと使えるお金 | 引き算。マイナスもそのまま返す |
| weekBudget(自由に使えるお金, 今日の日付) | 今週の予算 | 自由に使えるお金 ÷ その月の日数 × 7。10円単位で切り捨て |
| weekLeft(今週の予算, 今週使った額) | 今週あと使えるお金 | 引き算。マイナスもそのまま返す |
| todayGuide(今週あと, 今日の日付) | 今日の目安（予定を考えない版。ホームでは使っていない） | 今週あと ÷ 日曜までの残り日数（今日を含む）。10円単位で切り捨て。マイナスなら0 |
| categoryLeft(カテゴリの予算, そのカテゴリで使った額) | カテゴリ別の残り | 引き算。マイナスもそのまま返す |
| allocateDailyBudget(対象日, 今週あと, 予定) | 日ごとの目安（予定分込み） | 予定分を取り分けた残り（マイナスなら0）を対象日で均等に割り、10円単位で切り捨てて普段分にする。予定のある日は予定分を足す。足りない額も返す |
| estimateEvent(タイトル) | 予定の種類と予想金額 | タイトルの言葉で種類を決め、種類ごとの仮の金額を返す。複数の種類に当てはまるか、どれにも当てはまらなければ other・0円 |

- ホーム（summary.ts）が allocateDailyBudget に渡すもの：対象日は今日〜（日曜と月末の早いほう）。予定は対象日に始まるもののうち、work・予想0円・記録済み（event_id で支出が結びついている）を外したもの。何日もまたぐ予定は始まる日の分。翌月の日の目安は0
- Google 同期は、新しく保存する予定にだけ estimateEvent で種類と予想金額を入れる。すでにある予定の種類・金額は変えない

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
- 予定：getEvents("2026-11")、addEvent({ title, kind, startsAt, endsAt?, estimatedAmount, addToGoogle? })（addToGoogle の省略時は true で Googleカレンダーにも追加。Google に追加できなくても Error は投げず、戻り値の google.added で分かる）、updateEvent(id, { title, kind, startsAt, endsAt?, estimatedAmount })・deleteEvent(id)（Google とつながっている予定は Google も変更・削除する。Google が失敗したらアプリも変えずに Error）。追加・変更・削除とも Google を待つのは8秒まで（CALENDAR_WRITE_TIMEOUT_MS で変えられる。時間切れは、追加なら google.added が false、変更・削除なら Error）、syncGoogleCalendar("2026-11")（Googleカレンダーのその月の予定を同期し、{ added, updated, deleted } を返す）、autoSyncCalendar()（ホーム・カレンダーを開いたときに呼ぶ。前の自動同期から30分以上たっていれば今月と来月を同期する。Error は投げず、結果を戻り値で返す）
- 予想と実際：getMissedEvents(month?)（記録し忘れた予定。終わっていて結びついた支出が無いもの。work と予想0円は外す）、getEventActuals(month?)（予定ごとの予想・実際・差とまとめ）、getKindAverages()（種類ごとの実際の平均）、linkExpenseToEvent(expenseId, eventId | null)（記録済みの支出を予定に結びつける・外す）。「実際」は expenses.event_id で結びついた支出の合計なので、支出を記録するときは addExpense に eventId を渡す
- まとめ（src/lib/summary.ts）：getHomeSummary(today?)（ホーム画面の数字。予定分込みの日ごとの目安と plannedTotal・normalLeft・shortage も返す）、getBudgetSummary(month?)（予算画面の数字）。`import { ... } from "@/lib/summary"`
- AI（src/lib/ai/advice.ts）：getAdvice()（先読みアドバイス1〜2文。Error は投げず、AIで作ったか決まった文かも返す）。`import { getAdvice } from "@/lib/ai/advice"`。src/lib/ai/gemini.ts はサーバー専用なので画面から import しない
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