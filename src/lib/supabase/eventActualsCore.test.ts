import { describe, expect, it } from "vitest";
import {
  averageByKind,
  buildEventActuals,
  eventEnd,
  findMissedEvents,
  isEnded,
  summarizeActuals,
  type ActualEvent,
  type LinkedExpense,
} from "./eventActualsCore";

// 今：2026-11-20 12:00（日本時間）
const NOW = new Date("2026-11-20T12:00:00+09:00");

const ev = (
  id: number,
  kind: string,
  starts_at: string,
  ends_at: string | null,
  estimated_amount: number,
  title = `予定${id}`,
): ActualEvent => ({ id, title, kind, starts_at, ends_at, estimated_amount });

const ex = (amount: number, event_id: number | null): LinkedExpense => ({ amount, event_id });

describe("eventEnd / isEnded", () => {
  it("終了日時があればそれで判定する", () => {
    const e = ev(1, "meal", "2026-11-20T10:00:00+09:00", "2026-11-20T13:00:00+09:00", 0);
    expect(eventEnd(e)).toBe(Date.parse("2026-11-20T13:00:00+09:00"));
    expect(isEnded(e, NOW)).toBe(false);
  });
  it("終了日時が無ければ開始日時で判定する", () => {
    expect(isEnded(ev(1, "meal", "2026-11-20T11:59:00+09:00", null, 0), NOW)).toBe(true);
    expect(isEnded(ev(1, "meal", "2026-11-20T12:01:00+09:00", null, 0), NOW)).toBe(false);
  });
  it("終わりがちょうど今なら、まだ終わっていない", () => {
    expect(isEnded(ev(1, "meal", "2026-11-20T11:00:00+09:00", "2026-11-20T12:00:00+09:00", 0), NOW)).toBe(false);
  });
  it("UTC 表記でも同じ時刻として比べる", () => {
    expect(isEnded(ev(1, "meal", "2026-11-20T02:00:00+00:00", "2026-11-20T02:59:00+00:00", 0), NOW)).toBe(true);
  });
});

describe("findMissedEvents（記録し忘れた予定）", () => {
  const events = [
    ev(1, "drink", "2026-11-18T19:00:00+09:00", "2026-11-18T22:00:00+09:00", 4000, "飲み会"), // 終わった・記録なし → 出る
    ev(2, "meal", "2026-11-19T12:00:00+09:00", "2026-11-19T13:00:00+09:00", 1500, "ランチ"), // 記録あり → 出ない
    ev(3, "work", "2026-11-17T10:00:00+09:00", "2026-11-17T15:00:00+09:00", 0, "バイト"), // work → 出ない
    ev(4, "other", "2026-11-16T09:00:00+09:00", "2026-11-16T10:30:00+09:00", 0, "授業"), // 0円 → 出ない
    ev(5, "fun", "2026-11-21T14:00:00+09:00", null, 3500, "映画"), // まだ → 出ない
    ev(6, "work", "2026-11-15T10:00:00+09:00", "2026-11-15T15:00:00+09:00", 1000, "バイト2"), // work（金額あり）→ 出ない
    ev(7, "shop", "2026-11-10T13:00:00+09:00", null, 2000, "買い物"), // 終わった・記録なし → 出る
  ];
  const expenses = [ex(1800, 2), ex(500, null)];

  it("終わっていて記録が無い予定だけ（開始日時の早い順）", () => {
    const missed = findMissedEvents(events, expenses, NOW);
    expect(missed.map((m) => m.title)).toEqual(["買い物", "飲み会"]);
    expect(missed[1]).toEqual({
      eventId: 1,
      title: "飲み会",
      kind: "drink",
      date: "2026-11-18",
      startsAt: "2026-11-18T19:00:00+09:00",
      endsAt: "2026-11-18T22:00:00+09:00",
      estimated: 4000,
    });
  });

  it("支出の日付に関係なく、event_id で結びついていれば記録済み", () => {
    // ランチ（id 2）の支出は別の月に記録されていても、ここには event_id しか渡らないので同じ扱い
    expect(findMissedEvents(events, [ex(1800, 2)], NOW).some((m) => m.eventId === 2)).toBe(false);
  });

  it("0件", () => {
    expect(findMissedEvents([], [], NOW)).toEqual([]);
  });
});

