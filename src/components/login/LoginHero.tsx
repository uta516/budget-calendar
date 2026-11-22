// アプリのマーク・名前・一言
export default function LoginHero() {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-700 shadow-lg shadow-teal-700/30">
        {/* カレンダーと円のマーク */}
        <svg viewBox="0 0 48 48" className="h-11 w-11" fill="none" aria-hidden>
          <rect x="6" y="9" width="36" height="33" rx="6" stroke="white" strokeWidth="3" />
          <path d="M6 18h36" stroke="white" strokeWidth="3" />
          <path d="M15 5v8M33 5v8" stroke="white" strokeWidth="3" strokeLinecap="round" />
          <path
            d="M19 24l5 6 5-6M24 30v8M19.5 31.5h9M19.5 35.5h9"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h1 className="mt-6 text-3xl font-black tracking-wider text-zinc-900">家計簿アプリ</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        予定に合わせて、
        <br />
        お金の使い方をデザインする。
      </p>
    </div>
  );
}
