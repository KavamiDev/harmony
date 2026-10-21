// "Today, Léa is at Camille's" + the next two weeks, from the custody cycle.
import { custodyOn, custodyRange, handovers, mondayOf, type CustodyPlan, type Override, type Side } from "../lib/custody";
import { addDays, fmtDay, fmtHandover, todayLocal } from "../lib/dates";

export const SIDE_STYLE: Record<Side, { dot: string; soft: string; text: string }> = {
  A: { dot: "bg-side-a", soft: "bg-side-a-soft", text: "text-side-a" },
  B: { dot: "bg-side-b", soft: "bg-side-b-soft", text: "text-side-b" },
};

export default function TodayCard({ plan, child, names, handoverTime, overrides = [] }: { plan: CustodyPlan; child: string; names: Record<Side, string>; handoverTime: string; overrides?: Override[] }) {
  const today = todayLocal();
  const side = custodyOn(plan, today, overrides);
  const week = custodyRange(plan, mondayOf(today), addDays(mondayOf(today), 13), overrides);
  const next = handovers(plan, today, addDays(today, 28), overrides)[0];

  return (
    <section aria-labelledby="today" className="card overflow-hidden md:col-span-2">
      <div className={`${SIDE_STYLE[side].soft} px-6 pt-6 pb-2`}>
        <p className="text-sm font-semibold text-muted first-letter:uppercase">{fmtDay(today, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 id="today" className="mt-1 font-display text-3xl font-medium sm:text-4xl">
          Aujourd'hui, {child} est chez <span className={SIDE_STYLE[side].text}>{names[side]}</span>
        </h1>
        {next && (
          <p className="mt-2 text-muted">
            Prochain changement : <b className="text-ink">{fmtDay(next.date, { weekday: "long", day: "numeric", month: "long" })}</b>, chez {names[next.to]}, à {fmtHandover(handoverTime)}.
          </p>
        )}
      </div>
      <div className="px-4 pb-5 pt-4 sm:px-6">
        <ol aria-label="Les deux prochaines semaines" className="grid grid-cols-7 gap-1.5">
          {week.map((d) => (
            <li key={d.date} aria-label={`${fmtDay(d.date, { weekday: "long", day: "numeric" })} : chez ${names[d.side]}`} className={`rounded-xl py-2 text-center ${d.date === today ? "ring-2 ring-ink/70" : ""} ${SIDE_STYLE[d.side].soft}`}>
              <span className="block text-[11px] font-semibold uppercase text-muted">{fmtDay(d.date, { weekday: "short" }).replace(".", "")}</span>
              <span className="block text-lg font-bold">{fmtDay(d.date, { day: "numeric" })}</span>
              <span className={`mx-auto mt-1 block size-2 rounded-full ${SIDE_STYLE[d.side].dot}`} />
            </li>
          ))}
        </ol>
        <div className="mt-3 flex gap-4 text-sm text-muted">
          {(["A", "B"] as Side[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5"><span className={`size-2.5 rounded-full ${SIDE_STYLE[s].dot}`} />Chez {names[s]}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
