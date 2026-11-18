// AI が使えないとき（鍵が無い・失敗・回数の上限）の、決まった文のアドバイス（データ・連携の担当）
// 数字はホームのまとめの値をそのまま使い、ここでは新しい計算はしない

import type { AdviceInput } from "./prompts";

const yen = (n: number) => `${n.toLocaleString("ja-JP")}円`;

function monthDay(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}/${d}`;
}

/** AdviceInput から、決まった文のアドバイスを1つ作る */
export function fallbackAdvice(input: AdviceInput): string {
  const { today, weekLeft, todayGuide, upcomingEvents, weekDays } = input;

  if (weekLeft < 0) {
    return `今週はもう予算を${yen(-weekLeft)}こえています。今日はなるべくお金を使わない日にしましょう。`;
  }

  // 予想金額がある、いちばん近い予定
  const next = upcomingEvents.find((e) => e.amount > 0);
  const weekDates = weekDays.map((d) => d.date);

  if (next && next.date === today) {
    return `今日は${next.title}（${yen(next.amount)}）があります。予定の分のほかは、なるべく使わないようにしましょう。`;
  }

  if (next && weekDates.includes(next.date)) {
    // 今週中の予定：その前の日までは目安以内に
    const before = weekDays[weekDates.indexOf(next.date) - 1];
    const until = before && before.date !== today ? `${before.weekday}曜までは` : "今日は";
    return `${next.weekday}曜に${next.title}（${yen(next.amount)}）があるので、${until}1日${yen(todayGuide)}以内がおすすめです。`;
  }

  if (next) {
    return `${monthDay(next.date)}（${next.weekday}）に${next.title}（${yen(next.amount)}）があります。今日の目安は${yen(todayGuide)}です。`;
  }

  return `今日の目安は${yen(todayGuide)}です。目安どおりに使えば、今週は予算内におさまります。`;
}
