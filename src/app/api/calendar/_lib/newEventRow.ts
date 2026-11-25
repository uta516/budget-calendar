// Googleカレンダーから新しく入れる予定の行を作る（DB に触らない。テストしやすいように分けてある）
// vitest には "@/" の設定が無いので、相対パスで import する

import { estimateEvent } from "../../../../lib/budget";
import type { EventTimes } from "./google";

/**
 * 新しく保存する Google の予定の行。タイトルから種類と予想金額を入れる（estimateEvent）。
 * すでに保存されている予定には使わない（ユーザーが直した種類・金額を守るため）
 */
export function newGoogleEventRow(googleEventId: string, times: EventTimes, userId: string) {
  const { kind, estimatedAmount } = estimateEvent(times.title);
  return {
    ...times,
    google_event_id: googleEventId,
    user_id: userId,
    kind,
    estimated_amount: estimatedAmount,
  };
}
