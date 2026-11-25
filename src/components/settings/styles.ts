// 設定画面の部品で共通の見た目
export const cardClass = "space-y-3 rounded-3xl bg-white p-4 text-zinc-800 shadow-sm";
/** 入力欄の見た目（幅は付けない。横に並べるときは使う側で flex-1 などを付ける） */
export const inputBaseClass =
  "min-w-0 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400";
/** 幅いっぱいの入力欄 */
export const inputClass = `${inputBaseClass} w-full`;
export const primaryButtonClass =
  "rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white hover:bg-teal-800 disabled:opacity-50";
export const subButtonClass =
  "rounded-xl border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50";
