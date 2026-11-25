import { describe, expect, it } from "vitest";
import {
  freeMoney,
  monthLeft,
  weekBudget,
  weekLeft,
  todayGuide,
  categoryLeft,
  allocateDailyBudget,
  estimateEventAmount,
  classifyEventTitle,
  estimateEvent,
} from "./budget";

describe("freeMoney", () => {
  it.each([
    [82800, 10500, 10000, 62300],
    [50000, 60000, 0, 0],
    [50000, 40000, 20000, 0],
    [50000, 40000, 10000, 0],
    [50000, 0, 0, 50000],
    [0, 0, 0, 0],
  ])(
    "収入%d円・固定費%d円・貯金%d円なら自由予算は%d円",
    (income, fixedCosts, saving, expected) => {
      expect(freeMoney(income, fixedCosts, saving)).toBe(expected);
    },
  );
});

describe("monthLeft", () => {
  it.each([
    [62300, 19000, 43300],
    [10000, 12000, -2000],
    [10000, 10000, 0],
    [10000, 0, 10000],
    [0, 1000, -1000],
    [0, 0, 0],
  ])(
    "自由予算%d円・使用額%d円なら残額は%d円",
    (free, spentThisMonth, expected) => {
      expect(monthLeft(free, spentThisMonth)).toBe(expected);
    },
  );
});

describe("weekBudget", () => {
  it.each([
    ["28日の月", 2026, 1, 15, 62300, 15570],
    ["うるう年の29日の月", 2024, 1, 29, 62300, 15030],
    ["30日の月", 2026, 10, 15, 62300, 14530],
    ["31日の月", 2026, 0, 15, 62300, 14060],
    ["月をまたぐ週の8月31日", 2026, 7, 31, 62300, 14060],
    ["同じ週の9月1日", 2026, 8, 1, 62300, 14530],
    ["自由予算0円", 2026, 10, 15, 0, 0],
    ["10円未満を切り捨て", 2026, 1, 15, 39, 0],
    ["日割りを先に丸めず最後に切り捨て", 2026, 1, 15, 42, 10],
  ])("%s", (_label, year, month, day, free, expected) => {
    expect(weekBudget(free, new Date(year, month, day))).toBe(expected);
  });

  it("引数の日付を変更しない", () => {
    const today = new Date(2026, 11, 31, 23, 59);
    const originalTime = today.getTime();
    expect(weekBudget(62300, today)).toBe(14060);
    expect(today.getTime()).toBe(originalTime);
  });
});

describe("weekLeft", () => {
  it.each([
    [14500, 6100, 8400],
    [1000, 1000, 0],
    [1000, 1200, -200],
    [14500, 0, 14500],
    [0, 0, 0],
  ])("週予算%d円・使用額%d円なら残額は%d円", (weekly, spent, expected) => {
    expect(weekLeft(weekly, spent)).toBe(expected);
  });
});

describe("todayGuide", () => {
  it.each([
    ["月曜は今日を含め7日", 2026, 10, 9, 8400, 1200],
    ["火曜は6日", 2026, 10, 10, 8400, 1400],
    ["水曜は5日", 2026, 10, 11, 8400, 1680],
    ["木曜は4日", 2026, 10, 12, 8400, 2100],
    ["金曜は3日", 2026, 10, 13, 8400, 2800],
    ["土曜は2日", 2026, 10, 14, 8400, 4200],
    ["日曜は1日", 2026, 10, 15, 8400, 8400],
    ["残額0円", 2026, 10, 9, 0, 0],
    ["残額マイナスは0円", 2026, 10, 15, -100, 0],
    ["日割りで10円未満になる場合", 2026, 10, 9, 60, 0],
    ["日割り後の端数を切り捨て", 2026, 10, 9, 1000, 140],
    ["日曜でも10円単位に切り捨て", 2026, 10, 15, 8499, 8490],
    ["月末で区切らず日曜まで数える", 2026, 7, 31, 8400, 1200],
  ])("%s", (_label, year, month, day, remaining, expected) => {
    expect(todayGuide(remaining, new Date(year, month, day))).toBe(expected);
  });

  it("引数の日付を変更しない", () => {
    const today = new Date(2026, 10, 14, 23, 59);
    const originalTime = today.getTime();
    expect(todayGuide(8400, today)).toBe(4200);
    expect(today.getTime()).toBe(originalTime);
  });
});

