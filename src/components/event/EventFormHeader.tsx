import Link from "next/link";

// 上の部分（カレンダーに戻る・タイトル）
export default function EventFormHeader() {
  return (
    <header className="grid grid-cols-3 items-center">
      <Link href="/calendar" className="flex items-center gap-1 text-sm font-bold text-teal-700">
        <span aria-hidden>‹</span> カレンダー
      </Link>
      <h1 className="text-center font-bold">予定を追加</h1>
      <span />
    </header>
  );
}
