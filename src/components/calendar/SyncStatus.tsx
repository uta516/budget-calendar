import type { AutoSyncResult } from "@/lib/supabase";

type Props = {
  /** まだ同期中なら null */
  result: AutoSyncResult | null;
};

// Googleカレンダーとの同期の状態を1行で出す
export default function SyncStatus({ result }: Props) {
  if (!result) {
    return <p className="text-xs text-zinc-500">Googleカレンダーと同期中…</p>;
  }
  if (result.error) {
    return (
      <p className="rounded-2xl bg-orange-50 p-3 text-xs text-orange-700" role="alert">
        {result.needsRelogin
          ? "Googleカレンダーと同期できませんでした。ログインし直してください。"
          : result.error}
      </p>
    );
  }
  const changed = result.added + result.updated + result.deleted;
  return (
    <p className="text-xs text-zinc-500">
      Googleカレンダー連携中
      {result.synced && changed > 0 && `（新しく${result.added}件・更新${result.updated}件・削除${result.deleted}件）`}
    </p>
  );
}
