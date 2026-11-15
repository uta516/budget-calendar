import { describe, expect, it } from "vitest";
import {
  freeMoney,
  monthLeft,
  weekBudget,
  weekLeft,
  todayGuide,
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