describe("categoryLeft", () => {
  it.each([
    [25000, 11200, 13800],
    [10000, 10000, 0],
    [10000, 12000, -2000],
    [10000, 0, 10000],
    [0, 1000, -1000],
    [0, 0, 0],
    [1001, 2, 999],
  ])("カテゴリ予算%d円・使用額%d円なら残額は%d円", (budget, spent, expected) => {
    expect(categoryLeft(budget, spent)).toBe(expected);
  });
});

describe("allocateDailyBudget", () => {
  const days = ["2026-11-25", "2026-11-26", "2026-11-27"];

  it("予定分を先に取り分け、予定がある日の目安に加える", () => {
    expect(allocateDailyBudget(days, 9000, [{ date: days[2], amount: 3000 }])).toEqual({
      daily: [
        { date: days[0], normal: 2000, planned: 0, guide: 2000 },
        { date: days[1], normal: 2000, planned: 0, guide: 2000 },
        { date: days[2], normal: 2000, planned: 3000, guide: 5000 },
      ],
      plannedTotal: 3000,
      normalLeft: 6000,
      shortage: 0,
    });
  });

  it("予定がなければ全額を均等配分する", () => {
    expect(allocateDailyBudget(days, 9000, [])).toEqual({
      daily: days.map((date) => ({ date, normal: 3000, planned: 0, guide: 3000 })),
      plannedTotal: 0, normalLeft: 9000, shortage: 0,
    });
  });

  it("同じ日の複数予定を合算する", () => {
    const result = allocateDailyBudget(days, 9000, [
      { date: days[1], amount: 1000 }, { date: days[1], amount: 2000 },
    ]);
    expect(result.plannedTotal).toBe(3000);
    expect(result.daily[1]).toEqual({ date: days[1], normal: 2000, planned: 3000, guide: 5000 });
  });

  it("複数日の予定をそれぞれの日に加える", () => {
    expect(allocateDailyBudget(days, 9000, [
      { date: days[2], amount: 2000 }, { date: days[0], amount: 1000 },
    ])).toEqual({
      daily: [
        { date: days[0], normal: 2000, planned: 1000, guide: 3000 },
        { date: days[1], normal: 2000, planned: 0, guide: 2000 },
        { date: days[2], normal: 2000, planned: 2000, guide: 4000 },
      ],
      plannedTotal: 3000, normalLeft: 6000, shortage: 0,
    });
  });

  it("0円の予定でも普段使い分を減らさない", () => {
    expect(allocateDailyBudget([days[0]], 1000, [{ date: days[0], amount: 0 }])).toEqual({
      daily: [{ date: days[0], normal: 1000, planned: 0, guide: 1000 }],
      plannedTotal: 0, normalLeft: 1000, shortage: 0,
    });
  });

  it.each([
    ["予定合計と残額が等しい", 3000, 3000, 0],
    ["予定合計が残額を超える", 1000, 3000, 2000],
    ["残額0円で予定がある", 0, 3000, 3000],
    ["残額も予定も0円", 0, 0, 0],
    ["残額マイナスで予定がある", -1000, 3000, 4000],
    ["残額マイナスで予定がない", -1000, 0, 1000],
  ])("%s", (_label, remaining, amount, shortage) => {
    const plans = amount === 0 ? [] : [{ date: days[0], amount }];
    expect(allocateDailyBudget([days[0]], remaining, plans)).toEqual({
      daily: [{ date: days[0], normal: 0, planned: amount, guide: amount }],
      plannedTotal: amount, normalLeft: 0, shortage,
    });
  });

  it("月末の対象日1日へ全額を配分する", () => {
    expect(allocateDailyBudget(["2026-11-30"], 9000, [
      { date: "2026-11-30", amount: 3000 },
    ])).toEqual({
      daily: [{ date: "2026-11-30", normal: 6000, planned: 3000, guide: 9000 }],
      plannedTotal: 3000, normalLeft: 6000, shortage: 0,
    });
  });

  it("最後に10円単位で切り捨て、残額自体は丸めず余りも配らない", () => {
    const result = allocateDailyBudget(days, 1001, []);
    expect(result).toEqual({
      daily: days.map((date) => ({ date, normal: 330, planned: 0, guide: 330 })),
      plannedTotal: 0, normalLeft: 1001, shortage: 0,
    });
    expect(result.daily.reduce((total, day) => total + day.guide, 0)).toBe(990);
  });

  it("1日分が10円未満なら普段使い分は0円", () => {
    expect(allocateDailyBudget(days, 29, []).daily).toEqual(
      days.map((date) => ({ date, normal: 0, planned: 0, guide: 0 })),
    );
  });

  it("予定金額と合計の目安は丸めない", () => {
    expect(allocateDailyBudget([days[0]], 2006, [{ date: days[0], amount: 1001 }])).toEqual({
      daily: [{ date: days[0], normal: 1000, planned: 1001, guide: 2001 }],
      plannedTotal: 1001, normalLeft: 1005, shortage: 0,
    });
  });

  it("対象日が空でも残額を返し、日割りは行わない", () => {
    expect(allocateDailyBudget([], 1001, [])).toEqual({
      daily: [], plannedTotal: 0, normalLeft: 1001, shortage: 0,
    });
  });

  it("対象日が空でも渡された予定の合計と不足額を計算する", () => {
    expect(allocateDailyBudget([], -100, [{ date: days[0], amount: 1001 }])).toEqual({
      daily: [], plannedTotal: 1001, normalLeft: 0, shortage: 1101,
    });
  });

  it("入力の配列・予定オブジェクトを変更せず、日付順を維持する", () => {
    const frozenDays = Object.freeze([...days]);
    const plans = Object.freeze([
      Object.freeze({ date: days[2], amount: 2000 }),
      Object.freeze({ date: days[0], amount: 1000 }),
    ]);
    const result = allocateDailyBudget(frozenDays, 9000, plans);
    expect(frozenDays).toEqual(["2026-11-25", "2026-11-26", "2026-11-27"]);
    expect(plans).toEqual([
      { date: "2026-11-27", amount: 2000 }, { date: "2026-11-25", amount: 1000 },
    ]);
    expect(result.daily.map((day) => day.date)).toEqual([...frozenDays]);
  });
});

