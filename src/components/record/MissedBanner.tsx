import Link from "next/link";

// 「記録し忘れた予定が○件あります」の案内（0件なら出さない）
export default function MissedBanner({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Link
      href="/record/missed"
      className="flex items-center justify-between rounded-2xl bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800"
    >
      <span>記録し忘れた予定が{count}件あります</span>
      <span aria-hidden>›</span>
    </Link>
  );
}
