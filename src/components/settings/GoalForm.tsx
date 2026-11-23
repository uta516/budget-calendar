"use client";

import { useState, type ReactNode } from "react";
import type { GoalInput } from "@/lib/supabase";
import FormMessage, { type Message } from "./FormMessage";
import { parseMonths, parseName, parseYen } from "./parse";
import { cardClass, inputClass, primaryButtonClass } from "./styles";

type Props = {
  /** 保存してある目標。まだ無ければ null */
  initial: GoalInput | null;
  onSave: (goal: GoalInput) => Promise<void>;
};

const text = (n: number | undefined) => (n === undefined ? "" : String(n));

// 目標（名前・目標額・月数・たまった額）
export default function GoalForm({ initial, onSave }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [target, setTarget] = useState(text(initial?.targetAmount));
  const [months, setMonths] = useState(text(initial?.months));
  const [saved, setSaved] = useState(text(initial?.savedAmount ?? 0));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function save() {
    const n = parseName(name, "目標の名前");
    if (!n.ok) return setMessage({ type: "warning", text: n.warning });
    const t = parseYen(target, "目標額", 1);
    if (!t.ok) return setMessage({ type: "warning", text: t.warning });
    const m = parseMonths(months);
    if (!m.ok) return setMessage({ type: "warning", text: m.warning });
    const s = parseYen(saved, "たまった額");
    if (!s.ok) return setMessage({ type: "warning", text: s.warning });

    setBusy(true);
    setMessage(null);
    try {
      await onSave({ name: n.value, targetAmount: t.value, months: m.value, savedAmount: s.value });
      setMessage({ type: "success", text: "保存しました" });
    } catch (e) {
      setMessage({ type: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={cardClass}>
      <h2 className="font-bold">目標</h2>
      <Field label="名前">
        <input
          type="text"
          value={name}
          maxLength={30}
          onChange={(e) => setName(e.target.value)}
          placeholder="例：春休みの旅行"
          className={inputClass}
        />
      </Field>
      <Field label="目標額" unit="円">
        <input
          type="text"
          inputMode="numeric"
          value={target}
          maxLength={9}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="80000"
          className={`${inputClass} text-right`}
        />
      </Field>
      <Field label="何か月で" unit="か月">
        <input
          type="text"
          inputMode="numeric"
          value={months}
          maxLength={3}
          onChange={(e) => setMonths(e.target.value)}
          placeholder="4"
          className={`${inputClass} text-right`}
        />
      </Field>
      <Field label="今たまった額" unit="円">
        <input
          type="text"
          inputMode="numeric"
          value={saved}
          maxLength={9}
          onChange={(e) => setSaved(e.target.value)}
          placeholder="0"
          className={`${inputClass} text-right`}
        />
      </Field>
      <FormMessage message={message} />
      <button type="button" onClick={save} disabled={busy} className={`${primaryButtonClass} w-full py-3`}>
        {busy ? "保存中…" : "目標を保存"}
      </button>
    </section>
  );
}

export function Field({
  label,
  unit,
  children,
}: {
  label: string;
  unit?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-24 shrink-0 font-bold">{label}</span>
      <span className="flex min-w-0 flex-1 items-center gap-1.5">
        {children}
        {unit && <span className="w-8 shrink-0 text-zinc-500">{unit}</span>}
      </span>
    </label>
  );
}
