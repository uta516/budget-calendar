"use client";

import { useState } from "react";
import type { Settings } from "@/lib/supabase";
import FormMessage, { type Message } from "./FormMessage";
import { Field } from "./GoalForm";
import { parseRate, parseYen } from "./parse";
import { cardClass, inputClass, primaryButtonClass } from "./styles";

type Props = {
  initial: Settings;
  onSave: (settings: Settings) => Promise<void>;
};

// 時給の設定（時給・深夜の割増・休日の手当）
export default function WageForm({ initial, onSave }: Props) {
  const [wage, setWage] = useState(String(initial.hourlyWage));
  const [rate, setRate] = useState(String(initial.nightRate));
  const [bonus, setBonus] = useState(String(initial.holidayBonus));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);

  async function save() {
    const w = parseYen(wage, "時給", 1);
    if (!w.ok) return setMessage({ type: "warning", text: w.warning });
    const r = parseRate(rate);
    if (!r.ok) return setMessage({ type: "warning", text: r.warning });
    const b = parseYen(bonus, "休日の手当");
    if (!b.ok) return setMessage({ type: "warning", text: b.warning });

    setBusy(true);
    setMessage(null);
    try {
      await onSave({ hourlyWage: w.value, nightRate: r.value, holidayBonus: b.value });
      setMessage({ type: "success", text: "保存しました" });
    } catch (e) {
      setMessage({ type: "error", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={cardClass}>
      <h2 className="font-bold">バイトの時給</h2>
      <Field label="時給" unit="円">
        <input
          type="text"
          inputMode="numeric"
          value={wage}
          maxLength={6}
          onChange={(e) => setWage(e.target.value)}
          className={`${inputClass} text-right`}
        />
      </Field>
      <Field label="深夜の割増" unit="倍">
        <input
          type="text"
          inputMode="decimal"
          value={rate}
          maxLength={5}
          onChange={(e) => setRate(e.target.value)}
          className={`${inputClass} text-right`}
        />
      </Field>
      <Field label="休日の手当" unit="円">
        <input
          type="text"
          inputMode="numeric"
          value={bonus}
          maxLength={6}
          onChange={(e) => setBonus(e.target.value)}
          className={`${inputClass} text-right`}
        />
      </Field>
      <p className="text-xs text-zinc-400">深夜の割増は、22時〜5時の時給が何倍になるか（例：1.25）</p>
      <FormMessage message={message} />
      <button type="button" onClick={save} disabled={busy} className={`${primaryButtonClass} w-full py-3`}>
        {busy ? "保存中…" : "時給の設定を保存"}
      </button>
    </section>
  );
}
