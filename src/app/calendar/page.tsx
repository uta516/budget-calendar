// 仮ページ：中身ができるまで「準備中」と表示する
export default function Page() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6">
      <h1 className="text-xl font-bold">カレンダー</h1>
      <p className="text-sm text-zinc-500">準備中</p>
    </main>
  );
}
