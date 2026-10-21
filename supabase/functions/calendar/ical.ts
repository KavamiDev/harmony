// iCalendar feed: custody blocks ("Léa chez Camille") and appointments. Runtime-agnostic.
import { custodyRange, type CustodyPlan, type Override, type Side } from "../_shared/custody.ts";

export interface FeedEvent { id: string; title: string; starts_at: string; ends_at: string | null; all_day: boolean; place: string | null; notes: string | null }

const DAY = 86_400_000;
const dateValue = (d: string) => d.replace(/-/g, "");
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const utcStamp = (t: number) => new Date(t).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

export const escapeText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** Lines are at most 75 octets; continuations start with a space (RFC 5545 §3.1). */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) { out.push(cur); cur = ""; }
    cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function buildICS(input: {
  child: string; names: Record<Side, string>; plan: CustodyPlan; overrides: Override[];
  events: FeedEvent[]; from: string; to: string; now: number;
}): string {
  const stamp = `DTSTAMP:${utcStamp(input.now)}`;
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Harmony//Calendrier de garde//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(`Garde de ${input.child}`)}`, "REFRESH-INTERVAL;VALUE=DURATION:PT6H", "X-PUBLISHED-TTL:PT6H",
  ];

  // Consecutive days in the same home become one all-day event.
  const days = custodyRange(input.plan, input.from, input.to, input.overrides);
  for (let i = 0; i < days.length; ) {
    let j = i;
    while (j + 1 < days.length && days[j + 1]!.side === days[i]!.side) j++;
    const { date, side } = days[i]!;
    lines.push("BEGIN:VEVENT", `UID:custody-${dateValue(date)}-${side}@harmony`, stamp,
      `DTSTART;VALUE=DATE:${dateValue(date)}`, `DTEND;VALUE=DATE:${dateValue(addDays(days[j]!.date, 1))}`,
      `SUMMARY:${escapeText(`${input.child} chez ${input.names[side]}`)}`, "TRANSP:TRANSPARENT", "END:VEVENT");
    i = j + 1;
  }

  for (const e of input.events) {
    lines.push("BEGIN:VEVENT", `UID:${e.id}@harmony`, stamp);
    if (e.all_day) {
      const d = e.starts_at.slice(0, 10); // all-day events are stored at noon UTC on their day
      lines.push(`DTSTART;VALUE=DATE:${dateValue(d)}`, `DTEND;VALUE=DATE:${dateValue(addDays(d, 1))}`);
    } else {
      const start = Date.parse(e.starts_at);
      lines.push(`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(e.ends_at ? Date.parse(e.ends_at) : start + 3_600_000)}`);
    }
    lines.push(`SUMMARY:${escapeText(e.title)}`);
    if (e.place) lines.push(`LOCATION:${escapeText(e.place)}`);
    if (e.notes) lines.push(`DESCRIPTION:${escapeText(e.notes)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
