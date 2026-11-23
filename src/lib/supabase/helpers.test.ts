import { describe, expect, it } from "vitest";
import { assertOwnEvent, type DataClient } from "./helpers";

/**
 * events を読むだけの偽物の Supabase クライアント。
 * RLS と同じく、visibleIds（自分の予定）だけが見える
 */
function fakeClient(visibleIds: number[], fail = false): { client: DataClient; asked: number[] } {
  const asked: number[] = [];
  const client = {
    from(table: string) {
      expect(table).toBe("events");
      return {
        select: () => ({
          eq: (_column: string, id: number) => ({
            maybeSingle: async () => {
              asked.push(id);
              if (fail) return { data: null, error: { message: "network" } };
              return { data: visibleIds.includes(id) ? { id } : null, error: null };
            },
          }),
        }),
      };
    },
  } as unknown as DataClient;
  return { client, asked };
}

describe("assertOwnEvent（支出を結びつける前に、自分の予定かを確かめる）", () => {
  it("自分の予定なら通る", async () => {
    const { client, asked } = fakeClient([10, 11]);
    await expect(assertOwnEvent(10, client)).resolves.toBeUndefined();
    expect(asked).toEqual([10]);
  });

  it("他人の予定・存在しない予定（RLS で見えない）なら Error", async () => {
    const { client } = fakeClient([10]);
    await expect(assertOwnEvent(999, client)).rejects.toThrow("結びつける予定が見つかりませんでした");
  });

  it("読み込みに失敗したら日本語の Error", async () => {
    const { client } = fakeClient([10], true);
    await expect(assertOwnEvent(10, client)).rejects.toThrow("予定の読み込みに失敗しました");
  });
});
