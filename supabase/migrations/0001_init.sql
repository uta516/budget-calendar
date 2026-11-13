-- 設定（時給・手当など）
create table settings (
  user_id uuid primary key references auth.users on delete cascade,
  hourly_wage int not null default 1100,
  night_rate numeric not null default 1.25,
  holiday_bonus int not null default 0
);

-- 収入・固定費
create table incomes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  amount int not null
);
create table fixed_costs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  amount int not null
);

-- 予算カテゴリ（食費など）
create table categories (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  monthly_budget int not null default 0
);

-- 予定
create table events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  kind text not null,          -- drink / meal / fun / trip / shop / work / other
  starts_at timestamptz not null,
  ends_at timestamptz,
  estimated_amount int not null default 0,
  google_event_id text         -- Googleカレンダーから取った予定ならそのID
);

-- 支出
create table expenses (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  category_id bigint references categories on delete set null,
  event_id bigint references events on delete set null,
  amount int not null,
  spent_on date not null default current_date
);

-- 目標
create table goals (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  target_amount int not null,
  months int not null,
  saved_amount int not null default 0
);

-- 自分のデータしか見られないようにする（必須）
do $$
declare t text;
begin
  foreach t in array array['settings','incomes','fixed_costs','categories','events','expenses','goals'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "own rows" on %I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;