// Supabase Edge Function: GET ?t=<token> returns the family calendar as iCalendar.
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildICS } from "./ical.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const DAY = 86_400_000;
const day = (t: number) => new Date(t).toISOString().slice(0, 10);

async function sha256(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  if (!/^[0-9a-f]{48}$/.test(token)) return new Response("Not found", { status: 404 });
  const { data: feed } = await db.from("calendar_feeds").select("family_id").eq("token_hash", await sha256(token)).maybeSingle();
  if (!feed) return new Response("Not found", { status: 404 });

  const now = Date.now();
  const from = day(now - 60 * DAY), to = day(now + 365 * DAY);
  const [{ data: child }, { data: members }, { data: changes }, { data: events }] = await Promise.all([
    db.from("children").select("id, first_name").eq("family_id", feed.family_id).order("created_at").limit(1).single(),
    db.from("members").select("display_name, side").eq("family_id", feed.family_id),
    db.from("custody_changes").select("start_date, end_date, side, decided_at").eq("family_id", feed.family_id).eq("kind", "override").eq("status", "accepted"),
    db.from("events").select("id, title, starts_at, ends_at, all_day, place, notes").eq("family_id", feed.family_id)
      .gte("starts_at", `${from}T00:00:00Z`).lte("starts_at", `${to}T23:59:59Z`),
  ]);
  const { data: plan } = await db.from("custody_plans").select("cycle, anchor").eq("child_id", child!.id).single();
  const name = (side: string) => members?.find((m) => m.side === side)?.display_name ?? "l'autre parent";

  const ics = buildICS({
    child: child!.first_name, names: { A: name("A"), B: name("B") }, plan: plan!,
    overrides: changes ?? [], events: events ?? [], from, to, now,
  });
  return new Response(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=900" } });
});
