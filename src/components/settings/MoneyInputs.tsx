import type { ReactNode } from "react";
import { inputBaseClass, inputClass } from "./styles";

type Props = {
  /** 「収入」「固定費」 */
  label: string;
  name: string;
  amount: string;
  namePlaceholder: string;
  onNameChange: (name: string) => void;
  onAmountChange: (amount: string) => void;
  /** 金額の欄の右に並べるボタン */
  children: ReactNode;
};

// 名前と金額の入力欄（追加と変更で同じ形）。
// 1行目は名前を幅いっぱい、2行目は金額とボタン。390px の幅でもカードからはみ出さない
export default function MoneyInputs({
  label,
  name,
  amount,
  namePlaceholder,
  onNameChange,
  onAmountChange,
  children,
}: Props) {
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={name}
        maxLength={30}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder={namePlaceholder}
        aria-label={`${label}の名前`}
        className={inputClass}
      />
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          maxLength={9}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder="金額（円）"
          aria-label={`${label}の金額（円）`}
          className={`${inputBaseClass} flex-1 text-right`}
        />
        {children}
      </div>
    </div>
  );
}
