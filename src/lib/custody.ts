// Custody cycles: a string of "A"/"B" repeated from a Monday anchor. Dates are calendar days (YYYY-MM-DD).

export type Side = "A" | "B";
export interface CustodyPlan { cycle: string; anchor: string }

export const PRESETS = {
  alternate: { label: "Une semaine sur deux", cycle: "AAAAAAABBBBBBB" },
  "2-2-3": { label: "2-2-3", cycle: "AABBAAABBAABBB" },
  "2-2-5-5": { label: "2-2-5-5", cycle: "AABBAAAAABBBBB" },
  weekends: { label: "Un week-end sur deux", cycle: "AAAABBBAAAAAAA" },
} as const;

const DAY = 86_400_000;
const toDay = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY;
const fromDay = (n: number) => new Date(n * DAY).toISOString().slice(0, 10);

export const isValidCycle = (cycle: string) => /^[AB]+$/.test(cycle) && (cycle.length === 7 || cycle.length === 14);

export function custodyOn(plan: CustodyPlan, date: string): Side {
  const n = plan.cycle.length;
  const i = (((toDay(date) - toDay(plan.anchor)) % n) + n) % n;
  return plan.cycle[i] as Side;
}

export function custodyRange(plan: CustodyPlan, from: string, to: string) {
  const days: { date: string; side: Side }[] = [];
  for (let d = toDay(from); d <= toDay(to); d++) days.push({ date: fromDay(d), side: custodyOn(plan, fromDay(d)) });
  return days;
}

/** Days in (from, to] where the child moves to the other home. */
export function handovers(plan: CustodyPlan, from: string, to: string) {
  const days = custodyRange(plan, from, to);
  return days.slice(1).filter((d, i) => d.side !== days[i]!.side).map((d) => ({ date: d.date, to: d.side }));
}

export function mondayOf(date: string) {
  const d = toDay(date);
  return fromDay(d - ((new Date(d * DAY).getUTCDay() + 6) % 7));
}
