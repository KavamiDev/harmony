// The parent home screen, from real data.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import AppShell, { sideNames } from "../components/AppShell";
import { Icon, Meadow } from "../components/art";
import TodayCard, { SIDE_STYLE } from "../components/TodayCard";
import { MAIL_DOMAIN } from "../config";
import type { Side } from "../lib/custody";
import { fmtWhen } from "../lib/dates";
import { hashToken, newInviteToken } from "../lib/invite";
import type { FamilyData } from "../lib/session";
import { supabase, type Tables } from "../lib/supabase";

export default function Home() {
  return <AppShell>{(data) => <HomeContent data={data} />}</AppShell>;
}

function HomeContent({ data }: { data: FamilyData }) {
  const [mails, setMails] = useState<Tables<"mails">[]>([]);
  const [events, setEvents] = useState<Tables<"events">[]>([]);
  const [messages, setMessages] = useState<Tables<"messages">[]>([]);
  const { members, child, plan, family } = data;

  useEffect(() => {
    supabase.from("mails").select("*").eq("family_id", family.id).order("received_at", { ascending: false }).limit(3)
      .then(({ data: rows }) => setMails(rows ?? []));
    supabase.from("events").select("*").eq("family_id", family.id).gte("starts_at", new Date().toISOString()).order("starts_at").limit(3)
      .then(({ data: rows }) => setEvents(rows ?? []));
    supabase.from("messages").select("*").eq("family_id", family.id).order("created_at", { ascending: false }).limit(2)
      .then(({ data: rows }) => setMessages((rows ?? []).reverse()));
  }, [family.id]);

  const names = sideNames(data);
  const sideOf = (userId: string | null) => (members.find((m) => m.user_id === userId)?.side ?? "A") as Side;
  const address = `${child.mail_local}@${MAIL_DOMAIN}`;

  return (
      <main className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6 md:grid-cols-[1.3fr_1fr]">
        {members.length < 2 && <InviteCard familyId={family.id} child={child.first_name} />}

        <TodayCard plan={plan} child={child.first_name} names={names} handoverTime={plan.handover_time} />

        <section aria-labelledby="mails" className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 id="mails" className="flex items-center gap-2 text-lg font-bold"><span className="grid size-9 place-items-center rounded-full bg-peach text-side-a"><Icon name="mail" className="size-5" /></span>Mails de {child.first_name}</h2>
            <Link to="/app/mails" className="text-sm font-bold text-brand hover:underline">Tout voir</Link>
          </div>
          <AddressLine address={address} />
          {mails.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-bg px-4 py-3 text-sm text-muted">Aucun mail pour l'instant. Donnez cette adresse à l'école, au médecin, au club : leurs mails arriveront ici, chez vous deux.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {mails.map((m) => (
                <li key={m.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-3"><b className="truncate text-sm">{m.from_name || m.from_addr}</b><span className="shrink-0 text-xs text-muted">{fmtWhen(m.received_at)}</span></div>
                  <p className="mt-0.5 truncate text-sm text-muted">{m.subject || "(sans objet)"}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="agenda" className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 id="agenda" className="flex items-center gap-2 text-lg font-bold"><span className="grid size-9 place-items-center rounded-full bg-mint text-brand"><Icon name="calendar" className="size-5" /></span>À venir</h2>
            <Link to="/app/calendrier" className="text-sm font-bold text-brand hover:underline">Calendrier</Link>
          </div>
          {events.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-bg px-4 py-3 text-sm text-muted">Aucun rendez-vous prévu. Ajoutez-en depuis le calendrier.</p>
          ) : (
            <ul className="mt-3 space-y-2">{events.map((e) => <li key={e.id}><b>{e.title}</b> <span className="text-sm text-muted">· {fmtWhen(e.starts_at)}</span></li>)}</ul>
          )}
        </section>

        <section aria-labelledby="last-messages" className="card p-5 sm:p-6 md:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 id="last-messages" className="flex items-center gap-2 text-lg font-bold"><span className="grid size-9 place-items-center rounded-full bg-butter text-[#9a7a12]"><Icon name="chat" className="size-5" /></span>Messages</h2>
            <Link to="/app/messages" className="text-sm font-bold text-brand hover:underline">Ouvrir</Link>
          </div>
          {messages.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-bg px-4 py-3 text-sm text-muted">Pas encore de message entre vous.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {messages.map((m) => (
                <li key={m.id} className={`rounded-2xl px-4 py-2.5 ${SIDE_STYLE[sideOf(m.author_id)].soft}`}>
                  <p className="line-clamp-2 text-[15px]">{m.body}</p>
                  <p className="mt-0.5 text-xs text-muted">{names[sideOf(m.author_id)]} · {fmtWhen(m.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
  );
}

function AddressLine({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-peach/50 py-2 pr-2 pl-4">
      <span className="truncate font-bold">{address}</span>
      <button
        onClick={async () => { await navigator.clipboard.writeText(address); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="shrink-0 rounded-full bg-white px-3 py-1.5 text-sm font-bold text-side-a shadow-sm"
      >{copied ? "Copiée ✓" : "Copier"}</button>
    </div>
  );
}

function InviteCard({ familyId, child }: { familyId: string; child: string }) {
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  async function create() {
    setBusy(true); setNote("");
    const token = newInviteToken();
    const { error } = await supabase.from("invites").insert({ token_hash: await hashToken(token), family_id: familyId });
    setBusy(false);
    if (error) return setNote("Le lien n'a pas pu être créé. Réessayez.");
    setLink(`${location.origin}/rejoindre/${token}`);
  }

  async function share() {
    const text = `Je t'invite sur Harmony pour organiser la vie de ${child} entre nos deux maisons.`;
    if (navigator.share) {
      try { await navigator.share({ title: "Harmony", text, url: link }); } catch { /* closed by the user */ }
    } else {
      await navigator.clipboard.writeText(link);
      setNote("Lien copié. Collez-le dans un SMS ou sur WhatsApp.");
    }
  }

  return (
    <section aria-labelledby="invite" className="card overflow-hidden md:col-span-2">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-sky text-side-b"><Icon name="family" /></span>
          <div>
            <h2 id="invite" className="text-lg font-bold">Invitez l'autre parent</h2>
            <p className="text-muted">Un lien à envoyer par SMS ou WhatsApp. Pas de mot de passe à créer.</p>
          </div>
        </div>
        {!link ? (
          <button onClick={create} disabled={busy} className="btn btn-primary shrink-0">{busy ? "Création…" : "Créer le lien"}</button>
        ) : (
          <button onClick={share} className="btn btn-primary shrink-0">Partager le lien <Icon name="arrow" className="size-5" /></button>
        )}
      </div>
      {link && (
        <div className="mx-5 mb-5 sm:mx-6">
          <label htmlFor="invite-link" className="text-sm font-bold">Lien d'invitation (valable 7 jours, un seul usage)</label>
          <input id="invite-link" readOnly value={link} onFocus={(e) => e.target.select()} className="mt-1.5 min-h-11 w-full rounded-2xl border border-line bg-bg px-4 text-sm" />
        </div>
      )}
      {note && <p role="status" className="mx-5 mb-5 text-sm font-semibold text-brand sm:mx-6">{note}</p>}
      <Meadow className="w-full" />
    </section>
  );
}
