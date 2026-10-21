// Which notification mails this parent receives.
import { useState } from "react";
import type { FamilyData } from "../lib/session";
import { useSession } from "../lib/session";
import { supabase } from "../lib/supabase";

const OPTIONS = [
  { key: "notify_mail", label: (child: string) => `Un mail arrive pour ${child}` },
  { key: "notify_message", label: () => "L'autre parent m'écrit (au plus un mail par demi-heure)" },
  { key: "notify_change", label: () => "Un changement de garde attend ma réponse, ou a reçu une réponse" },
] as const;
type Key = (typeof OPTIONS)[number]["key"];

export default function NotifySettings({ data }: { data: FamilyData }) {
  const { reload } = useSession();
  const [prefs, setPrefs] = useState<Record<Key, boolean>>({ notify_mail: data.me.notify_mail, notify_message: data.me.notify_message, notify_change: data.me.notify_change });
  const [error, setError] = useState("");

  async function toggle(key: Key, value: boolean) {
    setPrefs((p) => ({ ...p, [key]: value })); setError("");
    const patch: Partial<Record<Key, boolean>> = { [key]: value };
    const { error } = await supabase.from("members").update(patch).eq("user_id", data.me.user_id);
    if (error) { setPrefs((p) => ({ ...p, [key]: !value })); setError("Le réglage n'a pas pu être enregistré."); }
    else reload();
  }

  return (
    <section aria-labelledby="notify" className="card p-5 sm:p-6">
      <h2 id="notify" className="text-lg font-bold">Me prévenir par mail quand…</h2>
      <ul className="mt-3 space-y-2">
        {OPTIONS.map((o) => (
          <li key={o.key}>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-bg px-4 py-3">
              <input type="checkbox" checked={prefs[o.key]} onChange={(e) => toggle(o.key, e.target.checked)} className="size-5 shrink-0 accent-[var(--color-brand)]" />
              <span>{o.label(data.child.first_name)}</span>
            </label>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-sm font-semibold text-side-a">{error}</p>}
      <p className="mt-2 text-xs text-muted">Les mails sont envoyés à l'adresse avec laquelle vous vous connectez.</p>
    </section>
  );
}
