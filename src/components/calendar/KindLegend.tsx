import { KIND_STYLES } from "./eventKinds";

// 色と種類の対応（凡例）
export default function KindLegend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 px-1 text-xs text-zinc-600">
      {Object.values(KIND_STYLES).map((k) => (
        <li key={k.label} className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${k.dotClass}`} aria-hidden />
          {k.label}
        </li>
      ))}
    </ul>
  );
}
