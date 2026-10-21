import { describe, expect, it } from "vitest";
import { PRESETS, custodyOn, custodyRange, handovers, isValidCycle, mondayOf } from "./custody";

const plan = (cycle: string, anchor = "2026-10-19") => ({ cycle, anchor });

describe("presets", () => {
  it("are all valid 14-day cycles", () => {
    for (const p of Object.values(PRESETS)) expect(isValidCycle(p.cycle)).toBe(true);
  });
  it("2-2-3 mirrors itself the second week", () => {
    expect(PRESETS["2-2-3"].cycle).toBe("AABBAAABBAABBB");
  });
});

describe("isValidCycle", () => {
  it.each(["AAAAAAA", "AAAAAAABBBBBBB"])("accepts %s", (c) => expect(isValidCycle(c)).toBe(true));
  it.each(["", "AAAA", "AAAAAAX", "aaaaaaa", "AAAAAAABBBBBB"])("rejects %j", (c) => expect(isValidCycle(c)).toBe(false));
});

describe("custodyOn", () => {
  const alt = plan(PRESETS.alternate.cycle);
  it("follows the cycle from the anchor", () => {
    expect(custodyOn(alt, "2026-10-19")).toBe("A"); // anchor Monday
    expect(custodyOn(alt, "2026-10-25")).toBe("A"); // Sunday, same week
    expect(custodyOn(alt, "2026-10-26")).toBe("B"); // next Monday
    expect(custodyOn(alt, "2026-11-02")).toBe("A"); // two weeks later
  });
  it("works before the anchor", () => {
    expect(custodyOn(alt, "2026-10-18")).toBe("B");
    expect(custodyOn(alt, "2026-10-05")).toBe("A");
  });
  it("handles 2-2-3 days", () => {
    const p = plan(PRESETS["2-2-3"].cycle);
    expect(["2026-10-19", "2026-10-21", "2026-10-23", "2026-10-26", "2026-10-28", "2026-10-30"].map((d) => custodyOn(p, d)))
      .toEqual(["A", "B", "A", "B", "A", "B"]);
  });
  it("is not shifted by daylight saving time", () => {
    // France switches to winter time on 2026-10-25
    const p = plan("AB".repeat(7));
    expect(custodyOn(p, "2026-10-24")).toBe("B");
    expect(custodyOn(p, "2026-10-25")).toBe("A");
    expect(custodyOn(p, "2026-10-26")).toBe("B");
  });
});

describe("custodyRange / handovers", () => {
  const p = plan(PRESETS.weekends.cycle);
  it("lists every day inclusive", () => {
    const r = custodyRange(p, "2026-10-19", "2026-10-25");
    expect(r.map((d) => d.side).join("")).toBe("AAAABBB");
    expect(r[0]).toEqual({ date: "2026-10-19", side: "A" });
    expect(r).toHaveLength(7);
  });
  it("finds the days where the child changes home", () => {
    expect(handovers(p, "2026-10-19", "2026-11-01")).toEqual([
      { date: "2026-10-23", to: "B" },
      { date: "2026-10-26", to: "A" },
    ]);
  });
  it("returns nothing for an empty range", () => {
    expect(custodyRange(p, "2026-10-20", "2026-10-19")).toEqual([]);
  });
});

describe("mondayOf", () => {
  it.each([
    ["2026-10-19", "2026-10-19"],
    ["2026-10-22", "2026-10-19"],
    ["2026-10-25", "2026-10-19"],
    ["2026-10-26", "2026-10-26"],
  ])("%s → %s", (d, m) => expect(mondayOf(d)).toBe(m));
});

describe("overrides (accepted day changes)", () => {
  const alt = plan(PRESETS.alternate.cycle); // week of 19 Oct: A, week of 26 Oct: B
  const ov = (start_date: string, end_date: string, side: "A" | "B", decided_at = "2026-10-20T10:00:00Z") => ({ start_date, end_date, side, decided_at });

  it("wins over the cycle on the covered days only", () => {
    const o = [ov("2026-10-24", "2026-10-25", "B")];
    expect(custodyOn(alt, "2026-10-23", o)).toBe("A");
    expect(custodyOn(alt, "2026-10-24", o)).toBe("B");
    expect(custodyOn(alt, "2026-10-25", o)).toBe("B");
    expect(custodyOn(alt, "2026-10-26", o)).toBe("B"); // back to the cycle (B week anyway)
    expect(custodyOn(alt, "2026-10-27", [ov("2026-10-27", "2026-10-27", "A")])).toBe("A");
  });

  it("uses the most recently decided change when two overlap", () => {
    const o = [ov("2026-10-22", "2026-10-25", "B", "2026-10-20T10:00:00Z"), ov("2026-10-24", "2026-10-24", "A", "2026-10-21T10:00:00Z")];
    expect(custodyOn(alt, "2026-10-23", o)).toBe("B");
    expect(custodyOn(alt, "2026-10-24", o)).toBe("A");
  });

  it("is applied by custodyRange and handovers", () => {
    const o = [ov("2026-10-24", "2026-10-25", "B")];
    expect(custodyRange(alt, "2026-10-22", "2026-10-26", o).map((d) => d.side).join("")).toBe("AABBB");
    expect(handovers(alt, "2026-10-19", "2026-10-27", o)).toEqual([{ date: "2026-10-24", to: "B" }]);
  });
});

describe("customCycle helpers", () => {
  it("toggles one day of a cycle", async () => {
    const { toggleDay } = await import("./custody");
    expect(toggleDay("AAAAAAABBBBBBB", 0)).toBe("BAAAAAABBBBBBB");
    expect(toggleDay("AAAAAAABBBBBBB", 13)).toBe("AAAAAAABBBBBBA");
  });
});
