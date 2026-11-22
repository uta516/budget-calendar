const JST = "Asia/Tokyo";

/** ISO の日時 → 日本時間の日付 "2026-11-28" */
export function jstDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sv-SE", { timeZone: JST });
}

/** ISO の日時 → 日本時間の時刻 "19:00" */
export function jstTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ja-JP", {
    timeZone: JST,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 日本時間の今日 "2026-11-28" */
export function todayInJapan(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: JST });
}

/** "2026-11-28" → "11月28日（土）" */
export function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = "日月火水木金土"[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}月${d}日（${weekday}）`;
}

/** 終日の予定か（日本時間の 0:00 に始まり、ちょうど何日か後の 0:00 に終わる） */
export function isAllDay(startsAt: string, endsAt: string | null): boolean {
  if (!endsAt) return false;
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const day = 24 * 60 * 60 * 1000;
  return jstTime(startsAt) === "00:00" && end > start && (end - start) % day === 0;
}
