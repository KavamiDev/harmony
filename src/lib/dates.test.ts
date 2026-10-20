import { describe, expect, it } from "vitest";
import { addDays, fmtHandover } from "./dates";

describe("dates", () => {
  it.each([["18:00:00", "18 h"], ["17:30:00", "17 h 30"], ["08:05", "8 h 05"]])("fmtHandover %s → %s", (t, out) => expect(fmtHandover(t)).toBe(out));
  it("adds days across month ends and DST", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-10-25", -7)).toBe("2026-10-18");
  });
});
