import { describe, expect, it } from "vitest";
import { newInviteToken, hashToken, inviteStatus, INVITE_DAYS } from "./invite";

describe("newInviteToken", () => {
  it("is 128 bits in base64url (22 chars)", () => {
    const t = newInviteToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(newInviteToken()).not.toBe(t);
  });
});

describe("hashToken", () => {
  it("is SHA-256 hex", async () => {
    expect(await hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("inviteStatus", () => {
  const now = Date.parse("2026-10-20T10:00:00Z");
  const base = { expires_at: new Date(now + 86_400_000).toISOString(), used_at: null };
  it("is ok when fresh and the family has one parent", () => {
    expect(inviteStatus(base, 1, now)).toBe("ok");
  });
  it.each([
    [{ ...base, used_at: "2026-10-19T10:00:00Z" }, 1, "used"],
    [{ ...base, expires_at: "2026-10-20T09:59:59Z" }, 1, "expired"],
    [base, 2, "full"],
  ] as const)("%j with %i parent(s) → %s", (inv, members, out) => {
    expect(inviteStatus(inv, members, now)).toBe(out);
  });
  it("lasts 7 days", () => expect(INVITE_DAYS).toBe(7));
});
