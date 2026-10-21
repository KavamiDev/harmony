import { describe, expect, it } from "vitest";
import { monthGrid, groupByDay, dayBucket } from "./calendar";

describe("monthGrid", () => {
  it("starts on Monday and pads with the neighbour months", () => {
    const g = monthGrid(2026, 9); // October 2026, starts on a Thursday
    expect(g).toHaveLength(5);
    expect(g[0]).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(g.at(-1)).toEqual(["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
  });
  it("has 4 rows when the month fits exactly", () => {
    expect(monthGrid(2027, 1)).toHaveLength(4); // February 2027 starts on a Monday
  });
  it("has 6 rows when needed", () => {
    expect(monthGrid(2026, 7)).toHaveLength(6); // August 2026 starts on a Saturday, 31 days
  });
});

describe("groupByDay", () => {
  it("groups events by local day and sorts them by time", () => {
    const events = [
      { id: "b", starts_at: "2026-10-22T14:00:00Z" },
      { id: "a", starts_at: "2026-10-22T07:00:00Z" },
      { id: "c", starts_at: "2026-10-23T09:00:00Z" },
    ];
    const g = groupByDay(events, (iso) => iso.slice(0, 10));
    expect([...g.keys()]).toEqual(["2026-10-22", "2026-10-23"]);
    expect(g.get("2026-10-22")!.map((e) => e.id)).toEqual(["a", "b"]);
  });
});

describe("dayBucket", () => {
  const today = "2026-10-21";
  it.each([
    ["2026-10-21", "Aujourd'hui"],
    ["2026-10-20", "Hier"],
  ])("%s → %s", (d, out) => expect(dayBucket(d, today)).toBe(out));
  it("names older days in French", () => {
    expect(dayBucket("2026-10-15", today)).toBe("jeudi 15 octobre");
  });
});
