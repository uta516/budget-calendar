type Props = {
  value: string;
  onChange: (title: string) => void;
};

// 予定のタイトルの入力欄
export default function TitleField({ value, onChange }: Props) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <label className="block text-sm">
        <span className="font-bold">タイトル</span>
        <input
          type="text"
          value={value}
          maxLength={50}
          onChange={(e) => onChange(e.target.value)}
          placeholder="例：サークルの飲み会"
          className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-base"
        />
      </label>
    </section>
  );
}
