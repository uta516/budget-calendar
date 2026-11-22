import Link from "next/link";
import { shortDate } from "./format";

type Props = {
  /** 選んでいる日付 "2026-11-12" */
  date: string;
};

// 上の部分（ホームに戻る・タイトル・日付）
export default function RecordHeader({ date }: Props) {
  return (
    <header className="grid grid-cols-3 items-center">
      <Link href="/" className="flex items-center gap-1 text-sm font-bold text-teal-700">
        <span aria-hidden>‹</span> ホーム
      </Link>
      <h1 className="text-center font-bold">使ったお金を入力</h1>
      <p className="text-right text-xs text-zinc-500">{shortDate(date)}</p>
    </header>
  );
}
