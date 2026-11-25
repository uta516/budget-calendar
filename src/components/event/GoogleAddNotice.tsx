import Link from "next/link";

export type SavedNotice = {
  /** 保存した予定のタイトル */
  title: string;
  /** 予定の日付 "2026-11-20"（カレンダーでその日を選んで開くため） */
  date: string;
  /** addEvent の google.message（例：「Googleカレンダーには追加できませんでした」） */
  message: string;
  /** Google との連携が切れていて、ログインし直しが必要か（google.reason が "needs-relogin"） */
  needsRelogin: boolean;
};

// 予定はアプリに保存できたが、Googleカレンダーには追加できなかったときの知らせ
export default function GoogleAddNotice({ notice }: { notice: SavedNotice }) {
  return (
    <section className="space-y-3 rounded-3xl border border-orange-200 bg-orange-50 p-4 text-zinc-800" role="alert">
      <div>
        <p className="font-bold">「{notice.title}」をアプリに保存しました</p>
        <p className="mt-1 text-sm text-orange-800">{notice.message}</p>
        <p className="mt-1 text-xs text-zinc-600">
          {notice.needsRelogin
            ? "Googleカレンダーとの連携が切れています。ログインし直すと、次からは Googleカレンダーにも追加されます。"
            : "予定はこのアプリのカレンダーには出ます。Googleカレンダーには自分で追加してください。"}
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href={`/calendar?date=${notice.date}`}
          className="flex-1 rounded-xl bg-teal-700 py-2.5 text-center text-sm font-bold text-white hover:bg-teal-800"
        >
          カレンダーで見る
        </Link>
        {notice.needsRelogin && (
          <Link
            href="/login"
            className="flex-1 rounded-xl border border-orange-300 bg-white py-2.5 text-center text-sm font-bold text-orange-800 hover:bg-orange-100"
          >
            ログインし直す
          </Link>
        )}
      </div>
    </section>
  );
}
