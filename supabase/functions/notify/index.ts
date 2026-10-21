// Supabase Edge Function: sends the queued notification mails (called by the DB triggers).
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildEmail, describeOverride, isThrottled, type Notice } from "./logic.ts";

const env = (k: string) => Deno.env.get(k) ?? "";
const db = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const APP_URL = env("APP_URL");
const FROM = env("MAIL_FROM") || "Harmony <notifications@harmony.fr>";

async function send(to: string, mail: { subject: string; text: string; html: string }) {
  const resend = env("RESEND_API_KEY");
  const res = resend
    ? await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resend}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM, to: [to], subject: mail.subject, text: mail.text, html: mail.html }),
      })
    : await fetch(`${env("MAILPIT_URL")}/api/v1/send`, { // local development only
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ From: { Email: FROM.replace(/.*<|>.*/g, ""), Name: "Harmony" }, To: [{ Email: to }], Subject: mail.subject, Text: mail.text, HTML: mail.html }),
      });
  if (!res.ok) throw new Error(`send failed: ${res.status}`);
}

type Row = { id: string; family_id: string; recipient: string; kind: string; ref_id: string; attempts: number };

async function notice(n: Row): Promise<Notice | null> {
  const [{ data: members }, { data: child }] = await Promise.all([
    db.from("members").select("user_id, display_name, side").eq("family_id", n.family_id),
    db.from("children").select("first_name").eq("family_id", n.family_id).order("created_at").limit(1).single(),
  ]);
  const name = (uid: string | null) => members?.find((m) => m.user_id === uid)?.display_name ?? "L'autre parent";
  const bySide = (side: string) => members?.find((m) => m.side === side)?.display_name ?? "l'autre parent";
  const base = { appUrl: APP_URL, child: child?.first_name ?? "votre enfant" };

  if (n.kind === "mail") {
    const { data: m } = await db.from("mails").select("from_name, from_addr, subject").eq("id", n.ref_id).single();
    return m && { ...base, kind: "mail", from: m.from_name || m.from_addr, subject: m.subject };
  }
  if (n.kind === "message") {
    const { data: m } = await db.from("messages").select("author_id, body").eq("id", n.ref_id).single();
    return m && { ...base, kind: "message", author: name(m.author_id), body: m.body };
  }
  const { data: c } = await db.from("custody_changes").select("*").eq("id", n.ref_id).single();
  if (!c) return null;
  const description = c.kind === "override" ? describeOverride(base.child, bySide(c.side), c.start_date, c.end_date) : "Nouveau rythme de garde";
  if (n.kind === "change") return { ...base, kind: "change", author: name(c.proposed_by), description, note: c.note };
  return { ...base, kind: "change_answered", author: name(c.decided_by), accepted: c.status === "accepted", description };
}

Deno.serve(async (req) => {
  if (req.headers.get("x-notify-secret") !== env("NOTIFY_SECRET") || !env("NOTIFY_SECRET")) return new Response("Forbidden", { status: 403 });

  const { data: queue } = await db.rpc("claim_notifications", { max: 50 }); // rows claimed by this run only
  let sent = 0;

  for (const n of (queue ?? []) as Row[]) {
    try {
      const { data: last } = await db.from("notifications").select("sent_at").eq("recipient", n.recipient).eq("kind", n.kind)
        .is("skipped", null).not("sent_at", "is", null).order("sent_at", { ascending: false }).limit(1).maybeSingle();
      if (isThrottled(n.kind, last?.sent_at ?? null, Date.now())) {
        await db.from("notifications").update({ sent_at: new Date().toISOString(), skipped: "throttled" }).eq("id", n.id);
        continue;
      }
      const [{ data: user }, content] = await Promise.all([db.auth.admin.getUserById(n.recipient), notice(n)]);
      const email = user?.user?.email;
      if (!email || !content) {
        await db.from("notifications").update({ sent_at: new Date().toISOString(), skipped: "gone" }).eq("id", n.id);
        continue;
      }
      await send(email, buildEmail(content));
      await db.from("notifications").update({ sent_at: new Date().toISOString() }).eq("id", n.id);
      sent++;
    } catch (e) {
      console.error(String(e));
      await db.from("notifications").update({ attempts: n.attempts + 1, claimed_at: null }).eq("id", n.id);
    }
  }
  console.log(JSON.stringify({ sent, queued: queue?.length ?? 0 }));
  return new Response("ok");
});
