-- Google カレンダー API 用のトークン（1ユーザー1行）
create table google_tokens (
  user_id uuid primary key references auth.users on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null
);

-- 本人だけが読み書きできるようにする
alter table google_tokens enable row level security;

create policy "own rows" on google_tokens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
