import { describe, expect, it } from "vitest";
import { addressMessage, RECIPIENTS } from "./address-kit";

const ctx = { child: "Léa", address: "lea.devc@harmony.fr", parents: ["Camille", "Alex"], signer: "Camille" };

describe("addressMessage", () => {
  it("writes a ready-to-send note for the school", () => {
    const m = addressMessage("school", ctx);
    expect(m.subject).toBe("Nouvelle adresse de contact pour Léa");
    expect(m.body).toContain("lea.devc@harmony.fr");
    expect(m.body).toContain("mots, sorties, réunions, absences");
    expect(m.body).toContain("à ses deux parents en même temps, Camille et Alex");
    expect(m.body.trim().endsWith("Camille")).toBe(true);
  });
  it("asks the doctor not to send medical results", () => {
    expect(addressMessage("doctor", ctx).body).toContain("ni résultats ni ordonnances");
  });
  it("works before the second parent joins", () => {
    expect(addressMessage("activity", { ...ctx, parents: ["Camille"] }).body).toContain("à ses deux parents en même temps.");
  });
  it("has a label for every recipient", () => {
    expect(Object.keys(RECIPIENTS)).toEqual(["school", "doctor", "activity", "other"]);
  });
});
