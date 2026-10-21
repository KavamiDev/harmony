import { describe, expect, it } from "vitest";
import { describeChange, cycleLabel } from "./change-text";

const names = { A: "Camille", B: "Alex" };

describe("describeChange", () => {
  it("describes a one-day and a multi-day override", () => {
    expect(describeChange({ kind: "override", start_date: "2026-10-24", end_date: "2026-10-24", side: "B" }, names, "Léa"))
      .toBe("Léa chez Alex le samedi 24 octobre");
    expect(describeChange({ kind: "override", start_date: "2026-10-24", end_date: "2026-10-26", side: "A" }, names, "Léa"))
      .toBe("Léa chez Camille du samedi 24 au lundi 26 octobre");
    expect(describeChange({ kind: "override", start_date: "2026-10-31", end_date: "2026-11-02", side: "A" }, names, "Léa"))
      .toBe("Léa chez Camille du samedi 31 octobre au lundi 2 novembre");
  });
  it("describes a new rhythm", () => {
    expect(describeChange({ kind: "cycle", cycle: "AABBAAABBAABBB", handover_time: "17:30:00" }, names, "Léa"))
      .toBe("Nouveau rythme : 2-2-3, changement à 17 h 30");
    expect(describeChange({ kind: "cycle", cycle: "ABABABABABABAB", handover_time: "18:00:00" }, names, "Léa"))
      .toBe("Nouveau rythme : personnalisé, changement à 18 h");
  });
});

describe("cycleLabel", () => {
  it("names presets and custom cycles", () => {
    expect(cycleLabel("AAAAAAABBBBBBB")).toBe("Une semaine sur deux");
    expect(cycleLabel("AABBBAABBBAAAA")).toBe("Personnalisé");
  });
});
