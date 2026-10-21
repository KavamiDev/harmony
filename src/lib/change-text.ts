// Plain French sentences for custody change proposals.
import { PRESETS, type Side } from "./custody";
import { fmtDay, fmtHandover } from "./dates";

export const cycleLabel = (cycle: string) => Object.values(PRESETS).find((p) => p.cycle === cycle)?.label ?? "Personnalisé";

type ChangeLike = { kind: string; start_date?: string | null; end_date?: string | null; side?: string | null; cycle?: string | null; handover_time?: string | null };

export function describeChange(c: ChangeLike, names: Record<Side, string>, child: string): string {
  if (c.kind === "cycle") return `Nouveau rythme : ${cycleLabel(c.cycle ?? "").toLowerCase()}, changement à ${fmtHandover(c.handover_time ?? "18:00")}`;
  const who = `${child} chez ${names[(c.side ?? "A") as Side]}`;
  const start = c.start_date!, end = c.end_date!;
  if (start === end) return `${who} le ${fmtDay(start, { weekday: "long", day: "numeric", month: "long" })}`;
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const from = fmtDay(start, sameMonth ? { weekday: "long", day: "numeric" } : { weekday: "long", day: "numeric", month: "long" });
  return `${who} du ${from} au ${fmtDay(end, { weekday: "long", day: "numeric", month: "long" })}`;
}