describe("estimateEventAmount", () => {
  it.each([
    ["drink", 4000],
    ["meal", 1500],
    ["fun", 3000],
    ["trip", 20000],
    ["shop", 3000],
    ["work", 0],
    ["other", 0],
  ] as const)("%sの仮の目安金額は%d円", (kind, expected) => {
    expect(estimateEventAmount(kind)).toBe(expected);
  });
});

describe("classifyEventTitle", () => {
  it.each([
    ["バイト", "work"],
    ["アルバイト", "work"],
    ["シフト", "work"],
    ["飲み会", "drink"],
    ["飲み", "drink"],
    ["打ち上げ", "drink"],
    ["旅行", "trip"],
    ["日帰り旅行", "trip"],
    ["ランチ", "meal"],
    ["ディナー", "meal"],
    ["外食", "meal"],
    ["映画", "fun"],
    ["カラオケ", "fun"],
    ["遊び", "fun"],
    ["デート", "fun"],
    ["買い物", "shop"],
    ["ショッピング", "shop"],
  ] as const)("キーワード「%s」を%sと判定する", (title, expected) => {
    expect(classifyEventTitle(title)).toBe(expected);
  });

  it.each([
    ["サークル飲み会", "drink"],
    ["ゼミの打ち上げ", "drink"],
    ["友達とランチ", "meal"],
    ["家族で日帰り旅行に行く", "trip"],
    ["今月のアルバイトのシフト", "work"],
    ["映画とカラオケ", "fun"],
    ["ランチのあとディナーも外食", "meal"],
    ["買い物とショッピング", "shop"],
    ["飲み会と打ち上げ", "drink"],
    ["  友達とランチ  ", "meal"],
    ["\t映画\n", "fun"],
    ["", "other"],
    ["  \t\n　", "other"],
    ["授業", "other"],
    ["ゼミの会議", "other"],
    ["バイト後に飲み会", "other"],
    ["旅行先で買い物", "other"],
    ["ランチと映画", "other"],
    ["飲み会のあとバイト", "other"],
    ["バイトと飲み会と映画", "other"],
  ] as const)("タイトル「%s」を%sと判定する", (title, expected) => {
    expect(classifyEventTitle(title)).toBe(expected);
  });
});

describe("estimateEvent", () => {
  it.each([
    ["サークル飲み会", "drink", 4000],
    ["友達とランチ", "meal", 1500],
    ["映画とカラオケ", "fun", 3000],
    ["日帰り旅行", "trip", 20000],
    ["買い物", "shop", 3000],
    ["アルバイト", "work", 0],
    ["授業", "other", 0],
    ["", "other", 0],
    [" 　\t", "other", 0],
    ["バイト後に飲み会", "other", 0],
    ["旅行先で買い物", "other", 0],
  ] as const)("「%s」から%s・%d円を返す", (title, kind, estimatedAmount) => {
    expect(estimateEvent(title)).toEqual({ kind, estimatedAmount });
  });
});
