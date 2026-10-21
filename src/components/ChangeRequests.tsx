// Pending custody changes: the other parent accepts or declines, the proposer can withdraw.
import { useState } from "react";
import { sideNames } from "./AppShell";
import { Icon } from "./art";
import { SIDE_STYLE } from "./TodayCard";
import { describeChange } from "../lib/change-text";
import type { Change } from "../lib/changes";
import { custodyRange, mondayOf, type Side } from "../lib/custody";
import { addDays, fmtWhen, todayLocal } from "../lib/dates";
import type { FamilyData } from "../lib/session";
import { supabase } from "../lib/supabase";

export default function ChangeRequests({ data, pending, onChange }: { data: FamilyData; pending: Change[]; onChange: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  if (pending.length === 0) return null;
  const names = sideNames(data);
  const nameOf = (uid: string | null) => data.members.find((m) => m.user_id === uid)?.display_name ?? "Un parent";

  async function act(id: string, fn: () => PromiseLike<{ error: unknown }>) {
    setBusy(id); setError("");
    const { error } = await fn();
    setBusy(null);
    if (error) setError("L'action n'a pas abouti. Rechargez la page et réessayez.");
    onChange();
  }

  return (
    <section aria-labelledby="requests" className="card overflow-hidden border-2 border-sun/60 md:col-span-2 lg:col-span-full">
      <div className="p-5 sm:p-6">
        <h2 id="requests" className="flex items-center gap-2 text-lg font-bold">
          <span className="grid size-9 place-items-center rounded-full bg-butter text-[#9a7a12]"><Icon name="calendar" className="size-5" /></span>
          Changements à valider
        </h2>
        {error && <p role="alert" className="mt-2 text-sm font-semibold text-side-a">{error}</p>}
        <ul className="mt-3 space-y-3">
          {pending.map((c) => {
            const mine = c.proposed_by === data.me.user_id;
            const side = (c.side ?? null) as Side | null;
            return (
              <li key={c.id} className="rounded-2xl bg-bg p-4">
                <p className="font-bold">
                  {side && <span className={`mr-2 inline-block size-2.5 rounded-full align-middle ${SIDE_STYLE[side].dot}`} />}
                  {describeChange(c, names, data.child.first_name)}
                </p>
                {c.kind === "cycle" && c.cycle && c.anchor && <CyclePreview cycle={c.cycle} anchor={c.anchor} />}
                {c.note && <p className="mt-1 whitespace-pre-line text-sm text-muted">« {c.note} »</p>}
                <p className="mt-1 text-xs text-muted">Proposé par {mine ? "vous" : nameOf(c.proposed_by)} · {fmtWhen(c.created_at)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mine ? (
                    <>
                      <span className="self-center text-sm text-muted">En attente de la réponse de {data.members.find((m) => m.user_id !== data.me.user_id)?.display_name ?? "l'autre parent"}.</span>
                      {!data.readOnly && <button disabled={busy === c.id} onClick={() => act(c.id, () => supabase.rpc("cancel_change", { change: c.id }))} className="btn btn-soft !min-h-10 text-sm">Annuler la demande</button>}
                    </>
                  ) : data.readOnly ? (
                    <span className="text-sm text-muted">Lecture seule : abonnez-vous pour répondre.</span>
                  ) : (
                    <>
                      <button disabled={busy === c.id} onClick={() => act(c.id, () => supabase.rpc("respond_change", { change: c.id, accept: true }))} className="btn btn-primary !min-h-10 text-sm"><Icon name="check" className="size-4" />Accepter</button>
                      <button disabled={busy === c.id} onClick={() => act(c.id, () => supabase.rpc("respond_change", { change: c.id, accept: false }))} className="btn btn-soft !min-h-10 text-sm">Refuser</button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/** The proposed rhythm on the next two weeks, so the other parent sees what they accept. */
function CyclePreview({ cycle, anchor }: { cycle: string; anchor: string }) {
  const monday = mondayOf(todayLocal());
  const days = custodyRange({ cycle, anchor }, monday, addDays(monday, 13));
  return (
    <div className="mt-2 max-w-sm space-y-1" aria-label="Aperçu du rythme proposé">
      {[0, 7].map((o) => (
        <div key={o} className="grid grid-cols-7 gap-1">
          {days.slice(o, o + 7).map((d) => <span key={d.date} className={`rounded-md py-1 text-center text-[11px] font-bold ${SIDE_STYLE[d.side].soft} ${SIDE_STYLE[d.side].text}`}>{Number(d.date.slice(8))}</span>)}
        </div>
      ))}
    </div>
  );
}
