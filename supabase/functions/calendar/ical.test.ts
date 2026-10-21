import { describe, expect, it } from "vitest";
import { buildICS, escapeText, foldLine } from "./ical";

const base = {
  child: "Léa",
  names: { A: "Camille", B: "Alex" },
  plan: { cycle: "AAAAAAABBBBBBB", anchor: "2026-10-19" },
  overrides: [{ start_date: "2026-10-24", end_date: "2026-10-25", side: "B", decided_at: "2026-10-21T10:00:00Z" }],
  from: "2026-10-19",
  to: "2026-11-01",
  now: Date.parse("2026-10-22T08:00:00Z"),
};

describe("buildICS", () => {
  const ics = buildICS({
    ...base,
    events: [
      { id: "e1", title: "Dentiste, contrôle", starts_at: "2026-10-22T12:30:00Z", ends_at: null, all_day: false, place: "Cabinet; Dr Laurent", notes: "Carnet\nde santé" },
      { id: "e2", title: "Sortie au musée", starts_at: "2026-10-29T12:00:00Z", ends_at: null, all_day: true, place: null, notes: null },
    ],
  });
  const lines = ics.split("\r\n");

  it("is a valid calendar with CRLF line endings", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines.at(-2)).toBe("END:VCALENDAR");
    expect(ics).toContain("X-WR-CALNAME:Garde de Léa");
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  it("merges custody days into blocks, overrides included", () => {
    // 19-23 at Camille's, then 24 Oct to 1 Nov at Alex's (override + B week)
    expect(ics).toContain("SUMMARY:Léa chez Camille");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261019\r\nDTEND;VALUE=DATE:20261024");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261024\r\nDTEND;VALUE=DATE:20261102");
    expect(ics.match(/SUMMARY:Léa chez/g)).toHaveLength(2);
  });

  it("adds appointments, timed in UTC or all-day, with escaped text", () => {
    expect(ics).toContain("UID:e1@harmony");
    expect(ics).toContain("DTSTART:20261022T123000Z\r\nDTEND:20261022T133000Z");
    expect(ics).toContain("SUMMARY:Dentiste\\, contrôle");
    expect(ics).toContain("LOCATION:Cabinet\; Dr Laurent");
    expect(ics).toContain("DESCRIPTION:Carnet\\nde santé");
    expect(ics).toContain("UID:e2@harmony\r\nDTSTAMP:20261022T080000Z\r\nDTSTART;VALUE=DATE:20261029\r\nDTEND;VALUE=DATE:20261030");
  });
});

describe("escapeText / foldLine", () => {
  it("escapes the iCalendar special characters", () => {
    expect(escapeText("a\\b;c,d\ne")).toBe("a\\\\b\;c\\,d\\ne");
  });
  it("folds long lines with a leading space", () => {
    const folded = foldLine("DESCRIPTION:" + "é".repeat(100));
    expect(folded.split("\r\n").every((l, i) => (i === 0 || l.startsWith(" ")) && new TextEncoder().encode(l).length <= 75)).toBe(true);
    expect(folded.replace(/\r\n /g, "")).toBe("DESCRIPTION:" + "é".repeat(100));
  });
});
