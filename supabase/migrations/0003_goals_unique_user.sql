-- 目標は1人1つ。saveGoal を upsert（onConflict: user_id）で書けるようにする
alter table goals
  add constraint goals_user_id_key unique (user_id);
