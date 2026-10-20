// Calendar-day helpers (YYYY-MM-DD), formatted in French.
export const todayLocal = () => new Date().toLocaleDateString("sv-SE");
export const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export const fmtDay = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...opts }).format(Date.parse(`${d}T00:00:00Z`));
export const fmtTime = (iso: string) => new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
export const fmtWhen = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
/** "18:00:00" → "18 h", "17:30:00" → "17 h 30". */
export const fmtHandover = (t: string) => { const [h, m] = t.split(":"); return `${Number(h)} h${m && m !== "00" ? ` ${m}` : ""}`; };
