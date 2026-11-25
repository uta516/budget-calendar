import { describe, expect, it } from "vitest";
import {
  budgetDays,
  buildHomeSummary,
  selectBudgetPlans,
  type HomeSummaryInput,
} from "./summary";
import type { Event } from "./supabase";

let nextId = 1;
/** テスト用の予定。startsAt は日本時間で書く */
function event(startsAt: string, kind: string, amount: number, id = nextId++): Event {
  return {
    id,
    title: `予定${id}`,
    kind,
    starts_at: new Date(startsAt).toISOString(),
    ends_at: null,
    estimated_amount: amount,
    google_event_id: null,
    user_id: "u",
  };
}

describe("budgetDays（日ごとの目安を配る日）", () => {
  it("週の途中：今日〜日曜", () => {
    expect(budgetDays("2026-11-25")).toEqual([
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
      "2026-11-28",
      "2026-11-29",
    ]);
  });

  it("日曜：今日だけ", () => {
    expect(budgetDays("2026-11-29")).toEqual(["2026-11-29"]);
  });

  it("月末の週：月末で止める（翌月の日は入れない）", () => {
    expect(budgetDays("2026-11-30")).toEqual(["2026-11-30"]);
    expect(budgetDays("2026-12-28")).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
    ]);
  });

  it("月の初めの週（月曜が前の月）：今日〜日曜", () => {
    expect(budgetDays("2027-01-01")).toEqual(["2027-01-01", "2027-01-02", "2027-01-03"]);
  });
});

describe("selectBudgetPlans（予定分として取り分ける予定）", () => {
  const days = ["2026-11-25", "2026-11-26", "2026-11-27"];

  it("days の日に始まる予定を、日本時間の日付と予想金額にする", () => {
    const plans = selectBudgetPlans(
      [
        event("2026-11-26T19:00:00+09:00", "drink", 4000),
        // UTC では 11/26 だが、日本時間では 11/27
        event("2026-11-27T00:30:00+09:00", "meal", 1500),
      ],
      new Set(),
      days,
    );
    expect(plans).toEqual([
      { date: "2026-11-26", amount: 4000 },
      { date: "2026-11-27", amount: 1500 },
    ]);
  });

  it("work・予想0円・記録済みの予定は外す", () => {
    const recorded = event("2026-11-26T12:00:00+09:00", "meal", 1500);
    const plans = selectBudgetPlans(
      [
        event("2026-11-26T09:00:00+09:00", "work", 5000),
        event("2026-11-26T10:00:00+09:00", "other", 0),
        recorded,
        event("2026-11-26T19:00:00+09:00", "fun", 3000),
      ],
      new Set([recorded.id]),
      days,
    );
    expect(plans).toEqual([{ date: "2026-11-26", amount: 3000 }]);
  });

  it("今日すでに終わった予定も、記録されていなければ入れる（時刻は見ない）", () => {
    const plans = selectBudgetPlans(
      [event("2026-11-25T00:00:00+09:00", "meal", 800)],
      new Set(),
      days,
    );
    expect(plans).toEqual([{ date: "2026-11-25", amount: 800 }]);
  });

  it("days の外（過ぎた日・日曜より後・翌月）の予定は入れない", () => {
    const plans = selectBudgetPlans(
      [
        event("2026-11-24T19:00:00+09:00", "drink", 4000),
        event("2026-11-28T19:00:00+09:00", "drink", 4000),
        event("2026-12-01T19:00:00+09:00", "drink", 4000),
      ],
      new Set(),
      days,
    );
    expect(plans).toEqual([]);
  });

  it("記録済みかは id だけで決める（支出の日付が別の月でも外す）", () => {
    const e = event("2026-11-26T19:00:00+09:00", "drink", 4000);
    // 呼び出し側（getHomeSummary）は、支出の日付を見ずに event_id から recordedEventIds を作る
    expect(selectBudgetPlans([e], new Set([e.id]), days)).toEqual([]);
  });
});

