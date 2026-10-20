import { describe, expect, it } from "vitest";
import { planStatus, canWrite, trialEnd, TRIAL_DAYS } from "./subscription";

const now = Date.parse("2026-11-10T12:00:00Z");

describe("planStatus", () => {
  it("is trialing during the 14 free days", () => {
    expect(planStatus({ trial_ends_at: "2026-11-11T00:00:00Z", paid_until: null }, now)).toBe("trialing");
  });
  it("is active while paid, even during the trial", () => {
    expect(planStatus({ trial_ends_at: "2026-11-11T00:00:00Z", paid_until: "2027-11-01T00:00:00Z" }, now)).toBe("active");
  });
  it("is expired otherwise", () => {
    expect(planStatus({ trial_ends_at: "2026-11-01T00:00:00Z", paid_until: null }, now)).toBe("expired");
    expect(planStatus({ trial_ends_at: "2026-11-01T00:00:00Z", paid_until: "2026-11-09T00:00:00Z" }, now)).toBe("expired");
  });
});

describe("canWrite / trialEnd", () => {
  it("blocks writes only when expired", () => {
    expect(canWrite("trialing")).toBe(true);
    expect(canWrite("active")).toBe(true);
    expect(canWrite("expired")).toBe(false);
  });
  it("ends the trial 14 days after creation", () => {
    expect(TRIAL_DAYS).toBe(14);
    expect(trialEnd(Date.parse("2026-10-19T08:00:00Z"))).toBe("2026-11-02T08:00:00.000Z");
  });
});
