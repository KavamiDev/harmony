// The child's inbox: every mail received at lea.xxxx@<domain>, shown as plain text.
import { useEffect, useState } from "react";
import AppShell from "../components/AppShell";
import { Icon } from "../components/art";
import { MAIL_DOMAIN } from "../config";
import { fmtWhen } from "../lib/dates";
import { formatSize, linkify, openDocument } from "../lib/documents";
import type { FamilyData } from "../lib/session";
import { supabase, type Tables } from "../lib/supabase";

type Mail = Tables<"mails">;

export default function Mails() {
  return <AppShell>{(data) => <Inbox data={data} />}</AppShell>;
}

function Inbox({ data }: { data: FamilyData }) {
  const { family, child } = data;
  const [mails, setMails] = useState<Mail[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const load = () => supabase.from("mails").select("*").eq("family_id", family.id).order("received_at", { ascending: false }).limit(200)
      .then(({ data: rows }) => setMails(rows ?? []));
    load();
    const channel = supabase.channel(`mails-${family.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mails", filter: `family_id=eq.${family.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [family.id]);

  const open = mails.find((m) => m.id === openId) ?? null;

  return (
    <main className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6 md:grid-cols-[1fr_1.4fr]">
      <section aria-labelledby="inbox" className={`card overflow-hidden ${open ? "hidden md:block" : ""}`}>
        <div className="border-b border-line p-5">
          <h1 id="inbox" className="font-display text-2xl font-medium">Mails de {child.first_name}</h1>
          <p className="mt-1 text-sm text-muted">Tout ce qui arrive à <b className="text-ink">{child.mail_local}@{MAIL_DOMAIN}</b>, pour vous deux.</p>
        </div>
        {mails.length === 0 ? (
          <p className="p-5 text-muted">Aucun mail pour l'instant. Donnez l'adresse de {child.first_name} à l'école, au médecin ou au club.</p>
        ) : (
          <ul className="divide-y divide-line">
            {mails.map((m) => (
              <li key={m.id}>
                <button onClick={() => setOpenId(m.id)} className={`block w-full px-5 py-3.5 text-left transition hover:bg-bg ${m.id === openId ? "bg-mint/60" : ""}`}>
                  <span className="flex items-baseline justify-between gap-3">
                    <b className="truncate text-sm">{m.from_name || m.from_addr}</b>
                    <span className="shrink-0 text-xs text-muted">{fmtWhen(m.received_at)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-sm">{m.subject || "(sans objet)"}</span>
                  <span className="block truncate text-sm text-muted">{m.text.slice(0, 120)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open ? <MailView mail={open} onBack={() => setOpenId(null)} /> : (
        <section className="card hidden place-items-center p-10 text-center text-muted md:grid">
          <span><span className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-peach text-side-a"><Icon name="mail" /></span>Choisissez un mail pour le lire.</span>
        </section>
      )}
    </main>
  );
}

function MailView({ mail, onBack }: { mail: Mail; onBack: () => void }) {
  const [files, setFiles] = useState<Tables<"documents">[]>([]);
  const skipped = (Array.isArray(mail.skipped_attachments) ? mail.skipped_attachments : []) as { name: string; reason: string }[];

  useEffect(() => {
    supabase.from("documents").select("*").eq("mail_id", mail.id).order("name").then(({ data: rows }) => setFiles(rows ?? []));
  }, [mail.id]);

  return (
    <article aria-labelledby="mail-subject" className="card p-5 sm:p-6">
      <button onClick={onBack} className="mb-3 text-sm font-bold text-brand md:hidden">← Tous les mails</button>
      <h2 id="mail-subject" className="font-display text-2xl font-medium">{mail.subject || "(sans objet)"}</h2>
      <p className="mt-2 text-sm text-muted">
        De <b className="text-ink">{mail.from_name || mail.from_addr}</b>{mail.from_name && <> &lt;{mail.from_addr}&gt;</>} · {fmtWhen(mail.received_at)}
      </p>
      <div className="mt-5 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
        {linkify(mail.text || "(message vide)").map((p, i) =>
          p.href ? <a key={i} href={p.href} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-brand underline">{p.text}</a> : <span key={i}>{p.text}</span>,
        )}
      </div>

      {(files.length > 0 || skipped.length > 0) && (
        <div className="mt-6 space-y-2 border-t border-line pt-4">
          <h3 className="text-sm font-bold">Pièces jointes</h3>
          {files.map((f) => (
            <button key={f.id} onClick={() => openDocument(f.path)} className="flex w-full items-center gap-3 rounded-2xl bg-bg p-3 text-left hover:bg-mint">
              <span className="grid size-10 place-items-center rounded-xl bg-white text-brand"><Icon name="folder" className="size-5" /></span>
              <span className="min-w-0 flex-1"><b className="block truncate text-sm">{f.name}</b><span className="text-xs text-muted">{formatSize(f.size)} · rangée dans Documents</span></span>
            </button>
          ))}
          {skipped.map((s) => (
            <p key={s.name} className="rounded-2xl bg-butter/70 px-3 py-2 text-sm text-[#7a5f0c]">
              « {s.name} » n'a pas été gardée ({s.reason === "too_big" ? "plus de 10 Mo" : "type de fichier non accepté"}).
            </p>
          ))}
        </div>
      )}
      <p className="mt-6 text-xs text-muted">Affiché en texte seul : pas d'images distantes ni de suivi de lecture.</p>
    </article>
  );
}
