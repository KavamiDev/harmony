// What happens when a mail reaches lea.k7m2@<domain>. Pure logic: storage is injected.
import PostalMime from "postal-mime";
import { acceptAttachment, safeFileName } from "../../src/lib/attachments";
import { recipientLocal } from "../../src/lib/mail-address";

export interface MailRow {
  family_id: string;
  child_id: string;
  message_id: string;
  from_addr: string;
  from_name: string | null;
  subject: string;
  text: string;
  skipped_attachments: { name: string; reason: string }[];
}

export interface DocRow {
  family_id: string;
  child_id: string;
  mail_id: string;
  category: "other";
  name: string;
  path: string;
  size: number;
  mime: string;
}

export interface MailStore {
  findChild(local: string): Promise<{ id: string; family_id: string } | null>;
  /** Returns the new mail id, or null when this message_id is already stored. */
  insertMail(row: MailRow): Promise<string | null>;
  upload(path: string, bytes: Uint8Array, mime: string): Promise<void>;
  insertDocument(row: DocRow): Promise<void>;
}

export type MailResult =
  | { status: "rejected"; reason: "unknown" }
  | { status: "duplicate" }
  | { status: "stored"; mailId: string; saved: number; skipped: { name: string; reason: string }[] };

const MAX_TEXT = 100_000;

export async function handleMail(input: { raw: string | ArrayBuffer | Uint8Array; to: string; domain: string; store: MailStore }): Promise<MailResult> {
  const local = recipientLocal(input.to, input.domain);
  const child = local ? await input.store.findChild(local) : null;
  if (!child) return { status: "rejected", reason: "unknown" };

  const raw = typeof input.raw === "string" ? new TextEncoder().encode(input.raw) : new Uint8Array(input.raw);
  const mail = await PostalMime.parse(raw);
  const files = (mail.attachments ?? []).filter((a) => !a.related); // inline logos and signatures are dropped silently

  const accepted: { name: string; bytes: Uint8Array; mime: string; index: number }[] = [];
  const skipped: { name: string; reason: string }[] = [];
  files.forEach((a, i) => {
    const name = safeFileName(a.filename ?? "");
    const bytes = typeof a.content === "string" ? new TextEncoder().encode(a.content) : new Uint8Array(a.content);
    const check = acceptAttachment({ mime: a.mimeType ?? "", filename: name, size: bytes.byteLength });
    if (check.ok) accepted.push({ name, bytes, mime: a.mimeType || "application/octet-stream", index: i + 1 });
    else skipped.push({ name, reason: check.reason });
  });

  const mailId = await input.store.insertMail({
    family_id: child.family_id,
    child_id: child.id,
    message_id: mail.messageId?.trim() || `sha256:${await sha256(raw)}`,
    from_addr: mail.from?.address ?? "inconnu",
    from_name: mail.from?.name || null,
    subject: (mail.subject ?? "").trim().slice(0, 300),
    text: (mail.text?.trim() || htmlToText(mail.html ?? "")).slice(0, MAX_TEXT),
    skipped_attachments: skipped,
  });
  if (!mailId) return { status: "duplicate" };

  for (const f of accepted) {
    const path = `${child.family_id}/mail/${mailId}/${f.index}-${f.name}`;
    await input.store.upload(path, f.bytes, f.mime);
    await input.store.insertDocument({
      family_id: child.family_id, child_id: child.id, mail_id: mailId, category: "other",
      name: f.name, path, size: f.bytes.byteLength, mime: f.mime,
    });
  }
  return { status: "stored", mailId, saved: accepted.length, skipped };
}

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", euro: "€", laquo: "«", raquo: "»", rsquo: "’", hellip: "…",
  eacute: "é", egrave: "è", ecirc: "ê", euml: "ë", agrave: "à", acirc: "â", icirc: "î", iuml: "ï", ocirc: "ô", ugrave: "ù", ucirc: "û", ccedil: "ç",
  Eacute: "É", Egrave: "È", Ecirc: "Ê", Agrave: "À", Ccedil: "Ç",
};

/** Plain text from an HTML mail: no remote images, links kept as "text (url)". */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, text: string) => {
      const t = text.replace(/<[^>]+>/g, "").trim();
      return t && t !== href ? `${t} (${href})` : href;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n] ?? m)
    .replace(/ /g, " ")
    .split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim()).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
