type Props = {
  date: string;
  /** これより後の日付は選べない "2026-11-12" */
  maxDate: string;
  memo: string;
  onDateChange: (date: string) => void;
  onMemoChange: (memo: string) => void;
};

// 日付とメモの入力欄
export default function DateMemoFields({ date, maxDate, memo, onDateChange, onMemoChange }: Props) {
  return (
    <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="shrink-0 font-bold">日付</span>
        <input
          type="date"
          value={date}
          max={maxDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="rounded-xl border border-zinc-200 px-3 py-2 text-base"
        />
      </label>
      <label className="block text-sm">
        <span className="font-bold">メモ</span>
        <input
          type="text"
          value={memo}
          maxLength={50}
          onChange={(e) => onMemoChange(e.target.value)}
          placeholder="例：ゼミのあとのごはん"
          className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base"
        />
        <span className="mt-1 block text-xs text-zinc-400">※メモはまだ保存されません（準備中）</span>
      </label>
    </section>
  );
}
