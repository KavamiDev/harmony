import { describe, expect, it } from "vitest";
import { buildEmail, isThrottled, describeOverride } from "./logic";

const APP = "https://app.example";

describe("buildEmail", () => {
  it("announces a mail for the child with sender and subject", () => {
    const e = buildEmail({ kind: "mail", appUrl: APP, child: "Léa", from: "École Jules-Verne", subject: "Sortie au musée" });
    expect(e.subject).toBe("Nouveau mail pour Léa : Sortie au musée");
    expect(e.text).toContain("École Jules-Verne a écrit à l'adresse de Léa");
    expect(e.text).toContain(`${APP}/app/mails`);
    expect(e.text).toContain(`${APP}/app/reglages`);
  });

  it("quotes a short excerpt of a message", () => {
    const e = buildEmail({ kind: "message", appUrl: APP, child: "Léa", author: "Alex", body: "x".repeat(300) });
    expect(e.subject).toBe("Alex vous a écrit sur Harmony");
    expect(e.text).toContain("x".repeat(200) + "…");
    expect(e.text).not.toContain("x".repeat(201));
  });

  it("asks for an answer on a change, and reports the answer", () => {
    const ask = buildEmail({ kind: "change", appUrl: APP, child: "Léa", author: "Alex", description: "Léa chez Alex du samedi 24 au dimanche 25 octobre", note: "Anniversaire" });
    expect(ask.subject).toBe("Alex propose un changement de garde");
    expect(ask.text).toContain("Léa chez Alex du samedi 24 au dimanche 25 octobre");
    expect(ask.text).toContain("« Anniversaire »");
    expect(ask.text).toContain(`${APP}/app/calendrier`);
    const yes = buildEmail({ kind: "change_answered", appUrl: APP, child: "Léa", author: "Camille", accepted: true, description: "Nouveau rythme" });
    expect(yes.subject).toBe("Camille a accepté votre demande");
    expect(buildEmail({ kind: "change_answered", appUrl: APP, child: "Léa", author: "Camille", accepted: false, description: "x" }).subject).toBe("Camille a refusé votre demande");
  });

  it("escapes HTML coming from mails and messages", () => {
    const e = buildEmail({ kind: "mail", appUrl: APP, child: "Léa", from: "<script>x</script>", subject: "a & b" });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
    expect(e.html).toContain("a &amp; b");
  });
});

describe("isThrottled", () => {
  const now = Date.parse("2026-10-22T10:00:00Z");
  it("sends at most one message mail per half hour", () => {
    expect(isThrottled("message", "2026-10-22T09:45:00Z", now)).toBe(true);
    expect(isThrottled("message", "2026-10-22T09:29:00Z", now)).toBe(false);
    expect(isThrottled("message", null, now)).toBe(false);
  });
  it("never throttles mails for the child or change requests", () => {
    expect(isThrottled("mail", "2026-10-22T09:59:00Z", now)).toBe(false);
    expect(isThrottled("change", "2026-10-22T09:59:00Z", now)).toBe(false);
  });
});

describe("describeOverride", () => {
  it("reads like the app", () => {
    expect(describeOverride("Léa", "Alex", "2026-10-24", "2026-10-25")).toBe("Léa chez Alex du samedi 24 au dimanche 25 octobre");
    expect(describeOverride("Léa", "Alex", "2026-10-24", "2026-10-24")).toBe("Léa chez Alex le samedi 24 octobre");
  });
});
