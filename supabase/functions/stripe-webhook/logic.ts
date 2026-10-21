// Stripe webhook logic, runtime-agnostic (Deno in production, Node in tests).

const TOLERANCE_S = 300;
const DAY = 86_400_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Stripe-Signature: "t=<unix>,v1=<hex hmac of `${t}.${payload}`>[,v1=…]". */
export async function verifyStripeSignature(payload: string, header: string | null, secret: string, now: number): Promise<boolean> {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = Number(parts.find(([k]) => k === "t")?.[1]);
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || signatures.length === 0 || Math.abs(now / 1000 - t) > TOLERANCE_S) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${t}.${payload}`)));
  const expected = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  return signatures.some((s) => timingSafeEqual(s, expected));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type PlanChange =
  | { kind: "activate"; familyId: string; customerId: string; paidUntil: string }
  | { kind: "renew"; customerId: string; paidUntil: string }
  | { kind: "ignore" };

// deno-lint-ignore no-explicit-any
type StripeEvent = { type: string; data: { object: any } };

/** What a Stripe event changes for a family. One day of grace on every period. */
export function planUpdate(event: StripeEvent, now: number): PlanChange {
  const o = event.data.object;
  if (event.type === "checkout.session.completed") {
    if (o.mode !== "subscription" || o.payment_status !== "paid") return { kind: "ignore" };
    if (typeof o.client_reference_id !== "string" || !UUID.test(o.client_reference_id) || typeof o.customer !== "string") return { kind: "ignore" };
    return { kind: "activate", familyId: o.client_reference_id, customerId: o.customer, paidUntil: new Date(now + 366 * DAY).toISOString() };
  }
  if (event.type === "invoice.paid" && o.billing_reason === "subscription_cycle" && typeof o.customer === "string") {
    const end = o.lines?.data?.[0]?.period?.end;
    if (typeof end !== "number") return { kind: "ignore" };
    return { kind: "renew", customerId: o.customer, paidUntil: new Date(end * 1000 + DAY).toISOString() };
  }
  return { kind: "ignore" };
}
