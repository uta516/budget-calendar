"use client";

import { useState } from "react";
import FormMessage, { type Message } from "./FormMessage";
import MoneyItemRow, { type MoneyItem } from "./MoneyItemRow";
import { parseName, parseYen, yen } from "./parse";
import { cardClass, inputClass, primaryButtonClass } from "./styles";

type Props = {
  /** 「収入」「固定費」 */
  label: string;
  /** 毎月の合計の説明（例：「毎月の収入の合計」） */
  totalLabel: string;
  namePlaceholder: string;
  items: MoneyItem[];
  onAdd: (name: string, amount: number) => Promise<void>;
  onUpdate: (id: number, name: string, amount: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

// 収入・固定費の一覧と、追加・変更・削除
export default function MoneyListCard({
  label,
  totalLabel,
  namePlaceholder,
  items,
  onAdd,
  onUpdate,
  onDelete,
}: Props) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  const total = items.reduce((sum, item) => sum + item.amount, 0);

  /** 保存の処理を行い、結果のメッセージを出す */
  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      setMessage({ type: "success", text: done });
    } catch (e) {
      setMessage({ type: "error", text: (e as Error).message });
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    const n = parseName(name, `${label}の名前`);
    if (!n.ok) return setMessage({ type: "warning", text: n.warning });
    const a = parseYen(amount, `${label}の金額`);
    if (!a.ok) return setMessage({ type: "warning", text: a.warning });
    try {
      await run(() => onAdd(n.value, a.value), "保存しました");
      setName("");
      setAmount("");
    } catch {
      // メッセージは run で出している
    }
  }

  return (
    <section className={cardClass}>
      <div className="flex items-baseline justify-between">
        <h2 className="font-bold">{label}</h2>
        <p className="text-xs text-zinc-500">
          {totalLabel} <span className="text-base font-bold text-zinc-900">{yen(total)}円</span>
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-400">まだありません</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {items.map((item) => (
            <MoneyItemRow
              key={item.id}
              item={item}
              label={label}
              busy={busy}
              onMessage={setMessage}
              onUpdate={(id, n, a) => run(() => onUpdate(id, n, a), "保存しました")}
              onDelete={(id) => run(() => onDelete(id), "削除しました").catch(() => {})}
            />
          ))}
        </ul>
      )}

      <div className="flex gap-2 border-t border-zinc-100 pt-3">
        <input
          type="text"
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          placeholder={namePlaceholder}
          aria-label={`追加する${label}の名前`}
          className={inputClass}
        />
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          maxLength={9}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="円"
          aria-label={`追加する${label}の金額`}
          className={`${inputClass} w-24 shrink-0 text-right`}
        />
        <button type="button" onClick={add} disabled={busy} className={`${primaryButtonClass} shrink-0`}>
          追加
        </button>
      </div>

      <FormMessage message={message} />
    </section>
  );
}
