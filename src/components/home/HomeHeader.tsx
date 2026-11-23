import Link from "next/link";

type Props = {
  /** "2026-11-12" */
  today: string;
  /** "木" */
  weekday: string;
};

// ホームの上の部分（日付・タイトル・設定ボタン）
export default function HomeHeader({ today, weekday }: Props) {
  const [, m, d] = today.split("-");

  return (
    <header className="flex items-end justify-between">
      <div>
        <p className="text-xs text-zinc-500">
          {Number(m)}月{Number(d)}日（{weekday}）
        </p>
        <h1 className="mt-1 text-2xl font-bold">今週のお金</h1>
      </div>
      <Link
        href="/settings"
        aria-label="設定"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-700 shadow-sm hover:bg-zinc-50"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
        </svg>
      </Link>
    </header>
  );
}
