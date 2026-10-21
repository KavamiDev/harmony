// Supabase Edge Function: Stripe sends checkout and invoice events here.
import { createClient } from "npm:@supabase/supabase-js@2";
import { planUpdate, verifyStripeSignature } from "./logic.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const payload = await req.text();
  if (!(await verifyStripeSignature(payload, req.headers.get("stripe-signature"), secret, Date.now()))) {
    return new Response("Bad signature", { status: 400 });
  }
  const change = planUpdate(JSON.parse(payload), Date.now());

  if (change.kind === "activate") {
    const { error } = await db.from("families").update({ paid_until: change.paidUntil, stripe_customer_id: change.customerId }).eq("id", change.familyId);
    if (error) return new Response("DB error", { status: 500 }); // Stripe retries
  } else if (change.kind === "renew") {
    const { error } = await db.from("families").update({ paid_until: change.paidUntil }).eq("stripe_customer_id", change.customerId);
    if (error) return new Response("DB error", { status: 500 });
  }
  console.log(JSON.stringify({ change: change.kind }));
  return new Response("ok");
});
