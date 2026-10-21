// Cloudflare Email Worker: Email Routing sends every mail for *@<domain> here.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/database.types";
import { handleMail, type MailStore } from "./handle";

interface Env {
  MAIL_DOMAIN: string;
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string; // service key: bypasses RLS, lives only in Worker secrets
}

/** The parts of Cloudflare's ForwardableEmailMessage we use. */
interface IncomingEmail {
  readonly to: string;
  readonly from: string;
  readonly raw: ReadableStream<Uint8Array>;
  readonly rawSize: number;
  setReject(reason: string): void;
}

const MAX_RAW = 25 * 1024 * 1024;

function supabaseStore(env: Env): MailStore {
  const db = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
  const fail = (what: string, e: { message: string } | null) => { if (e) throw new Error(`${what}: ${e.message}`); };
  return {
    async findChild(local) {
      const { data, error } = await db.from("children").select("id, family_id").eq("mail_local", local).maybeSingle();
      fail("findChild", error);
      return data;
    },
    async insertMail(row) {
      const { data, error } = await db.from("mails").upsert(row, { onConflict: "message_id", ignoreDuplicates: true }).select("id");
      fail("insertMail", error);
      return data?.[0]?.id ?? null;
    },
    async upload(path, bytes, mime) {
      const { error } = await db.storage.from("documents").upload(path, bytes, { contentType: mime, upsert: false });
      fail("upload", error);
    },
    async insertDocument(row) {
      const { error } = await db.from("documents").insert(row);
      fail("insertDocument", error);
    },
  };
}

export default {
  async email(message: IncomingEmail, env: Env) {
    if (message.rawSize > MAX_RAW) return message.setReject("Message trop volumineux");
    const raw = await new Response(message.raw).arrayBuffer();
    const result = await handleMail({ raw, to: message.to, domain: env.MAIL_DOMAIN, store: supabaseStore(env) });
    if (result.status === "rejected") message.setReject("Adresse inconnue");
    console.log(JSON.stringify({ to: message.to, ...result })); // no content, only the outcome
  },
};
