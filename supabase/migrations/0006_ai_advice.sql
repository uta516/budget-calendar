-- AIの先読みアドバイスの保存（同じ日・同じデータなら使い回し、作り直しは1人1日10回まで）
-- サーバーはリクエストごとに別の入れ物で動くことがあるので、メモリではなく DB に残す
create table ai_advice (
  user_id uuid not null references auth.users on delete cascade,
  advice_date date not null,              -- 日本時間の日付
  advice text,                            -- AIで作ったアドバイス（決まった文は保存しない）。まだ作れていなければ null
  data_hash text,                         -- advice を作ったときのデータの指紋。変わったら作り直す
  ai_count int not null default 0,        -- その日にAIを呼んだ回数（失敗も数える）
  updated_at timestamptz not null default now(),
  primary key (user_id, advice_date)
);

-- 本人だけが読み書きできるようにする
alter table ai_advice enable row level security;

create policy "own rows" on ai_advice
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
