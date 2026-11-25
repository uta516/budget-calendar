// このページは表示のときに「今日」の日付を読むので、<Suspense> で包んで、開いたときに組み立てる。
// （build のときに new Date() を読むと、日付が焼きこまれるため build が止まる。Cache Components の決まり）
// 中身は、ページのいちばん外側と同じ背景の空の枠（見た目を変えないため）
export default function Loading() {
  return <div className="flex flex-1 flex-col bg-zinc-100" />;
}
