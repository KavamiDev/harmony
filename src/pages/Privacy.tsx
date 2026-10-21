// Public privacy policy, in plain French.
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Logo, Meadow } from "../components/art";
import { CONTACT_EMAIL, MAIL_DOMAIN } from "../config";

const UPDATED = "21 octobre 2026";

function Part({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="space-y-2 leading-relaxed text-muted [&_b]:text-ink [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </section>
  );
}

export default function Privacy() {
  const mail = <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-brand">{CONTACT_EMAIL}</a>;
  return (
    <div className="min-h-dvh px-4 py-6">
      <Link to="/" aria-label="Harmony, accueil" className="mx-auto block max-w-3xl"><Logo /></Link>
      <main className="card mx-auto mt-6 max-w-3xl overflow-hidden">
        <div className="space-y-8 p-6 sm:p-10">
          <header>
            <p className="eyebrow">Vos données</p>
            <h1 className="mt-2 font-display text-4xl font-medium">Politique de confidentialité</h1>
            <p className="mt-2 text-sm text-muted">Dernière mise à jour : {UPDATED}</p>
          </header>

          <Part title="En bref">
            <ul>
              <li>Nous ne gardons que ce qui sert à organiser la vie de votre enfant entre vos deux maisons.</li>
              <li>Vos données sont hébergées dans l'Union européenne. Rien n'est vendu, aucune publicité, aucun traceur publicitaire.</li>
              <li>Seuls les deux parents d'une famille voient ses informations.</li>
            </ul>
          </Part>

          <Part title="Qui est responsable">
            <p>Harmony est édité par Kavami. Pour toute question sur vos données : {mail}.</p>
          </Part>

          <Part title="Ce que nous collectons">
            <ul>
              <li><b>Vos comptes</b> : l'adresse mail et le prénom de chaque parent.</li>
              <li><b>Votre enfant</b> : son prénom uniquement. Pas de nom de famille, pas de date de naissance.</li>
              <li><b>L'organisation</b> : le rythme de garde, les rendez-vous, les messages entre parents.</li>
              <li><b>Les mails reçus</b> à l'adresse de l'enfant (@{MAIL_DOMAIN}) : expéditeur, objet, texte, et les pièces jointes autorisées.</li>
              <li><b>Les documents</b> que vous ajoutez (école, administratif, activités).</li>
              <li><b>Le paiement</b> : géré par Stripe. Nous ne voyons jamais votre numéro de carte.</li>
            </ul>
            <p><b>Pas de documents médicaux</b> pour le moment : leur hébergement demande des garanties particulières (hébergeur certifié pour les données de santé).</p>
          </Part>

          <Part title="Pourquoi">
            <p>Uniquement pour faire fonctionner le service que vous avez choisi (exécution du contrat) : afficher le calendrier, recevoir les mails de l'enfant, partager les documents, gérer l'abonnement. Aucune autre utilisation.</p>
          </Part>

          <Part title="Où sont vos données, et qui les traite">
            <ul>
              <li><b>Supabase</b> : base de données, connexion et fichiers, hébergés dans l'Union européenne (Francfort).</li>
              <li><b>Cloudflare</b> : hébergement du site et réception des mails envoyés à l'adresse de l'enfant.</li>
              <li><b>Stripe</b> : paiement de l'abonnement.</li>
            </ul>
            <p>Ces prestataires agissent pour notre compte et ne peuvent pas utiliser vos données pour eux-mêmes.</p>
          </Part>

          <Part title="Combien de temps">
            <ul>
              <li>Tant que votre compte existe. Les liens d'invitation expirent après 7 jours.</li>
              <li>Quand vous supprimez votre compte, vos données sont effacées sous 30 jours. La famille est supprimée quand son dernier parent part.</li>
              <li>Les justificatifs de paiement sont conservés pendant la durée imposée par la loi.</li>
            </ul>
          </Part>

          <Part title="Les messages entre parents">
            <p>Chaque message est daté et ne peut plus être modifié ni supprimé, même par son auteur. C'est voulu : les échanges restent clairs pour vous deux. Ils sont effacés avec la famille.</p>
          </Part>

          <Part title="Cookies et stockage">
            <p>Aucun cookie publicitaire ni de mesure d'audience. Seul votre navigateur garde de quoi rester connecté (stockage technique indispensable).</p>
          </Part>

          <Part title="Vos droits">
            <p>Vous pouvez accéder à vos données, les corriger, les exporter ou les faire supprimer, et vous opposer à un traitement. Écrivez à {mail} : nous répondons sous 30 jours au plus.</p>
            <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la CNIL (cnil.fr).</p>
          </Part>
        </div>
        <Meadow className="w-full" />
      </main>
    </div>
  );
}
