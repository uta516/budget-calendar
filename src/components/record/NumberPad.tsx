type Props = {
  onDigit: (digits: string) => void;
  onDelete: () => void;
};

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0"];

// 金額を入れるための数字ボタン
export default function NumberPad({ onDigit, onDelete }: Props) {
  const keyClass =
    "h-14 rounded-2xl bg-white text-xl font-medium shadow-sm active:bg-zinc-100";

  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((k) => (
        <button key={k} type="button" className={keyClass} onClick={() => onDigit(k)}>
          {k}
        </button>
      ))}
      <button type="button" className={`${keyClass} text-base`} onClick={onDelete}>
        消す
      </button>
    </div>
  );
}
