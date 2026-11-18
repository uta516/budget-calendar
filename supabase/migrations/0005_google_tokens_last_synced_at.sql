-- 最後に Googleカレンダーを自動同期した時刻（ログイン直後・アプリを開いたときの同期で更新する）
-- null は、まだ一度も自動同期していない
alter table google_tokens
  add column last_synced_at timestamptz;
