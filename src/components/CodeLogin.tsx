// Passwordless sign-in: email, then the 6-digit code received by mail.
import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { ErrorNote, Field } from "./ui";

export default function CodeLogin({ submitLabel = "Recevoir mon code" }: { submitLabel?: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) return setError("Impossible d'envoyer le code. Vérifiez l'adresse et réessayez dans une minute.");
    setStep("code");
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.replace(/\s/g, ""), type: "email" });
    setBusy(false);
    if (error) setError("Ce code ne fonctionne pas. Vérifiez-le ou demandez-en un nouveau.");
    // On success the session listener takes over and the page redirects.
  }

  if (step === "email")
    return (
      <form onSubmit={sendCode} className="space-y-4">
        <Field label="Votre adresse mail" name="email" type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom@exemple.fr" />
        <ErrorNote>{error}</ErrorNote>
        <button disabled={busy} className="btn btn-primary w-full">{busy ? "Envoi…" : submitLabel}</button>
        <p className="text-center text-sm text-muted">Pas de mot de passe : on vous envoie un code à 6 chiffres.</p>
      </form>
    );

  return (
    <form onSubmit={verify} className="space-y-4">
      <p className="text-muted">Code envoyé à <b className="text-ink">{email}</b>.</p>
      <Field label="Code reçu par mail" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" className="tracking-[0.4em]" />
      <ErrorNote>{error}</ErrorNote>
      <button disabled={busy} className="btn btn-primary w-full">{busy ? "Vérification…" : "Me connecter"}</button>
      <button type="button" onClick={() => { setStep("email"); setCode(""); setError(""); }} className="w-full text-sm font-semibold text-muted hover:text-ink">Changer d'adresse</button>
    </form>
  );
}
