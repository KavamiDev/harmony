// Month view coloured by custody, appointments per day, and the custody cycle settings.
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import AppShell, { sideNames } from "../components/AppShell";
import { Icon } from "../components/art";
import ChangeRequests from "../components/ChangeRequests";
import { SIDE_STYLE } from "../components/TodayCard";
import { ErrorNote, Field } from "../components/ui";
import { groupByDay, monthGrid } from "../lib/calendar";
import { cycleLabel } from "../lib/change-text";
import { useCustodyChanges } from "../lib/changes";
import { PRESETS, custodyOn, custodyRange, isValidCycle, mondayOf, toggleDay, type Side } from "../lib/custody";
import { addDays, fmtDay, fmtHandover, fmtTime, todayLocal } from "../lib/dates";
import { useSession, type FamilyData } from "../lib/session";
import { supabase, type Tables } from "../lib/supabase";

type Event = Tables<"events">;
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

export default function Calendar() {
  return <AppShell>{(data) => <CalendarContent data={data} />}</AppShell>;
}

function CalendarContent({ data }: { data: FamilyData }) {
  const today = todayLocal();
  const [cursor, setCursor] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const [selected, setSelected] = useState(today);
  const [events, setEvents] = useState<Event[]>([]);
  const [adding, setAdding] = useState(false);
  const names = sideNames(data);
  const { plan, family, child } = data;
  const changes = useCustodyChanges(data);
  const ov = changes.overrides;
  const [changing, setChanging] = useState(false);
  const inPending = (d: string) => changes.pending.some((c) => c.kind === "override" && c.start_date! <= d && d <= c.end_date!);
  const inAccepted = (d: string) => ov.some((o) => o.start_date <= d && d <= o.end_date);

  const grid = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor]);
  const from = grid[0]![0]!;
  const to = grid.at(-1)![6]!;

  const load = useCallback(async () => {
    const { data: rows } = await supabase.from("events").select("*").eq("family_id", family.id)
      .gte("starts_at", new Date(`${from}T00:00:00`).toISOString())
      .lt("starts_at", new Date(`${addDays(to, 1)}T00:00:00`).toISOString())
      .order("starts_at");
    setEvents(rows ?? []);
  }, [family.id, from, to]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const channel = supabase.channel(`events-${family.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "events", filter: `family_id=eq.${family.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [family.id, load]);

  const byDay = groupByDay(events);
  const monthName = fmtDay(`${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}-01`, { month: "long", year: "numeric" });
  const move = (delta: number) => setCursor(({ y, m }) => ({ y: m + delta < 0 ? y - 1 : m + delta > 11 ? y + 1 : y, m: (m + delta + 12) % 12 }));
  const goToday = () => { setCursor({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }); setSelected(today); };

  const daySide = custodyOn(plan, selected, ov);
  const dayEvents = byDay.get(selected) ?? [];

  return (
    <main className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6 lg:grid-cols-[1.6fr_1fr]">
      <ChangeRequests data={data} pending={changes.pending} onChange={changes.reload} />
      <section aria-labelledby="month" className="card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h1 id="month" className="font-display text-2xl font-medium first-letter:uppercase sm:text-3xl">{monthName}</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => move(-1)} aria-label="Mois précédent" className="grid size-10 place-items-center rounded-full hover:bg-bg"><span aria-hidden="true" className="text-xl">‹</span></button>
            <button onClick={goToday} className="rounded-full px-3 py-2 text-sm font-bold text-brand hover:bg-mint">Aujourd'hui</button>
            <button onClick={() => move(1)} aria-label="Mois suivant" className="grid size-10 place-items-center rounded-full hover:bg-bg"><span aria-hidden="true" className="text-xl">›</span></button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-bold text-muted" aria-hidden="true">
          {WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div role="grid" aria-label={`Calendrier de ${monthName}`} className="mt-1 space-y-1">
          {grid.map((week) => (
            <div role="row" key={week[0]} className="grid grid-cols-7 gap-1">
              {week.map((d) => {
                const side = custodyOn(plan, d, ov);
                const pend = inPending(d), changed = inAccepted(d);
                const inMonth = Number(d.slice(5, 7)) - 1 === cursor.m;
                const evs = byDay.get(d) ?? [];
                return (
                  <button
                    role="gridcell" key={d} onClick={() => { setSelected(d); setAdding(false); setChanging(false); }}
                    aria-selected={d === selected}
                    aria-label={`${fmtDay(d, { weekday: "long", day: "numeric", month: "long" })}, chez ${names[side]}${changed ? ", jour modifié" : ""}${pend ? ", changement en attente" : ""}${evs.length ? `, ${evs.length} rendez-vous` : ""}`}
                    className={`flex min-h-14 flex-col items-center rounded-xl pt-1.5 pb-1 transition sm:min-h-20 sm:items-start sm:px-2 ${SIDE_STYLE[side].soft} ${inMonth ? "" : "opacity-40"} ${d === selected ? "ring-2 ring-brand" : pend ? "outline-2 outline-dashed outline-[#c99a1e]" : ""}`}
                  >
                    <span className="flex items-center gap-0.5"><span className={`grid size-7 place-items-center rounded-full text-sm font-bold ${d === today ? "bg-ink text-white" : ""}`}>{Number(d.slice(8))}</span>{changed && <span aria-hidden="true" className="text-xs font-bold text-ink/60">⇄</span>}</span>
                    <span className="mt-auto flex gap-0.5 sm:hidden">{evs.slice(0, 3).map((e) => <span key={e.id} className="size-1.5 rounded-full bg-ink/70" />)}</span>
                    <span className="mt-0.5 hidden w-full space-y-0.5 sm:block">
                      {evs.slice(0, 2).map((e) => <span key={e.id} className="block truncate rounded-md bg-white/80 px-1 text-left text-[11px] font-semibold">{e.title}</span>)}
                      {evs.length > 2 && <span className="block text-left text-[11px] text-muted">+{evs.length - 2}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
          {(["A", "B"] as Side[]).map((s) => <span key={s} className="inline-flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${SIDE_STYLE[s].dot}`} />Chez {names[s]}</span>)}
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-ink/70" />Rendez-vous</span>
          <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="font-bold text-ink/60">⇄</span>Jour modifié</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-sm outline-2 outline-dashed outline-[#c99a1e]" />En attente</span>
        </div>
      </section>

      <div className="space-y-5">
        <section aria-labelledby="day" className="card p-5 sm:p-6">
          <p className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${SIDE_STYLE[daySide].soft} ${SIDE_STYLE[daySide].text}`}>
            <span className={`size-2 rounded-full ${SIDE_STYLE[daySide].dot}`} />{child.first_name} chez {names[daySide]}
          </p>
          <h2 id="day" className="mt-3 text-xl font-bold first-letter:uppercase">{fmtDay(selected, { weekday: "long", day: "numeric", month: "long" })}</h2>
          {dayEvents.length === 0 && !adding && <p className="mt-2 text-muted">Aucun rendez-vous ce jour-là.</p>}
          <ul className="mt-3 space-y-2">
            {dayEvents.map((e) => (
              <li key={e.id} className="flex items-start gap-3 rounded-2xl bg-bg p-3">
                <span className="w-14 shrink-0 text-sm font-bold text-brand">{e.all_day ? "Journée" : fmtTime(e.starts_at)}</span>
                <span className="min-w-0 flex-1">
                  <b className="block">{e.title}</b>
                  {e.place && <span className="block text-sm text-muted">{e.place}</span>}
                  {e.notes && <span className="block whitespace-pre-line text-sm text-muted">{e.notes}</span>}
                </span>
                {!data.readOnly && <button onClick={async () => { await supabase.from("events").delete().eq("id", e.id); load(); }} aria-label={`Supprimer ${e.title}`} className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-white hover:text-side-a"><Icon name="trash" className="size-5" /></button>}
              </li>
            ))}
          </ul>
          {data.readOnly ? null : adding
            ? <EventForm day={selected} data={data} onDone={() => { setAdding(false); load(); }} />
            : changing
              ? <OverrideForm day={selected} data={data} current={daySide} onDone={() => { setChanging(false); changes.reload(); }} />
              : (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <button onClick={() => setAdding(true)} className="btn btn-soft"><Icon name="plus" className="size-5" />Rendez-vous</button>
                  <button onClick={() => setChanging(true)} className="btn btn-soft"><span aria-hidden="true" className="font-bold">⇄</span>Changer ces jours</button>
                </div>
              )}
        </section>

        <CycleSettings data={data} onProposed={changes.reload} />
      </div>
    </main>
  );
}

function EventForm({ day, data, onDone }: { day: string; data: FamilyData; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(day);
  const [allDay, setAllDay] = useState(false);
  const [time, setTime] = useState("09:00");
  const [end, setEnd] = useState("");
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!allDay && end && end < time) return setError("L'heure de fin doit être après l'heure de début.");
    setBusy(true); setError("");
    const starts = new Date(`${date}T${allDay ? "00:00" : time}`);
    const { error } = await supabase.from("events").insert({
      family_id: data.family.id, child_id: data.child.id, title: title.trim(), all_day: allDay,
      starts_at: starts.toISOString(), ends_at: !allDay && end ? new Date(`${date}T${end}`).toISOString() : null,
      place: place.trim() || null, notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) return setError("Le rendez-vous n'a pas pu être enregistré.");
    onDone();
  }

  return (
    <form onSubmit={save} className="mt-4 space-y-3 rounded-2xl bg-mint/60 p-4">
      <Field label="Quoi ?" name="title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dentiste, réunion parents-profs…" autoFocus />
      <Field label="Date" name="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="size-5 accent-[var(--color-brand)]" />Toute la journée</label>
      {!allDay && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début" name="time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
          <Field label="Fin (facultatif)" name="end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      )}
      <Field label="Lieu (facultatif)" name="place" maxLength={200} value={place} onChange={(e) => setPlace(e.target.value)} />
      <Field label="Note (facultatif)" name="notes" maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Carnet de santé à prendre…" />
      <ErrorNote>{error}</ErrorNote>
      <div className="flex gap-2">
        <button disabled={busy} className="btn btn-primary flex-1">{busy ? "Enregistrement…" : "Enregistrer"}</button>
        <button type="button" onClick={onDone} className="btn btn-soft">Annuler</button>
      </div>
    </form>
  );
}

type PresetId = keyof typeof PRESETS;

function OverrideForm({ day, data, current, onDone }: { day: string; data: FamilyData; current: Side; onDone: () => void }) {
  const names = sideNames(data);
  const [from, setFrom] = useState(day);
  const [to, setTo] = useState(day);
  const [side, setSide] = useState<Side>(current === "A" ? "B" : "A");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const other = data.members.find((m) => m.user_id !== data.me.user_id);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (to < from) return setError("La date de fin doit être après la date de début.");
    if ((Date.parse(to) - Date.parse(from)) / 86_400_000 > 92) return setError("Trois mois maximum par demande.");
    setBusy(true); setError("");
    const { error } = await supabase.rpc("propose_override", { child: data.child.id, start_date: from, end_date: to, side, note: note.trim() || undefined });
    setBusy(false);
    if (error) return setError("La demande n'a pas pu être envoyée.");
    onDone();
  }

  return (
    <form onSubmit={send} className="mt-4 space-y-3 rounded-2xl bg-butter/50 p-4">
      <p className="text-sm font-bold">Changer la garde sur ces jours</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Du" name="from" type="date" required value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value > to) setTo(e.target.value); }} />
        <Field label="Au" name="to" type="date" required min={from} value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-bold">{data.child.first_name} sera chez</legend>
        <div className="flex gap-2">
          {(["A", "B"] as Side[]).map((s) => (
            <label key={s} className={`flex-1 cursor-pointer rounded-2xl border-2 px-3 py-2 text-center text-sm font-bold ${side === s ? `border-current ${SIDE_STYLE[s].soft} ${SIDE_STYLE[s].text}` : "border-line bg-white"}`}>
              <input type="radio" name="override-side" checked={side === s} onChange={() => setSide(s)} className="sr-only" />{names[s]}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Un mot pour l'autre parent (facultatif)" name="note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Vacances chez les grands-parents…" />
      <ErrorNote>{error}</ErrorNote>
      <div className="flex gap-2">
        <button disabled={busy} className="btn btn-primary flex-1">{busy ? "Envoi…" : other ? `Demander à ${other.display_name}` : "Appliquer"}</button>
        <button type="button" onClick={onDone} className="btn btn-soft">Annuler</button>
      </div>
      {other && <p className="text-xs text-muted">Le changement s'appliquera dès que {other.display_name} l'aura accepté.</p>}
    </form>
  );
}

type Mode = PresetId | "custom";

function CycleSettings({ data, onProposed }: { data: FamilyData; onProposed: () => void }) {
  const { reload } = useSession();
  const { plan, child } = data;
  const names = sideNames(data);
  const monday = mondayOf(todayLocal());
  const current = (Object.keys(PRESETS) as PresetId[]).find((id) => PRESETS[id].cycle === plan.cycle);
  const fromPlan = custodyRange(plan, monday, addDays(monday, 13)).map((d) => d.side).join("");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(current ?? "custom");
  const [custom, setCustom] = useState(fromPlan);
  const [startSide, setStartSide] = useState<Side>(custodyOn(plan, monday));
  const [handover, setHandover] = useState(plan.handover_time.slice(0, 5));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const other = data.members.find((m) => m.user_id !== data.me.user_id);

  // Start from the rhythm as it is now (it may have changed since the page opened).
  function startEdit() {
    setMode(current ?? "custom");
    setCustom(fromPlan);
    setStartSide(custodyOn(plan, monday));
    setHandover(plan.handover_time.slice(0, 5));
    setNote("");
    setOpen(true);
  }

  // Presets: pick the anchor (this Monday or the previous one) so that this Monday matches the chosen side.
  // Custom: the 14 days are drawn from this Monday.
  const cycle = mode === "custom" ? custom : PRESETS[mode].cycle;
  const anchor = mode === "custom" ? monday : [monday, addDays(monday, -7)].find((a) => custodyOn({ cycle, anchor: a }, monday) === startSide) ?? monday;
  const preview = custodyRange({ cycle, anchor }, monday, addDays(monday, 13));

  async function save() {
    if (!isValidCycle(cycle)) return;
    setBusy(true); setNote("");
    const { error } = await supabase.rpc("propose_cycle", { child: data.child.id, cycle, anchor, handover_time: handover });
    setBusy(false);
    if (error) return setNote("La proposition n'a pas pu être envoyée.");
    if (other) setNote(`Proposition envoyée à ${other.display_name}. Le rythme changera quand il ou elle l'aura validée.`);
    else { await reload(); setNote("Rythme de garde mis à jour."); }
    onProposed();
    setOpen(false);
  }

  return (
    <section aria-labelledby="cycle" className="card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 id="cycle" className="flex items-center gap-2 text-lg font-bold"><span className="grid size-9 place-items-center rounded-full bg-sky text-side-b"><Icon name="settings" className="size-5" /></span>Rythme de garde</h2>
        {!open && !data.readOnly && <button onClick={startEdit} className="text-sm font-bold text-brand hover:underline">Modifier</button>}
      </div>
      <p className="mt-2 text-muted">{cycleLabel(plan.cycle)}, changement à {fmtHandover(plan.handover_time)}.</p>
      {note && <p role="status" className="mt-2 text-sm font-semibold text-brand">{note}</p>}

      {open && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {([...Object.keys(PRESETS), "custom"] as Mode[]).map((id) => (
              <label key={id} className={`cursor-pointer rounded-2xl border-2 px-3 py-2 text-sm font-bold ${mode === id ? "border-brand bg-mint" : "border-line bg-bg"}`}>
                <input type="radio" name="cycle-preset" checked={mode === id} onChange={() => setMode(id)} className="sr-only" />{id === "custom" ? "Personnalisé" : PRESETS[id].label}
              </label>
            ))}
          </div>

          {mode === "custom" ? (
            <fieldset>
              <legend className="mb-2 text-sm font-bold">Touchez un jour pour changer de maison</legend>
              {[0, 7].map((o) => (
                <div key={o} className="mb-1 grid grid-cols-7 gap-1">
                  {preview.slice(o, o + 7).map((d, i) => (
                    <button key={d.date} type="button" onClick={() => setCustom((c) => toggleDay(c, o + i))}
                      aria-label={`${fmtDay(d.date, { weekday: "long", day: "numeric" })} : chez ${names[d.side]}, toucher pour changer`}
                      className={`rounded-lg py-2 text-center text-xs font-bold ${SIDE_STYLE[d.side].soft} ${SIDE_STYLE[d.side].text}`}>
                      <span className="block text-[10px] uppercase">{fmtDay(d.date, { weekday: "short" }).replace(".", "")}</span>{Number(d.date.slice(8))}
                    </button>
                  ))}
                </div>
              ))}
              <p className="mt-1 text-xs text-muted">Ces deux semaines se répètent ensuite.</p>
            </fieldset>
          ) : (
            <>
              <fieldset>
                <legend className="mb-2 text-sm font-bold">Ce lundi, {child.first_name} est chez</legend>
                <div className="flex gap-2">
                  {(["A", "B"] as Side[]).map((s) => (
                    <label key={s} className={`flex-1 cursor-pointer rounded-2xl border-2 px-3 py-2 text-center text-sm font-bold ${startSide === s ? `border-current ${SIDE_STYLE[s].soft} ${SIDE_STYLE[s].text}` : "border-line bg-bg"}`}>
                      <input type="radio" name="start-side" checked={startSide === s} onChange={() => setStartSide(s)} className="sr-only" />{names[s]}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="space-y-1">
                {[0, 7].map((o) => (
                  <div key={o} className="grid grid-cols-7 gap-1">
                    {preview.slice(o, o + 7).map((d) => <span key={d.date} className={`rounded-md py-1 text-center text-[11px] font-bold ${SIDE_STYLE[d.side].soft} ${SIDE_STYLE[d.side].text}`}>{Number(d.date.slice(8))}</span>)}
                  </div>
                ))}
              </div>
            </>
          )}

          <Field label="Heure du changement" name="handover" type="time" value={handover} onChange={(e) => setHandover(e.target.value)} />
          <div className="flex gap-2">
            <button onClick={save} disabled={busy} className="btn btn-primary flex-1">{busy ? "Envoi…" : other ? `Proposer à ${other.display_name}` : "Enregistrer"}</button>
            <button onClick={() => setOpen(false)} className="btn btn-soft">Annuler</button>
          </div>
        </div>
      )}
    </section>
  );
}
