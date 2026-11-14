-- Googleカレンダーの同じ予定が二重に入らないようにする（No.42）
-- 手入力の予定は google_event_id が null。null どうしは重複とみなされないので影響しない
alter table events
  add constraint events_user_id_google_event_id_key unique (user_id, google_event_id);
