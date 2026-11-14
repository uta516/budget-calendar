import DataCheck from "./DataCheck";

// データ関数の動作確認ページ（開発時のみ。本番では src/app/dev/layout.tsx が 404 にする）
export default function DataCheckPage() {
  return <DataCheck />;
}
