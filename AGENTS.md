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
  - データ：src/lib/supabase、src/app/api/calendar、supabase/
  - 計算：src/lib/budget.ts、テスト、src/app/api/ai
- 計算処理は src/lib/budget.ts に書き、必ずテストを付ける
- APIキーなどの秘密はコードに書かず、環境変数を使う

## プルリクエスト
- main に直接 push しない。必ずブランチを作り、PRを出す
- ブランチ名は feature/〇〇（機能）、fix/〇〇（修正）、chore/〇〇（設定など）
- PRの本文は .github/pull_request_template.md の形に従って、全項目を埋める
- PRは1つの機能（ユーザーストーリー1〜3個）ごとに小さく出す
- 他の1人以上が確認してから main に入れる