import { describe, expect, it } from "vitest";
import { newGoogleEventRow } from "./newEventRow";

const times = (title: string) => ({
  title,
  starts_at: "2026-11-27T10:00:00.000Z",
  ends_at: "2026-11-27T12:00:00.000Z",
});

describe("newGoogleEventRow（Google から新しく入れる予定の行）", () => {
  it("タイトルから種類と予想金額を入れる", () => {
    expect(newGoogleEventRow("g1", times("サークル飲み会"), "u1")).toEqual({
      title: "サークル飲み会",
      starts_at: "2026-11-27T10:00:00.000Z",
      ends_at: "2026-11-27T12:00:00.000Z",
      google_event_id: "g1",
      user_id: "u1",
      kind: "drink",
      estimated_amount: 4000,
    });
  });

  it("バイトは work・0円", () => {
    expect(newGoogleEventRow("g2", times("バイト"), "u1")).toMatchObject({
      kind: "work",
      estimated_amount: 0,
    });
  });

  it("当てはまらないタイトル（授業など）は other・0円", () => {
    expect(newGoogleEventRow("g3", times("統計学の授業"), "u1")).toMatchObject({
      kind: "other",
      estimated_amount: 0,
    });
  });
});