describe("buildHomeSummary（予定分を取り分けた日ごとの目安）", () => {
  // 自由に使えるお金 30,000円 → 11月（30日）の今週の予算 7,000円
  function input(over: Partial<HomeSummaryInput> = {}): HomeSummaryInput {
    return {
      incomes: [{ amount: 30000 }],
      fixedCosts: [],
      goal: null,
      monthExpenses: [{ amount: 1000, spent_on: "2026-11-24" }],
      events: [],
      recordedEventIds: new Set(),
      ...over,
    };
  }

  it("予定が無ければ、今週あとを今日〜日曜で均等に配る", () => {
    const home = buildHomeSummary(input(), "2026-11-25");
    expect(home.weekBudget).toBe(7000);
    expect(home.weekLeft).toBe(6000);
    // 6,000 ÷ 5日 = 1,200
    expect(home.todayGuide).toBe(1200);
    expect(home.plannedTotal).toBe(0);
    expect(home.normalLeft).toBe(6000);
    expect(home.shortage).toBe(0);
  });

  it("予定分を取り分けて、その日の目安に乗せる。今日の目安も変わる", () => {
    const home = buildHomeSummary(
      input({ events: [event("2026-11-27T19:00:00+09:00", "drink", 2000)] }),
      "2026-11-25",
    );
    // 今週あとは予定分込みのまま
    expect(home.weekLeft).toBe(6000);
    expect(home.plannedTotal).toBe(2000);
    expect(home.normalLeft).toBe(4000);
    // (6,000 − 2,000) ÷ 5日 = 800
    expect(home.todayGuide).toBe(800);

    const byDate = Object.fromEntries(home.days.map((d) => [d.date, d]));
    expect(byDate["2026-11-27"]).toMatchObject({ normal: 800, planned: 2000, guide: 2800 });
    expect(byDate["2026-11-25"]).toMatchObject({ normal: 800, planned: 0, guide: 800 });
    // 過ぎた日は null
    expect(byDate["2026-11-23"]).toMatchObject({ guide: null, normal: null, planned: null });
  });

  it("記録済み・work・0円の予定は取り分けない（plannedAmount には入る）", () => {
    const recorded = event("2026-11-26T12:00:00+09:00", "meal", 1500);
    const home = buildHomeSummary(
      input({
        events: [
          recorded,
          event("2026-11-26T09:00:00+09:00", "work", 3000),
          event("2026-11-26T10:00:00+09:00", "other", 0),
        ],
        recordedEventIds: new Set([recorded.id]),
      }),
      "2026-11-25",
    );
    expect(home.plannedTotal).toBe(0);
    expect(home.todayGuide).toBe(1200);
    const day = home.days.find((d) => d.date === "2026-11-26")!;
    expect(day).toMatchObject({ planned: 0, guide: 1200, eventCount: 3, plannedAmount: 4500 });
  });

  it("予定分が今週あとを超えたら shortage に出す", () => {
    const home = buildHomeSummary(
      input({ events: [event("2026-11-26T19:00:00+09:00", "trip", 7000)] }),
      "2026-11-25",
    );
    expect(home.plannedTotal).toBe(7000);
    expect(home.normalLeft).toBe(0);
    expect(home.shortage).toBe(1000);
    expect(home.todayGuide).toBe(0);
    expect(home.days.find((d) => d.date === "2026-11-26")!.guide).toBe(7000);
  });

  it("月末の週：翌月の日は日付だけ出して目安0。翌月の予定は取り分けない", () => {
    const home = buildHomeSummary(
      input({
        monthExpenses: [],
        events: [event("2026-12-02T19:00:00+09:00", "drink", 4000)],
      }),
      "2026-11-30",
    );
    expect(home.days.map((d) => d.date)).toEqual([
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
      "2026-12-03",
      "2026-12-04",
      "2026-12-05",
      "2026-12-06",
    ]);
    expect(home.plannedTotal).toBe(0);
    // 今週あと 7,000円が、月末の1日に全部入る（PR で計算担当に知らせる点）
    expect(home.todayGuide).toBe(7000);
    const dec2 = home.days.find((d) => d.date === "2026-12-02")!;
    expect(dec2).toMatchObject({
      inMonth: false,
      guide: 0,
      normal: null,
      planned: null,
      plannedAmount: 4000,
    });
  });
});
