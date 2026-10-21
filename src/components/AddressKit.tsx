// "Give the address to the school": a note to copy, share or open in the parent's mail app.
import { useState } from "react";
import { MAIL_DOMAIN } from "../config";
import { addressMessage, RECIPIENTS, type Recipient } from "../lib/address-kit";
import type { FamilyData } from "../lib/session";
import { Icon } from "./art";

export default function AddressKit({ data }: { data: FamilyData }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState<Recipient>("school");
  const [copied, setCopied] = useState(false);
  const address = `${data.child.mail_local}@${MAIL_DOMAIN}`;
  const parents = [data.me.display_name, ...data.members.filter((m) => m.user_id !== data.me.user_id).map((m) => m.display_name)];
  const msg = addressMessage(to, { child: data.child.first_name, address, parents, signer: data.me.display_name });

  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="btn btn-soft mt-3 w-full !min-h-11 text-sm">
        <Icon name="school" className="size-5" />Donner l'adresse à l'école, au médecin…
      </button>
    );

  async function copy() {
    await navigator.clipboard.writeText(`${msg.subject}\n\n${msg.body}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  async function share() {
    try { await navigator.share({ title: msg.subject, text: msg.body }); } catch { /* closed */ }
  }

  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-mint/60 p-4">
      <div role="group" aria-label="À qui ?" className="flex flex-wrap gap-2">
        {(Object.keys(RECIPIENTS) as Recipient[]).map((r) => (
          <button key={r} onClick={() => setTo(r)} aria-pressed={to === r}
            className={`rounded-full px-3 py-1.5 text-sm font-bold ${to === r ? "bg-brand text-white" : "bg-white text-muted hover:text-ink"}`}>{RECIPIENTS[r].label}</button>
        ))}
      </div>
      <label htmlFor="kit-text" className="sr-only">Message à envoyer</label>
      <textarea id="kit-text" readOnly rows={10} value={`${msg.subject}\n\n${msg.body}`} className="w-full rounded-2xl border border-line bg-white p-3 text-sm leading-relaxed" />
      <div className="flex flex-wrap gap-2">
        <a href={`mailto:?subject=${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(msg.body)}`} className="btn btn-primary !min-h-11 text-sm"><Icon name="mail" className="size-5" />Ouvrir dans ma messagerie</a>
        <button onClick={copy} className="btn btn-soft !min-h-11 text-sm">{copied ? "Copié ✓" : "Copier"}</button>
        {"share" in navigator && <button onClick={share} className="btn btn-soft !min-h-11 text-sm">Partager</button>}
        <button onClick={() => setOpen(false)} className="ml-auto text-sm font-bold text-muted hover:text-ink">Fermer</button>
      </div>
    </div>
  );
}
