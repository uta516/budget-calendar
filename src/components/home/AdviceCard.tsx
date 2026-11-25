import type { AdviceResult } from "@/lib/ai/advice";

type Props = {
  /** まだ読み込み中なら null */
  result: AdviceResult | null;
};

// 「先読みアドバイス」のカード
export default function AdviceCard({ result }: Props) {
  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-zinc-800 shadow-sm">
      <div className="flex items-center gap-2">
        <span aria-hidden>💡</span>
        <h2 className="text-sm font-bold text-amber-800">先読みアドバイス</h2>
        {result?.source === "ai" && (
          <span className="ml-auto rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            AI
          </span>
        )}
      </div>

      {result === null ? (
        <p className="mt-2 animate-pulse text-sm text-zinc-500">アドバイスを考えています…</p>
      ) : result.advice ? (
        <p className="mt-2 text-sm leading-relaxed">{result.advice}</p>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">
          {result.needsRelogin
            ? "アドバイスを出せませんでした。ログインし直してください。"
            : "今はアドバイスを出せません。あとでもう一度開いてください。"}
        </p>
      )}
    </section>
  );
}
