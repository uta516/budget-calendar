# 予算カレンダーアプリ

カレンダーの予定から出費を予想し、週・日ごとに使っていい額を出す予算管理アプリ。

## はじめかた

```bash
git clone https://github.com/uta516/budget-calendar.git
cd budget-calendar
npm install
cp .env.example .env.local   # Windowsは copy .env.example .env.local
```

.env.local に、LINEで共有された URL と KEY を書く。

```bash
npm run dev
```

http://localhost:3000 が開けばOK。

## 作業のルール

- main に直接 push しない
- 作業の前にブランチを作る：`git checkout -b feature/作業名`
- 終わったら push して、GitHubでプルリクエストを出す
- 他の人の担当ファイルは変更しない（担当は AGENTS.md を見る）
- テーブルを変えたら、データ担当が型ファイルを作り直す

## よく使うコマンド

| コマンド | 内容 |
|---|---|
| npm run dev | 開発用サーバーを起動 |
| npm test | 計算のテストを実行 |
| git pull | 最新の main を取り込む |