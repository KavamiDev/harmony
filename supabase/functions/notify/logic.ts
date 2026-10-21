// Notification mails: short, plain, one link to the app. Runtime-agnostic.

export type Notice =
  | { kind: "mail"; appUrl: string; child: string; from: string; subject: string }
  | { kind: "message"; appUrl: string; child: string; author: string; body: string }
  | { kind: "change"; appUrl: string; child: string; author: string; description: string; note?: string | null }
  | { kind: "change_answered"; appUrl: string; child: string; author: string; accepted: boolean; description: string };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function buildEmail(n: Notice): { subject: string; text: string; html: string } {
  let subject: string, lines: string[], path: string, cta: string;
  switch (n.kind) {
    case "mail":
      subject = `Nouveau mail pour ${n.child} : ${cut(n.subject || "(sans objet)", 80)}`;
      lines = [`${n.from} a écrit à l'adresse de ${n.child}.`, `« ${cut(n.subject || "(sans objet)", 160)} »`];
      path = "/app/mails"; cta = "Lire le mail";
      break;
    case "message":
      subject = `${n.author} vous a écrit sur Harmony`;
      lines = [`« ${cut(n.body, 200)} »`];
      path = "/app/messages"; cta = "Répondre";
      break;
    case "change":
      subject = `${n.author} propose un changement de garde`;
      lines = [n.description, ...(n.note ? [`« ${cut(n.note, 300)} »`] : []), "Rien ne change tant que vous n'avez pas répondu."];
      path = "/app/calendrier"; cta = "Accepter ou refuser";
      break;
    case "change_answered":
      subject = `${n.author} a ${n.accepted ? "accepté" : "refusé"} votre demande`;
      lines = [n.description, n.accepted ? "Le calendrier est à jour pour vous deux." : "Le calendrier reste inchangé."];
      path = "/app/calendrier"; cta = "Voir le calendrier";
      break;
  }
  const link = `${n.appUrl}${path}`;
  const settings = `${n.appUrl}/app/reglages`;
  const text = [...lines, "", `${cta} : ${link}`, "", `Couper ces notifications : ${settings}`].join("\n");
  const html = `<div style="font-family:Nunito,Arial,sans-serif;background:#f7f5ec;padding:24px 12px;color:#24312a">
<div style="max-width:440px;margin:0 auto;background:#fff;border-radius:18px;padding:24px">
<p style="margin:0 0 12px;font-size:17px;font-weight:700">${esc(subject)}</p>
${lines.map((l) => `<p style="margin:0 0 10px;color:#5d6a61;white-space:pre-line">${esc(l)}</p>`).join("\n")}
<p style="margin:20px 0"><a href="${esc(link)}" style="background:#4e7d5b;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px;display:inline-block">${esc(cta)}</a></p>
<p style="margin:0;font-size:12px;color:#5d6a61">Harmony · <a href="${esc(settings)}" style="color:#5d6a61">couper ces notifications</a></p>
</div></div>`;
  return { subject, text, html };
}

/** At most one "new message" mail per recipient every 30 minutes; the app shows the rest. */
export function isThrottled(kind: string, lastSentAt: string | null, now: number): boolean {
  return kind === "message" && lastSentAt !== null && now - Date.parse(lastSentAt) < 30 * 60_000;
}

const day = (d: string, withMonth: boolean) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", ...(withMonth ? { month: "long" } : {}) }).format(Date.parse(`${d}T00:00:00Z`));

export function describeOverride(child: string, who: string, start: string, end: string): string {
  if (start === end) return `${child} chez ${who} le ${day(start, true)}`;
  return `${child} chez ${who} du ${day(start, start.slice(0, 7) !== end.slice(0, 7))} au ${day(end, true)}`;
}
