import Link from "next/link";

// 上の部分（記録画面に戻る・タイトル）
export default function MissedHeader() {
  return (
    <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <Link href="/record" className="flex items-center gap-1 text-sm font-bold text-teal-700">
        <span aria-hidden>‹</span> 記録
      </Link>
      <h1 className="text-center font-bold text-zinc-900">記録し忘れた予定</h1>
      <span />
    </header>
  );
}
