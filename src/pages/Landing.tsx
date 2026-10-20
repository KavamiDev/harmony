import { Link } from "react-router";
import { HeroScene, Icon, Logo, Meadow, Wave } from "../components/art";
import { MAIL_DOMAIN, PRICE_EUR } from "../config";

const features = [
  { icon: "mail", title: "L'adresse de l'enfant", text: "L'école, le médecin, le club écrivent à une seule adresse. Vous recevez tout, tous les deux.", tint: "bg-peach text-side-a" },
  { icon: "calendar", title: "Calendrier de garde", text: "Semaine sur deux, 2-2-3… Le cycle se remplit tout seul, avec les rendez-vous.", tint: "bg-mint text-brand" },
  { icon: "chat", title: "Messagerie apaisée", text: "Un fil rien que pour l'organisation, horodaté. Rien ne se modifie, rien ne se perd.", tint: "bg-butter text-[#9a7a12]" },
  { icon: "folder", title: "Documents partagés", text: "Bulletins, autorisations, inscriptions : rangés au même endroit, pour les deux maisons.", tint: "bg-sky text-side-b" },
] as const;

const promises = [
  { icon: "shield", title: "Vos données restent en Europe", text: "Hébergement dans l'Union européenne, rien n'est revendu, aucune publicité." },
  { icon: "clock", title: "Rien ne s'efface", text: "Chaque message est daté et ne peut plus être modifié. Les échanges restent clairs." },
  { icon: "family", title: "Un prix pour toute la famille", text: `${PRICE_EUR} € par an, les deux parents inclus. Pas d'abonnement par personne.` },
] as const;

const senders = [
  { icon: "school", who: "École Jules-Verne", what: "Sortie au musée jeudi : autorisation jointe" },
  { icon: "doctor", who: "Cabinet du Dr Martin", what: "Rappel : vaccin le 4 novembre" },
  { icon: "ball", who: "Club de foot", what: "Entraînement décalé à 17 h 30" },
] as const;

