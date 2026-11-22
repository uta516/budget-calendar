type Props = {
  date: string;
  startTime: string;
  endTime: string;
  onDateChange: (date: string) => void;
  onStartChange: (time: string) => void;
  onEndChange: (time: string) => void;
};

const inputClass = "rounded-xl border border-zinc-200 px-3 py-2 text-base";

// 日付と、開始・終了の時刻
export default function DateTimeFields({
  date,
  startTime,
  endTime,
  onDateChange,
  onStartChange,
  onEndChange,
}: Props) {
  return (
    <section className="space-y-3 rounded-3xl bg-white p-4 shadow-sm">
      <label className="flex items-center justify-between gap-3 text-sm">
        <span className="shrink-0 font-bold">日付</span>
        <input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className={inputClass}
        />
      </label>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="shrink-0 font-bold">時間</span>
        <div className="flex items-center gap-1.5">
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartChange(e.target.value)}
            aria-label="開始の時刻"
            className={inputClass}
          />
          <span className="text-zinc-400">〜</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => onEndChange(e.target.value)}
            aria-label="終了の時刻"
            className={inputClass}
          />
        </div>
      </div>
      <p className="text-xs text-zinc-400">終了の時刻は空でも保存できます</p>
    </section>
  );
}
