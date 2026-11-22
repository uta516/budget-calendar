import { EVENT_KINDS, type EventKind } from "@/lib/supabase";
import { KIND_STYLES } from "@/components/calendar/eventKinds";

type Props = {
  selected: EventKind;
  onSelect: (kind: EventKind) => void;
};

// 予定の種類を選ぶボタン（色と名前はカレンダーと同じ）
export default function KindPicker({ selected, onSelect }: Props) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold">種類</h2>
      <div className="mt-2 grid grid-cols-4 gap-2">
        {EVENT_KINDS.map((kind) => {
          const style = KIND_STYLES[kind];
          const active = kind === selected;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => onSelect(kind)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-1 rounded-2xl border px-1 py-2 text-xs ${
                active
                  ? "border-teal-700 bg-teal-50 font-bold text-teal-800"
                  : "border-zinc-200 text-zinc-700"
              }`}
            >
              <span className={`h-3 w-3 rounded-full ${style.dotClass}`} aria-hidden />
              {style.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