describe("buildEventActuals / summarizeActuals（予想と実際）", () => {
  const events = [
    ev(1, "drink", "2026-11-18T19:00:00+09:00", "2026-11-18T22:00:00+09:00", 4000, "飲み会"),
    ev(2, "meal", "2026-11-19T12:00:00+09:00", null, 1500, "ランチ"),
    ev(3, "work", "2026-11-17T10:00:00+09:00", null, 0, "バイト"),
    ev(4, "other", "2026-11-16T09:00:00+09:00", null, 0, "授業"),
    ev(5, "fun", "2026-11-21T14:00:00+09:00", null, 3500, "映画"),
  ];
  // 飲み会は2回に分けて記録、ランチは予想より少なく、授業（0円）にも記録あり
  const expenses = [ex(3000, 1), ex(1200, 1), ex(1300, 2), ex(400, 4), ex(999, null)];
  const actuals = buildEventActuals(events, expenses, NOW);

  it("work は外し、0円の予定は入れる（開始日時の早い順）", () => {
    expect(actuals.map((a) => a.title)).toEqual(["授業", "飲み会", "ランチ", "映画"]);
  });

  it("実際は結びついた支出の合計、差は実際 − 予想", () => {
    const drink = actuals.find((a) => a.eventId === 1)!;
    expect(drink).toMatchObject({ estimated: 4000, actual: 4200, diff: 200, expenseCount: 2, recorded: true, ended: true });
    const lunch = actuals.find((a) => a.eventId === 2)!;
    expect(lunch).toMatchObject({ actual: 1300, diff: -200, recorded: true });
  });

  it("記録が無ければ actual 0・diff null", () => {
    const movie = actuals.find((a) => a.eventId === 5)!;
    expect(movie).toMatchObject({ actual: 0, diff: null, expenseCount: 0, recorded: false, ended: false });
  });

  it("まとめは、記録がある予定だけで合計する", () => {
    expect(summarizeActuals(actuals)).toEqual({
      recordedCount: 3, // 授業・飲み会・ランチ
      missedCount: 0,
      upcomingCount: 1, // 映画
      estimated: 0 + 4000 + 1500,
      actual: 400 + 4200 + 1300,
      diff: 400 + 4200 + 1300 - 5500,
    });
  });

  it("記録し忘れの件数は、終わっていて記録が無く予想が1円以上のもの", () => {
    const s = summarizeActuals(buildEventActuals(events, [], NOW));
    expect(s.missedCount).toBe(2); // 飲み会・ランチ（授業は0円なので数えない）
    expect(s).toMatchObject({ recordedCount: 0, estimated: 0, actual: 0, diff: 0 });
  });

  it("0件", () => {
    expect(summarizeActuals([])).toEqual({
      recordedCount: 0, missedCount: 0, upcomingCount: 0, estimated: 0, actual: 0, diff: 0,
    });
  });
});

describe("averageByKind（種類ごとの実際の平均）", () => {
  const events = [
    ev(1, "drink", "2026-11-01T19:00:00+09:00", null, 4000),
    ev(2, "drink", "2026-11-08T19:00:00+09:00", null, 4000),
    ev(3, "drink", "2026-11-15T19:00:00+09:00", null, 4000),
    ev(4, "meal", "2026-10-20T12:00:00+09:00", null, 1500), // 先月でも過去なら使う
    ev(5, "work", "2026-11-02T10:00:00+09:00", null, 0),
    ev(6, "fun", "2026-11-25T14:00:00+09:00", null, 3500), // まだ → 使わない
    ev(7, "trip", "2026-11-03T09:00:00+09:00", null, 11000), // 記録なし → 使わない
    ev(8, "party", "2026-11-04T19:00:00+09:00", null, 0), // 決まっていない種類 → 最後に並ぶ
  ];
  const expenses = [
    ex(3000, 1),
    ex(4500, 2),
    ex(1000, 2), // 2回に分けて記録 → 予定2の実際は 5,500
    ex(4001, 3),
    ex(1800, 4),
    ex(900, 5), // work は数えない
    ex(3000, 6), // まだ終わっていない
    ex(700, 8),
  ];

  it("終わっていて記録がある予定だけ。平均は1円単位で四捨五入", () => {
    expect(averageByKind(events, expenses, NOW)).toEqual([
      { kind: "drink", average: 4167, count: 3, total: 12501 }, // 12501 / 3 = 4167
      { kind: "meal", average: 1800, count: 1, total: 1800 },
      { kind: "party", average: 700, count: 1, total: 700 },
    ]);
  });

  it("四捨五入（.5 は切り上げ）", () => {
    const r = averageByKind(
      [ev(1, "meal", "2026-11-01T12:00:00+09:00", null, 0), ev(2, "meal", "2026-11-02T12:00:00+09:00", null, 0)],
      [ex(1000, 1), ex(1001, 2)],
      NOW,
    );
    expect(r).toEqual([{ kind: "meal", average: 1001, count: 2, total: 2001 }]); // 1000.5 → 1001
  });

  it("0件", () => {
    expect(averageByKind([], [], NOW)).toEqual([]);
  });
});
