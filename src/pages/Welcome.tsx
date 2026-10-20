// First parent: name, child, custody cycle. Creates the family in one call.
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { AuthShell, ErrorNote, Field, Loading } from "../components/ui";
import { MAIL_DOMAIN } from "../config";
import { PRESETS, custodyRange, mondayOf } from "../lib/custody";
import { makeMailLocal, normalizeFirstName } from "../lib/mail-address";
import { useSession } from "../lib/session";
import { supabase } from "../lib/supabase";

type PresetId = keyof typeof PRESETS;
const today = () => new Date().toLocaleDateString("sv-SE");
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const dayLabel = (d: string) => new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "narrow" }).format(Date.parse(`${d}T00:00:00Z`));

export default function Welcome() {
  const { session, data, loading, reload } = useSession();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [childName, setChildName] = useState("");
  const [preset, setPreset] = useState<PresetId>("alternate");
  const [swap, setSwap] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (loading) return <Loading />;
  if (!session) return <Navigate to="/connexion" replace />;
  if (data) return <Navigate to="/app" replace />;

  const monday = mondayOf(today());
  const anchor = swap ? addDays(monday, -7) : monday; // shifting a 14-day cycle by a week swaps who starts
  const plan = { cycle: PRESETS[preset].cycle, anchor };
  const days = custodyRange(plan, monday, addDays(monday, 13));
  const childOk = normalizeFirstName(childName) !== null;
  const preview = childOk ? makeMailLocal(childName, () => 0)!.split(".")[0] : "prenom";

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!childOk) return setError("Le prénom de l'enfant doit contenir au moins deux lettres.");
    setBusy(true); setError("");
    for (let attempt = 0; attempt < 4; attempt++) {
      const { error } = await supabase.rpc("create_family", {
        display_name: name.trim(),
        family_name: `Famille de ${childName.trim()}`,
        child_first_name: childName.trim(),
        child_mail_local: makeMailLocal(childName)!,
        cycle: plan.cycle,
        anchor: plan.anchor,
      });
      if (!error) { await reload(); return navigate("/app", { replace: true }); }
      if (error.message.includes("already in a family")) { await reload(); return navigate("/app", { replace: true }); }
      if (!error.message.includes("children_mail_local_key")) break; // anything but an address collision
    }
    setBusy(false);
    setError("La création n'a pas abouti. Réessayez dans un instant.");
  }

  return (
    <AuthShell wide>
      <p className="eyebrow">Première étape</p>
      <h1 className="mt-2 font-display text-3xl font-medium">Créons votre espace famille</h1>
      <p className="mt-2 mb-6 text-muted">Deux minutes, et vous pourrez inviter l'autre parent.</p>

      <form onSubmit={create} className="space-y-6">
        <Field label="Votre prénom" name="name" autoComplete="given-name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Camille" />
        <Field
          label="Prénom de votre enfant" name="child" required maxLength={40} value={childName} onChange={(e) => setChildName(e.target.value)} placeholder="Léa"
          hint={`Son adresse ressemblera à ${preview}.xxxx@${MAIL_DOMAIN}`}
        />

        <fieldset className="space-y-3">
          <legend className="text-sm font-bold">Le rythme de garde</legend>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(PRESETS) as PresetId[]).map((id) => (
              <label key={id} className={`cursor-pointer rounded-2xl border-2 px-3 py-2.5 text-sm font-bold transition ${preset === id ? "border-brand bg-mint" : "border-line bg-bg hover:border-leaf"}`}>
                <input type="radio" name="preset" value={id} checked={preset === id} onChange={() => setPreset(id)} className="sr-only" />
                {PRESETS[id].label}
              </label>
            ))}
          </div>

          <div className="rounded-2xl bg-bg p-3">
            <p className="mb-2 text-sm text-muted">Ces deux semaines, {childName.trim() || "votre enfant"} sera :</p>
            {[0, 7].map((start) => (
              <div key={start} className="mb-1.5 grid grid-cols-7 gap-1">
                {days.slice(start, start + 7).map((d) => (
                  <span key={d.date} className={`rounded-lg py-1.5 text-center text-xs font-bold ${d.side === "A" ? "bg-side-a-soft text-side-a" : "bg-side-b-soft text-side-b"}`}>
                    {dayLabel(d.date)}
                  </span>
                ))}
              </div>
            ))}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="flex gap-3 text-muted">
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-side-a" />Chez vous</span>
                <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-side-b" />Chez l'autre parent</span>
              </span>
              <button type="button" onClick={() => setSwap((s) => !s)} className="font-bold text-brand hover:underline">Inverser les semaines</button>
            </div>
          </div>
        </fieldset>

        <ErrorNote>{error}</ErrorNote>
        <button disabled={busy} className="btn btn-primary w-full">{busy ? "Création…" : "Créer notre espace"}</button>
      </form>
    </AuthShell>
  );
}
