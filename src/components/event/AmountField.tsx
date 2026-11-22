type Props = {
  value: string;
  /** 自動で入った金額のもとになった種類の名前。手で直したら null */
  autoFrom: string | null;
  onChange: (text: string) => void;
};

// 予想金額の入力欄（種類を選ぶと自動で入り、手で直せる）
export default function AmountField({ value, autoFrom, onChange }: Props) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <label className="block text-sm">
        <span className="font-bold">予想金額</span>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-lg font-bold text-zinc-500">¥</span>
          <input
            type="text"
            inputMode="numeric"
            value={value}
            maxLength={8}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-right text-2xl font-bold"
          />
          <span className="shrink-0 font-bold">円</span>
        </div>
      </label>
      <p className="mt-1.5 text-xs text-zinc-400">
        {autoFrom
          ? `「${autoFrom}」のだいたいの金額を入れました。手で直せます`
          : "種類を選ぶと、だいたいの金額が入ります"}
      </p>
    </section>
  );
}
