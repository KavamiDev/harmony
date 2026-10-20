// Demo of the parent home screen with example data, so the product can be seen before auth exists.
// The custody week is computed with the real cycle logic.
import { Link } from "react-router";
import { Icon, Logo, Meadow } from "../components/art";
import { MAIL_DOMAIN } from "../config";
import TodayCard from "../components/TodayCard";
import { PRESETS, mondayOf, type Side } from "../lib/custody";

const today = new Date().toLocaleDateString("sv-SE"); // local YYYY-MM-DD
const plan = { cycle: PRESETS.alternate.cycle, anchor: mondayOf(today) };
const parents: Record<Side, { name: string; dot: string; soft: string; text: string }> = {
  A: { name: "Camille", dot: "bg-side-a", soft: "bg-side-a-soft", text: "text-side-a" },
  B: { name: "Alex", dot: "bg-side-b", soft: "bg-side-b-soft", text: "text-side-b" },
};
const child = "Léa";

const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const label = (d: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...opts }).format(Date.parse(`${d}T00:00:00Z`));

const events = [
  { day: addDays(today, 1), time: "16:30", title: "Dentiste", place: "Cabinet du Dr Laurent" },
  { day: addDays(today, 3), time: "09:00", title: "Sortie au musée", place: "École Jules-Verne" },
];
const mails = [
  { from: "École Jules-Verne", subject: "Sortie au musée jeudi : autorisation jointe", when: "il y a 2 h", attachment: true },
  { from: "Club de foot", subject: "Entraînement décalé à 17 h 30", when: "hier", attachment: false },
];
const messages = [
  { side: "B" as Side, body: "Je récupère Léa à 17 h vendredi, comme prévu.", when: "hier, 19:12" },
  { side: "A" as Side, body: "Parfait, son sac de piscine est prêt.", when: "hier, 19:20" },
];

export default function Preview() {
  return (
    <div className="min-h-dvh pb-10">
      <div className="bg-butter text-center text-sm font-semibold text-[#7a5f0c] py-2 px-4">Aperçu avec des données d'exemple · la connexion arrive bientôt</div>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <Link to="/" aria-label="Retour au site"><Logo /></Link>
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-sm">
          <span className={`size-2.5 rounded-full ${parents.A.dot}`} />Camille
        </span>
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6 md:grid-cols-[1.3fr_1fr]">
        <TodayCard plan={plan} child={child} names={{ A: "Camille", B: "Alex" }} handoverTime="18:00" />

        {/* Mails */}
        <section aria-labelledby="mails" className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 id="mails" className="flex items-center gap-2 text-lg font-bold"><span className="grid size-9 place-items-center rounded-full bg-peach text-side-a"><Icon name="mail" className="size-5" /></span>Mails de {child}</h2>
          </div>
          <p className="mt-2 text-sm text-muted">lea.k7m2@{MAIL_DOMAIN}</p>
          <ul className="mt-3 divide-y divide-line">
            {mails.map((m) => (
              <li key={m.subject} className="py-3">
                <div className="flex items-baseline justify-between gap-3"><b className="text-sm">{m.from}</b><span className="shrink-0 text-xs text-muted">{m.when}</span></div>
                <p className="mt-0.5 text-sm text-muted">{m.subject}{m.attachment && " · 📎 rangée dans Documents"}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Agenda */}
        <section aria-labelledby="agenda" className="card p-5 sm:p-6">
          <h2 id="agenda" className="flex items-center gap-2 text-lg font-bold"><span className="grid size-9 place-items-center rounded-full bg-mint text-brand"><Icon name="calendar" className="size-5" /></span>À venir</h2>
          <ul className="mt-3 space-y-3">
            {events.map((e) => (
              <li key={e.title} className="flex gap-3">
                <span className="w-14 shrink-0 rounded-xl bg-mint py-1.5 text-center">
                  <span className="block text-[11px] font-semibold uppercase text-muted">{label(e.day, { weekday: "short" }).replace(".", "")}</span>
                  <span className="block font-bold">{label(e.day, { day: "numeric" })}</span>
                </span>
                <span>
                  <b className="block">{e.title}</b>
                  <span className="text-sm text-muted">{e.time} · {e.place}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Messages */}
        <section aria-labelledby="messages" className="card overflow-hidden md:col-span-2">
          <div className="p-5 sm:p-6">
            <h2 id="messages" className="flex items-center gap-2 text-lg font-bold"><span className="grid size-9 place-items-center rounded-full bg-butter text-[#9a7a12]"><Icon name="chat" className="size-5" /></span>Messages</h2>
            <ul className="mt-4 space-y-3">
              {messages.map((m) => (
                <li key={m.when} className={`flex ${m.side === "A" ? "justify-end" : ""}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${parents[m.side].soft}`}>
                    <p className="text-[15px]">{m.body}</p>
                    <p className="mt-1 text-xs text-muted">{parents[m.side].name} · {m.when}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <label htmlFor="msg" className="sr-only">Écrire un message</label>
              <input id="msg" disabled placeholder="Écrire à Alex…" className="min-h-12 flex-1 rounded-full border border-line bg-bg px-4 text-[15px]" />
              <button disabled className="btn btn-primary opacity-60">Envoyer</button>
            </div>
            <p className="mt-2 text-xs text-muted">Les messages sont datés et ne peuvent pas être modifiés.</p>
          </div>
          <Meadow className="w-full" />
        </section>
      </main>
    </div>
  );
}
