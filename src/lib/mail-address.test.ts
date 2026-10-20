import { describe, expect, it } from "vitest";
import { normalizeFirstName, makeMailLocal, isMailLocal, recipientLocal } from "./mail-address";

describe("normalizeFirstName", () => {
  it.each([
    ["Léa", "lea"],
    ["  Chloé-Marie ", "chloemarie"],
    ["Noé", "noe"],
    ["Zoë", "zoe"],
    ["Jean Baptiste", "jeanbaptiste"],
    ["Maximilien-Alexandre-Philippe", "maximilienalexandrep"],
  ])("%j → %j", (input, out) => expect(normalizeFirstName(input)).toBe(out));

  it.each(["", "  ", "é", "!!", "李"])("rejects %j", (input) => expect(normalizeFirstName(input)).toBeNull());
});

describe("makeMailLocal", () => {
  it("adds a 4-char suffix without ambiguous characters", () => {
    const local = makeMailLocal("Léa", () => 0);
    expect(local).toBe("lea.aaaa");
    const r = makeMailLocal("Léa");
    expect(r).toMatch(/^lea\.[abcdefghjkmnpqrstuvwxyz23456789]{4}$/);
  });
  it("never uses 0, 1, i, l, o", () => {
    for (let i = 0; i < 200; i++) expect(makeMailLocal("tom")!.split(".")[1]).not.toMatch(/[01ilo]/);
  });
  it("returns null for an unusable first name", () => {
    expect(makeMailLocal("!!")).toBeNull();
  });
});

describe("isMailLocal", () => {
  it.each(["lea.k7m2", "jeanbaptiste.abcd", "li.zz22"])("accepts %s", (s) => expect(isMailLocal(s)).toBe(true));
  it.each(["lea", "lea.k7m", "lea.k7m22", "Lea.k7m2", "l.k7m2", "lea.k0m2", "lea_k7m2"])("rejects %s", (s) =>
    expect(isMailLocal(s)).toBe(false));
});

describe("recipientLocal", () => {
  it("extracts the local part for our domain, case-insensitive", () => {
    expect(recipientLocal("Lea.K7M2@Harmony.example", "harmony.example")).toBe("lea.k7m2");
    expect(recipientLocal("<lea.k7m2@harmony.example>", "harmony.example")).toBe("lea.k7m2");
  });
  it("refuses other domains or malformed locals", () => {
    expect(recipientLocal("lea.k7m2@evil.example", "harmony.example")).toBeNull();
    expect(recipientLocal("admin@harmony.example", "harmony.example")).toBeNull();
    expect(recipientLocal("not an address", "harmony.example")).toBeNull();
  });
});
