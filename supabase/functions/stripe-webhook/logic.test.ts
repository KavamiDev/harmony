import { describe, expect, it } from "vitest";
import { planUpdate, verifyStripeSignature } from "./logic";

const SECRET = "whsec_test_secret";
const FAMILY = "4dd2016e-a998-46d2-9328-62a03c4d558e";
const now = Date.parse("2026-10-22T10:00:00Z");

async function sign(payload: string, t: number, secret = SECRET) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`));
  return `t=${t},v1=${[...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

describe("verifyStripeSignature", () => {
  const payload = JSON.stringify({ id: "evt_1" });
  const t = Math.floor(now / 1000);
  it("accepts a valid, fresh signature", async () => {
    expect(await verifyStripeSignature(payload, await sign(payload, t), SECRET, now)).toBe(true);
  });
  it("rejects a wrong secret, a tampered body or an old timestamp", async () => {
    expect(await verifyStripeSignature(payload, await sign(payload, t, "whsec_other"), SECRET, now)).toBe(false);
    expect(await verifyStripeSignature(payload + " ", await sign(payload, t), SECRET, now)).toBe(false);
    expect(await verifyStripeSignature(payload, await sign(payload, t - 600), SECRET, now)).toBe(false);
  });
  it("rejects a missing or malformed header", async () => {
    expect(await verifyStripeSignature(payload, null, SECRET, now)).toBe(false);
    expect(await verifyStripeSignature(payload, "v1=abc", SECRET, now)).toBe(false);
  });
  it("accepts when one of several v1 signatures matches (secret rotation)", async () => {
    const good = (await sign(payload, t)).split(",")[1];
    expect(await verifyStripeSignature(payload, `t=${t},v1=deadbeef,${good}`, SECRET, now)).toBe(true);
  });
});

describe("planUpdate", () => {
  it("activates the family after the first payment, for a year and a day", () => {
    const e = { type: "checkout.session.completed", data: { object: { mode: "subscription", payment_status: "paid", client_reference_id: FAMILY, customer: "cus_1" } } };
    expect(planUpdate(e, now)).toEqual({ kind: "activate", familyId: FAMILY, customerId: "cus_1", paidUntil: "2027-10-23T10:00:00.000Z" });
  });
  it("ignores an unpaid checkout or a bad family id", () => {
    expect(planUpdate({ type: "checkout.session.completed", data: { object: { mode: "subscription", payment_status: "unpaid", client_reference_id: FAMILY, customer: "cus_1" } } }, now)).toEqual({ kind: "ignore" });
    expect(planUpdate({ type: "checkout.session.completed", data: { object: { mode: "subscription", payment_status: "paid", client_reference_id: "drop table", customer: "cus_1" } } }, now)).toEqual({ kind: "ignore" });
  });
  it("extends the family on a yearly renewal, until the end of the period plus a day", () => {
    const e = { type: "invoice.paid", data: { object: { billing_reason: "subscription_cycle", customer: "cus_1", lines: { data: [{ period: { end: Date.parse("2028-10-22T10:00:00Z") / 1000 } }] } } } };
    expect(planUpdate(e, now)).toEqual({ kind: "renew", customerId: "cus_1", paidUntil: "2028-10-23T10:00:00.000Z" });
  });
  it("leaves the first invoice to the checkout event, and ignores other events", () => {
    expect(planUpdate({ type: "invoice.paid", data: { object: { billing_reason: "subscription_create", customer: "cus_1", lines: { data: [] } } } }, now)).toEqual({ kind: "ignore" });
    expect(planUpdate({ type: "customer.created", data: { object: {} } }, now)).toEqual({ kind: "ignore" });
  });
});
