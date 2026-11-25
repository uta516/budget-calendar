"use client";

import { useState } from "react";
import { parseName, parseYen, yen } from "./parse";
import MoneyInputs from "./MoneyInputs";
import { primaryButtonClass, subButtonClass } from "./styles";
import type { Message } from "./FormMessage";

export type MoneyItem = { id: number; name: string; amount: number };

type Props = {
  item: MoneyItem;
  /** 「収入」「固定費」 */
  label: string;
  /** 名前の欄の薄い文字（例：「例：仕送り」） */
  namePlaceholder: string;
  busy: boolean;
  onUpdate: (id: number, name: string, amount: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onMessage: (message: Message) => void;
};

// 一覧の1行。「変更」で入力欄になる
export default function MoneyItemRow({ item, label, namePlaceholder, busy, onUpdate, onDelete, onMessage }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [amount, setAmount] = useState(String(item.amount));

  function startEdit() {
    setName(item.name);
    setAmount(String(item.amount));
    setEditing(true);
    onMessage(null);
  }

  async function save() {
    const n = parseName(name, `${label}の名前`);
    if (!n.ok) return onMessage({ type: "warning", text: n.warning });
    const a = parseYen(amount, `${label}の金額`);
    if (!a.ok) return onMessage({ type: "warning", text: a.warning });
    try {
      await onUpdate(item.id, n.value, a.value);
      setEditing(false);
    } catch {
      // 失敗したら入力欄のまま。メッセージは一覧のほうで出している
    }
  }

  async function remove() {
    if (!window.confirm(`「${item.name}」を削除しますか？`)) return;
    await onDelete(item.id);
  }

  if (editing) {
    return (
      <li className="rounded-2xl bg-zinc-50 p-3">
        <MoneyInputs
          label={label}
          name={name}
          amount={amount}
          namePlaceholder={namePlaceholder}
          onNameChange={setName}
          onAmountChange={setAmount}
        >
          <button type="button" onClick={() => setEditing(false)} disabled={busy} className={`${subButtonClass} shrink-0`}>
            やめる
          </button>
          <button type="button" onClick={save} disabled={busy} className={`${primaryButtonClass} shrink-0`}>
            保存
          </button>
        </MoneyInputs>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 py-2">
      <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
      <span className="shrink-0 text-sm font-bold">{yen(item.amount)}円</span>
      <button type="button" onClick={startEdit} disabled={busy} className="shrink-0 px-1 text-xs font-bold text-teal-700 disabled:opacity-50">
        変更
      </button>
      <button type="button" onClick={remove} disabled={busy} className="shrink-0 px-1 text-xs text-red-600 disabled:opacity-50">
        削除
      </button>
    </li>
  );
}
