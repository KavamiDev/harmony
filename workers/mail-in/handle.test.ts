import { describe, expect, it } from "vitest";
import { handleMail, htmlToText, type DocRow, type MailRow, type MailStore } from "./handle";

const DOMAIN = "harmony.fr";
const mime = (headers: string, body: string) => `${headers.trim()}\nMIME-Version: 1.0\n${body}`.replace(/\n/g, "\r\n");

const SCHOOL = mime(
  `From: "Ecole Jules-Verne" <secretariat@ecole.example>
To: Lea <lea.k7m2@harmony.fr>
Subject: =?UTF-8?Q?Sortie_au_mus=C3=A9e?=
Message-ID: <abc@ecole.example>`,
  `Content-Type: multipart/mixed; boundary="b1"

--b1
Content-Type: text/plain; charset=utf-8

Bonjour, voici l'autorisation pour jeudi.
--b1
Content-Type: application/pdf; name="autorisation.pdf"
Content-Disposition: attachment; filename="autorisation.pdf"
Content-Transfer-Encoding: base64

JVBERi0xLjQK
--b1
Content-Type: application/x-msdownload; name="virus.exe"
Content-Disposition: attachment; filename="virus.exe"
Content-Transfer-Encoding: base64

TVqQAAMAAAAEAAAA
--b1--
`,
);

function fakeStore(children: Record<string, { id: string; family_id: string }> = { "lea.k7m2": { id: "c1", family_id: "f1" } }) {
  const mails: MailRow[] = [];
  const uploads: { path: string; size: number; mime: string }[] = [];
  const documents: DocRow[] = [];
  const store: MailStore = {
    findChild: async (local) => children[local] ?? null,
    insertMail: async (row) => {
      if (mails.some((m) => m.message_id === row.message_id)) return null;
      mails.push(row);
      return `m${mails.length}`;
    },
    upload: async (path, bytes, mime) => { uploads.push({ path, size: bytes.byteLength, mime }); },
    insertDocument: async (row) => { documents.push(row); },
  };
  return { store, mails, uploads, documents };
}

describe("handleMail", () => {
  it("stores the mail and files the accepted attachments", async () => {
    const s = fakeStore();
    const r = await handleMail({ raw: SCHOOL, to: "lea.k7m2@harmony.fr", domain: DOMAIN, store: s.store });
    expect(r).toEqual({ status: "stored", mailId: "m1", saved: 1, skipped: [{ name: "virus.exe", reason: "type" }] });
    expect(s.mails[0]).toMatchObject({
      family_id: "f1", child_id: "c1", message_id: "<abc@ecole.example>",
      from_addr: "secretariat@ecole.example", from_name: "Ecole Jules-Verne", subject: "Sortie au musée",
      text: "Bonjour, voici l'autorisation pour jeudi.",
      skipped_attachments: [{ name: "virus.exe", reason: "type" }],
    });
    expect(s.uploads).toEqual([{ path: "f1/mail/m1/1-autorisation.pdf", size: 9, mime: "application/pdf" }]);
    expect(s.documents[0]).toMatchObject({ family_id: "f1", child_id: "c1", mail_id: "m1", category: "other", name: "autorisation.pdf", path: "f1/mail/m1/1-autorisation.pdf", size: 9, mime: "application/pdf" });
  });

  it("rejects unknown addresses and other domains", async () => {
    const s = fakeStore();
    expect(await handleMail({ raw: SCHOOL, to: "tom.zzzz@harmony.fr", domain: DOMAIN, store: s.store })).toEqual({ status: "rejected", reason: "unknown" });
    expect(await handleMail({ raw: SCHOOL, to: "lea.k7m2@evil.example", domain: DOMAIN, store: s.store })).toEqual({ status: "rejected", reason: "unknown" });
    expect(s.mails).toHaveLength(0);
  });

  it("ignores a second delivery of the same mail", async () => {
    const s = fakeStore();
    await handleMail({ raw: SCHOOL, to: "lea.k7m2@harmony.fr", domain: DOMAIN, store: s.store });
    expect(await handleMail({ raw: SCHOOL, to: "lea.k7m2@harmony.fr", domain: DOMAIN, store: s.store })).toEqual({ status: "duplicate" });
    expect(s.uploads).toHaveLength(1);
  });

  it("uses a stable hash when the Message-ID is missing", async () => {
    const raw = mime(`From: a@b.example\nTo: lea.k7m2@harmony.fr\nSubject: Sans id`, `Content-Type: text/plain\n\nCoucou`);
    const s = fakeStore();
    await handleMail({ raw, to: "lea.k7m2@harmony.fr", domain: DOMAIN, store: s.store });
    expect(await handleMail({ raw, to: "lea.k7m2@harmony.fr", domain: DOMAIN, store: s.store })).toEqual({ status: "duplicate" });
    expect(String(s.mails[0]!.message_id)).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("turns an HTML-only mail into text", async () => {
    const raw = mime(`From: club@foot.example\nTo: lea.k7m2@harmony.fr\nSubject: Entrainement\nMessage-ID: <h@foot>`,
      `Content-Type: text/html; charset=utf-8\n\n<html><style>p{color:red}</style><p>Entra&icirc;nement <b>d&eacute;cal&eacute;</b></p><p>&agrave; 17&nbsp;h 30<br>Merci</p><img src="https://track.example/p.gif"></html>`);
    const s = fakeStore();
    await handleMail({ raw, to: "lea.k7m2@harmony.fr", domain: DOMAIN, store: s.store });
    expect(s.mails[0]!.text).toBe("Entraînement décalé\nà 17 h 30\nMerci");
  });
});

describe("htmlToText", () => {
  it("keeps links readable", () => {
    expect(htmlToText(`<p>Voir <a href="https://ecole.example/menu">le menu</a></p>`)).toBe("Voir le menu (https://ecole.example/menu)");
  });
});
