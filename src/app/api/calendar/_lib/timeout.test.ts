import { afterEach, describe, expect, it, vi } from "vitest";
import {
  calendarWriteTimeoutMs,
  DEFAULT_CALENDAR_WRITE_TIMEOUT_MS,
  GoogleTimeoutError,
  withTimeout,
} from "./timeout";

afterEach(() => {
  vi.useRealTimers();
});

describe("withTimeout（Google の呼び出しに時間切れを付ける）", () => {
  it("制限時間より前に終われば、そのまま結果を返す", async () => {
    await expect(withTimeout(async () => "ok", 1000)).resolves.toBe("ok");
  });

  it("時間切れなら GoogleTimeoutError を投げ、signal が打ち切られている", async () => {
    let seen: AbortSignal | undefined;
    const result = withTimeout(
      (signal) => {
        seen = signal;
        // fetch と同じく、打ち切られたら失敗する処理
        return new Promise((_, reject) => {
          signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        });
      },
      10,
    );
    await expect(result).rejects.toBeInstanceOf(GoogleTimeoutError);
    await expect(result).rejects.toThrow("制限時間（10ms）");
    expect(seen?.aborted).toBe(true);
    expect(seen?.reason).toBeInstanceOf(GoogleTimeoutError);
  });

  it("signal を見ない処理でも、時間切れで戻る", async () => {
    vi.useFakeTimers();
    const never = new Promise<string>(() => {});
    const result = withTimeout(() => never, 8000);
    const check = expect(result).rejects.toBeInstanceOf(GoogleTimeoutError);
    await vi.advanceTimersByTimeAsync(8000);
    await check;
  });

  it("fn のエラーは、そのまま上に伝わる（時間切れにならない）", async () => {
    const error = new Error("Google が 500 を返しました");
    await expect(
      withTimeout(async () => {
        throw error;
      }, 1000),
    ).rejects.toBe(error);
  });

  it("終わったあとに、タイマーが残っていない", async () => {
    vi.useFakeTimers();
    await withTimeout(async () => 1, 8000);
    expect(vi.getTimerCount()).toBe(0);
    await withTimeout(async () => {
      throw new Error("x");
    }, 8000).catch(() => {});
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("calendarWriteTimeoutMs（制限時間。.env.local で変えられる）", () => {
  it("決めていなければ 8000", () => {
    expect(calendarWriteTimeoutMs(undefined)).toBe(8000);
    expect(calendarWriteTimeoutMs("")).toBe(DEFAULT_CALENDAR_WRITE_TIMEOUT_MS);
  });

  it("1以上の整数なら、その値", () => {
    expect(calendarWriteTimeoutMs("1")).toBe(1);
    expect(calendarWriteTimeoutMs("3000")).toBe(3000);
  });

  it("おかしな値なら 8000", () => {
    for (const value of ["0", "-5", "1.5", "abc", "8s"]) {
      expect(calendarWriteTimeoutMs(value)).toBe(8000);
    }
  });
});
