import { describe, expect, it } from "vitest";
import { freeMoney, monthLeft } from "./budget";

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
