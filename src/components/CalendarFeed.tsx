// Subscribe to the custody calendar from Google Calendar or Apple Calendar.
import { useEffect, useState } from "react";
import { supabase, type Tables } from "../lib/supabase";
import { Icon } from "./art";

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/calendar`;
const longDate = (iso: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));

export default function CalendarFeed({ child }: { child: string }) {
  const [feed, setFeed] = useState<Tables<"calendar_feeds"> | null>(null);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => supabase.from("calendar_feeds").select("*").maybeSingle().then(({ data }) => setFeed(data));
  useEffect(() => { load(); }, []);

  async function create() {
    setBusy(true);
    const { data: token } = await supabase.rpc("new_calendar_feed");
    setBusy(false);
    if (token) { setLink(`${FUNCTIONS_URL}?t=${token}`); load(); }
  }
  async function remove() {
    if (!confirm("Supprimer le lien ? Les agendas abonnés ne se mettront plus à jour.")) return;
    await supabase.rpc("delete_calendar_feed");
    setLink(""); load();
  }
  const webcal = link.replace(/^https?:\/\//, "webcal://");

  return (
    <section aria-labelledby="feed" className="card p-5 sm:p-6">
      <h2 id="feed" className="flex items-center gap-2 text-lg font-bold"><span className="grid size-9 place-items-center rounded-full bg-mint text-brand"><Icon name="calendar" className="size-5" /></span>Dans mon agenda</h2>
      <p className="mt-2 text-muted">La garde de {child} et les rendez-vous, dans Google Agenda ou Calendrier d'Apple. Mis à jour automatiquement.</p>

      {link ? (
        <div className="mt-4 space-y-3">
          <label htmlFor="feed-link" className="text-sm font-bold">Votre lien privé (ne le partagez pas)</label>
          <input id="feed-link" readOnly value={link} onFocus={(e) => e.target.select()} className="min-h-11 w-full rounded-2xl border border-line bg-bg px-4 text-sm" />
          <div className="flex flex-wrap gap-2">
            <a href={webcal} className="btn btn-primary !min-h-11 text-sm">Ouvrir dans Calendrier (Apple)</a>
            <button onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="btn btn-soft !min-h-11 text-sm">{copied ? "Copié ✓" : "Copier le lien"}</button>
          </div>
          <p className="text-sm text-muted"><b className="text-ink">Google Agenda</b> : sur ordinateur, Paramètres › Ajouter un agenda › À partir de l'URL, puis collez le lien. La mise à jour peut prendre quelques heures côté Google.</p>
          <p className="text-xs text-muted">Ce lien n'est affiché qu'une fois. Vous pourrez en créer un nouveau à tout moment.</p>
        </div>
      ) : feed ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm">Lien actif depuis le {longDate(feed.created_at)}.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={create} disabled={busy} className="btn btn-soft !min-h-11 text-sm">Créer un nouveau lien (l'ancien ne marchera plus)</button>
            <button onClick={remove} className="btn btn-soft !min-h-11 text-sm text-side-a">Supprimer le lien</button>
          </div>
        </div>
      ) : (
        <button onClick={create} disabled={busy} className="btn btn-primary mt-4">{busy ? "Création…" : "Créer mon lien d'agenda"}</button>
      )}
    </section>
  );
}
