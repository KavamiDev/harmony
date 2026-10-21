// Trial countdown (last days) and read-only notice once the trial is over.
import { Link } from "react-router";
import { PRICE_EUR, STRIPE_PAYMENT_LINK } from "../config";
import type { FamilyData } from "../lib/session";
import { daysLeft, paymentUrl } from "../lib/subscription";

export function PayButton({ data, className = "" }: { data: FamilyData; className?: string }) {
  const url = paymentUrl(STRIPE_PAYMENT_LINK, data.family.id);
  if (!url) return <span className={`btn btn-soft opacity-60 ${className}`} aria-disabled="true">Paiement bientôt disponible</span>;
  return <a href={url} className={`btn btn-primary ${className}`}>S'abonner · {PRICE_EUR} € / an</a>;
}

export default function PlanBanner({ data }: { data: FamilyData }) {
  if (data.status === "active") return null;
  if (data.status === "trialing") {
    const left = daysLeft(data.family.trial_ends_at, Date.now());
    if (left > 5) return null;
    return (
      <div className="mx-auto mb-4 max-w-5xl px-4 sm:px-6">
        <p className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-butter px-4 py-3 text-sm font-semibold text-[#7a5f0c]">
          <span>Essai gratuit : plus que {left} jour{left > 1 ? "s" : ""}. {PRICE_EUR} € par an pour toute la famille.</span>
          <Link to="/app/reglages" className="font-bold underline">Voir l'abonnement</Link>
        </p>
      </div>
    );
  }
  return (
    <div className="mx-auto mb-4 max-w-5xl px-4 sm:px-6">
      <div role="status" className="flex flex-col gap-3 rounded-2xl bg-side-a-soft px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink">
          <b>Votre essai est terminé : Harmony est en lecture seule.</b> Tout reste consultable, et les mails de {data.child.first_name} continuent d'arriver.
        </p>
        <PayButton data={data} className="shrink-0" />
      </div>
    </div>
  );
}
