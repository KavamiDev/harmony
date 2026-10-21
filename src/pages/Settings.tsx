// Subscription, the child's address, the family, privacy and account.
import { Link } from "react-router";
import AppShell from "../components/AppShell";
import { Icon } from "../components/art";
import { PayButton } from "../components/PlanBanner";
import { SIDE_STYLE } from "../components/TodayCard";
import { CONTACT_EMAIL, MAIL_DOMAIN, PRICE_EUR } from "../config";
import type { Side } from "../lib/custody";
import type { FamilyData } from "../lib/session";
import { daysLeft } from "../lib/subscription";
import { supabase } from "../lib/supabase";

const longDate = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

export default function Settings() {
  return <AppShell>{(data) => <SettingsContent data={data} />}</AppShell>;
}

function SettingsContent({ data }: { data: FamilyData }) {
  const { family, members, child, status } = data;
  return (
    <main className="mx-auto grid max-w-3xl gap-5 px-4 sm:px-6">
      <h1 className="font-display text-3xl font-medium">Réglages</h1>

      <section aria-labelledby="plan" className="card p-5 sm:p-6">
        <h2 id="plan" className="text-lg font-bold">Abonnement</h2>
        {status === "active" && family.paid_until && (
          <p className="mt-2 text-muted">Abonnement actif jusqu'au <b className="text-ink">{longDate(family.paid_until)}</b>, renouvelé automatiquement. {PRICE_EUR} € par an pour toute la famille.</p>
        )}
        {status === "trialing" && (
          <p className="mt-2 text-muted">Essai gratuit jusqu'au <b className="text-ink">{longDate(family.trial_ends_at)}</b> (encore {daysLeft(family.trial_ends_at, Date.now())} jours). Ensuite {PRICE_EUR} € par an, les deux parents inclus.</p>
        )}
        {status === "expired" && <p className="mt-2 text-muted">L'essai est terminé : Harmony est en lecture seule. Un abonnement suffit pour vous deux.</p>}
        {status !== "active" && <PayButton data={data} className="mt-4" />}
        <p className="mt-3 text-xs text-muted">Paiement sécurisé par Stripe. Un seul des deux parents paie.</p>
      </section>

      <section aria-labelledby="address" className="card p-5 sm:p-6">
        <h2 id="address" className="text-lg font-bold">Adresse de {child.first_name}</h2>
        <p className="mt-2 font-bold">{child.mail_local}@{MAIL_DOMAIN}</p>
        <p className="mt-1 text-sm text-muted">Les pièces jointes autorisées (PDF, images, Word, Excel, texte, 10 Mo maximum) sont rangées dans Documents.</p>
      </section>

      <section aria-labelledby="family" className="card p-5 sm:p-6">
        <h2 id="family" className="text-lg font-bold">Famille</h2>
        <ul className="mt-3 space-y-2">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center gap-2">
              <span className={`size-3 rounded-full ${SIDE_STYLE[m.side as Side].dot}`} /><b>{m.display_name}</b>
              {m.user_id === data.me.user_id && <span className="text-sm text-muted">(vous)</span>}
            </li>
          ))}
        </ul>
        {members.length < 2 && <p className="mt-2 text-sm text-muted">Invitez l'autre parent depuis l'accueil.</p>}
      </section>

      <section aria-labelledby="privacy" className="card p-5 sm:p-6">
        <h2 id="privacy" className="text-lg font-bold">Données et compte</h2>
        <ul className="mt-3 space-y-2">
          <li><Link to="/confidentialite" className="font-bold text-brand hover:underline">Politique de confidentialité</Link></li>
          <li className="text-sm text-muted">Pour exporter vos données ou supprimer votre compte, écrivez à <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-brand">{CONTACT_EMAIL}</a>. Réponse sous 30 jours au plus.</li>
        </ul>
        <button onClick={() => supabase.auth.signOut()} className="btn btn-soft mt-4"><Icon name="arrow" className="size-5 rotate-180" />Se déconnecter</button>
      </section>
    </main>
  );
}
