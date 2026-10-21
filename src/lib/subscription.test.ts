import { describe, expect, it } from "vitest";
import { planStatus, canWrite, trialEnd, TRIAL_DAYS, daysLeft, paymentUrl } from "./subscription";

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

describe("daysLeft / paymentUrl", () => {
  it("counts started days and never goes below zero", () => {
    expect(daysLeft("2026-11-11T00:00:00Z", now)).toBe(1);
    expect(daysLeft("2026-11-12T13:00:00Z", now)).toBe(3);
    expect(daysLeft("2026-11-01T00:00:00Z", now)).toBe(0);
  });
  it("adds the family id to the Stripe link, or returns null without a link", () => {
    expect(paymentUrl("https://buy.stripe.com/test_abc", "f-1")).toBe("https://buy.stripe.com/test_abc?client_reference_id=f-1");
    expect(paymentUrl("", "f-1")).toBeNull();
  });
});
