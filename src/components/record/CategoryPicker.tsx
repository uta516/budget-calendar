import type { Category } from "@/lib/supabase";

type Props = {
  categories: Category[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

// カテゴリを1つ選ぶボタンの列（入りきらないときは横にスクロール）
export default function CategoryPicker({ categories, selectedId, onSelect }: Props) {
  return (
    <div role="radiogroup" aria-label="カテゴリ" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {categories.map((c) => {
        const selected = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(c.id)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
              selected
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {c.name}
          </button>
        );
      })}
    </div>
  );
}
