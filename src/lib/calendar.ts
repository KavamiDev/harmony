// Month grids and day grouping for the calendar and the message thread.
import { addDays, fmtDay } from "./dates";

const pad = (n: number) => String(n).padStart(2, "0");

/** Weeks (Monday first) covering the month, as YYYY-MM-DD. `month` is 0-based. */
export function monthGrid(year: number, month: number): string[][] {
  const first = `${year}-${pad(month + 1)}-01`;
  const offset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const rows = Math.ceil((offset + daysInMonth) / 7);
  const start = addDays(first, -offset);
  return Array.from({ length: rows }, (_, r) => Array.from({ length: 7 }, (_, c) => addDays(start, r * 7 + c)));
}

/** The browser's local calendar day of an instant. */
export const localDay = (iso: string) => new Date(iso).toLocaleDateString("sv-SE");

export function groupByDay<T extends { starts_at: string }>(items: T[], dayOf: (iso: string) => string = localDay) {
  const map = new Map<string, T[]>();
  for (const item of [...items].sort((a, b) => a.starts_at.localeCompare(b.starts_at))) {
    const d = dayOf(item.starts_at);
    map.set(d, [...(map.get(d) ?? []), item]);
  }
  return map;
}

/** Separator label in the message thread. */
export function dayBucket(day: string, today: string): string {
  if (day === today) return "Aujourd'hui";
  if (day === addDays(today, -1)) return "Hier";
  return fmtDay(day, { weekday: "long", day: "numeric", month: "long" });
}
