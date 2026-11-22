import Link from "next/link";

// 右下の「使ったお金を入力」ボタン（下のタブバーの上に出す）
export default function RecordButton() {
  return (
    <Link
      href="/record"
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-zinc-800"
    >
      <span className="text-lg leading-none" aria-hidden>
        ＋
      </span>
      使ったお金を入力
    </Link>
  );
}