export default function Landing() {
  return (
    <div className="overflow-x-clip">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/" aria-label="Harmony, accueil"><Logo /></Link>
        <nav aria-label="Principale" className="hidden items-center gap-7 text-sm font-semibold text-muted md:flex">
          <a href="#fonctions" className="hover:text-ink">Comment ça marche</a>
          <a href="#adresse" className="hover:text-ink">L'adresse de l'enfant</a>
          <a href="#tarif" className="hover:text-ink">Tarif</a>
          <Link to="/apercu" className="hover:text-ink">Aperçu</Link>
        </nav>
        <Link to="/connexion" className="btn btn-primary !min-h-11 !px-5">Se connecter</Link>
      </header>

      {/* Hero */}
      <section className="relative bg-gradient-to-b from-bg via-[#eef4e6] to-meadow-soft">
        <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 pt-6 pb-2 sm:px-6 md:grid-cols-2 md:pt-12">
          <div className="space-y-6">
            <p className="eyebrow">Organiser · Partager · Apaiser</p>
            <h1 className="font-display text-[clamp(2.6rem,7vw,4.6rem)] font-medium leading-[1.02] tracking-tight">
              Deux maisons,<br />une seule <span className="text-brand">harmonie</span>.
            </h1>
            <p className="max-w-md text-lg leading-relaxed text-muted">
              Le calendrier de garde, les mails de l'école et les papiers de votre enfant, enfin au même endroit pour ses deux parents.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/connexion" className="btn btn-primary">Commencer gratuitement <Icon name="arrow" className="size-5" /></Link>
              <a href="#fonctions" className="btn btn-soft">Voir comment ça marche</a>
            </div>
            <p className="text-sm text-muted">14 jours d'essai, sans carte bancaire.</p>
          </div>
          <HeroScene className="w-full max-w-xl justify-self-center" />
        </div>
        <Wave fill="var(--color-bg)" />
      </section>

      {/* Features */}
      <section id="fonctions" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-14 sm:px-6">
        <p className="eyebrow text-center">Tout au même endroit</p>
        <h2 className="mt-3 text-center font-display text-4xl font-medium sm:text-5xl">Ce qu'Harmony fait pour vous</h2>
        <ul className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <li key={f.title} className="flex flex-col items-center text-center">
              <span className={`grid size-24 place-items-center rounded-full ${f.tint}`}><Icon name={f.icon} className="size-10" /></span>
              <h3 className="mt-5 text-lg font-bold">{f.title}</h3>
              <p className="mt-2 max-w-60 text-[15px] leading-relaxed text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Child address */}
      <section id="adresse" className="relative scroll-mt-6 bg-meadow-soft">
        <Wave fill="var(--color-meadow-soft)" className="-mt-px bg-bg" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2">
          <div className="space-y-5">
            <p className="eyebrow">Le cœur d'Harmony</p>
            <h2 className="font-display text-4xl font-medium leading-tight sm:text-5xl">Une adresse rien que pour votre enfant</h2>
            <p className="text-lg leading-relaxed text-muted">
              Donnez-la à l'école, au pédiatre, au club. Chaque mail arrive chez vous deux en même temps, et les pièces jointes se rangent seules dans les documents.
            </p>
            <p className="text-lg font-semibold">Fini les « je n'ai jamais reçu le mot de l'école ».</p>
          </div>
          <div className="card relative p-5 sm:p-6">
            <div className="flex items-center gap-3 rounded-2xl bg-peach/60 px-4 py-3">
              <span className="grid size-10 place-items-center rounded-full bg-white text-side-a"><Icon name="mail" /></span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">Adresse de Léa</p>
                <p className="font-bold">lea.k7m2@{MAIL_DOMAIN}</p>
              </div>
            </div>
            <ul className="mt-4 divide-y divide-line">
              {senders.map((s) => (
                <li key={s.who} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-mint text-brand"><Icon name={s.icon} className="size-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{s.who}</p>
                    <p className="truncate text-sm text-muted">{s.what}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-2 text-sm font-semibold">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-side-a-soft px-3 py-1 text-side-a"><Icon name="check" className="size-4" />Reçu par Camille</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-side-b-soft px-3 py-1 text-side-b"><Icon name="check" className="size-4" />Reçu par Alex</span>
            </div>
            <p className="mt-4 text-xs text-muted">Exemple d'illustration.</p>
          </div>
        </div>
        <Wave fill="var(--color-brand)" />
      </section>

      {/* Promises */}
      <section className="bg-brand text-white">
        <div className="mx-auto max-w-6xl px-4 pt-6 pb-16 sm:px-6">
          <h2 className="font-display text-4xl font-medium sm:text-5xl">Pensé pour les parents</h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {promises.map((p) => (
              <li key={p.title} className="card p-6 text-ink">
                <span className="grid size-12 place-items-center rounded-full bg-mint text-brand"><Icon name={p.icon} /></span>
                <h3 className="mt-4 text-lg font-bold">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{p.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <Wave fill="var(--color-bg)" />
      </section>

      {/* Pricing */}
      <section id="tarif" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-14 sm:px-6">
        <div className="card mx-auto max-w-md overflow-hidden text-center">
          <div className="px-6 pt-8 sm:px-10">
            <p className="eyebrow">Un seul tarif</p>
            <p className="mt-4 font-display text-6xl font-medium">{PRICE_EUR} €<span className="font-sans text-xl font-semibold text-muted"> / an</span></p>
            <p className="mt-2 font-semibold">par famille, les deux parents inclus</p>
            <ul className="mx-auto mt-6 max-w-xs space-y-2.5 text-left">
              {["L'adresse mail de l'enfant", "Calendrier de garde et rendez-vous", "Messagerie entre parents", "Documents partagés", "14 jours d'essai, sans carte"].map((t) => (
                <li key={t} className="flex items-center gap-2.5"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-mint text-brand"><Icon name="check" className="size-4" /></span>{t}</li>
              ))}
            </ul>
            <Link to="/connexion" className="btn btn-primary mt-8 w-full">Commencer gratuitement</Link>
          </div>
          <Meadow className="mt-6 w-full" />
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="space-y-2">
            <Logo />
            <p className="max-w-xs text-sm text-muted">La vie de votre enfant, organisée entre ses deux maisons.</p>
          </div>
          <nav aria-label="Pied de page" className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-muted">
            <a href="#fonctions" className="hover:text-ink">Fonctions</a>
            <a href="#tarif" className="hover:text-ink">Tarif</a>
            <span>Confidentialité (bientôt)</span>
          </nav>
        </div>
        <p className="pb-8 text-center text-xs text-muted">© 2026 Harmony</p>
      </footer>
    </div>
  );
}
