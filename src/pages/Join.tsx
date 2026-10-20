// Second parent: opens the shared link, signs in with a code, joins the family.
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import CodeLogin from "../components/CodeLogin";
import { AuthShell, ErrorNote, Field, Loading } from "../components/ui";
import { useSession } from "../lib/session";
import { supabase } from "../lib/supabase";

type Preview = { inviter: string | null; child: string | null; status: string };

const STATUS_TEXT: Record<string, string> = {
  invalid: "Ce lien d'invitation n'existe pas. Vérifiez qu'il a été copié en entier.",
  used: "Ce lien a déjà servi. Demandez-en un nouveau à l'autre parent.",
  expired: "Ce lien a expiré (il est valable 7 jours). Demandez-en un nouveau.",
  full: "Cette famille compte déjà deux parents.",
};

export default function Join() {
  const { token = "" } = useParams();
  const { session, data, loading, reload } = useSession();
  const navigate = useNavigate();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.rpc("invite_preview", { token }).then(({ data: rows }) => setPreview(rows?.[0] ?? { inviter: null, child: null, status: "invalid" }));
  }, [token]);

  if (loading || !preview) return <Loading />;

  async function join(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const { error } = await supabase.rpc("accept_invite", { token, display_name: name.trim() });
    if (error) { setBusy(false); return setError(error.message.includes("already") ? "Ce lien a déjà servi." : "Impossible de rejoindre la famille avec ce lien."); }
    await reload();
    navigate("/app", { replace: true });
  }

  const child = preview.child ?? "votre enfant";

  return (
    <AuthShell>
      {preview.status !== "ok" ? (
        <>
          <h1 className="font-display text-3xl font-medium">Lien d'invitation</h1>
          <p className="mt-3 text-muted">{STATUS_TEXT[preview.status] ?? STATUS_TEXT.invalid}</p>
          <Link to="/" className="btn btn-soft mt-6">Découvrir Harmony</Link>
        </>
      ) : (
        <>
          <p className="eyebrow">Invitation</p>
          <h1 className="mt-2 font-display text-3xl font-medium leading-tight">
            {preview.inviter} vous invite sur Harmony pour <span className="text-brand">{child}</span>
          </h1>
          <p className="mt-2 mb-6 text-muted">Calendrier de garde, mails de l'école et documents de {child}, partagés entre vos deux maisons.</p>

          {!session && <CodeLogin submitLabel="Rejoindre avec mon adresse mail" />}

          {session && data && (
            <div className="space-y-4">
              <p className="rounded-2xl bg-bg px-4 py-3 text-muted">Vous faites déjà partie d'une famille sur Harmony avec ce compte.</p>
              <Link to="/app" className="btn btn-primary w-full">Ouvrir mon espace</Link>
            </div>
          )}

          {session && !data && (
            <form onSubmit={join} className="space-y-4">
              <Field label="Votre prénom" name="name" autoComplete="given-name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" hint={`Il sera affiché à ${preview.inviter}.`} />
              <ErrorNote>{error}</ErrorNote>
              <button disabled={busy} className="btn btn-primary w-full">{busy ? "Un instant…" : "Rejoindre la famille"}</button>
            </form>
          )}
        </>
      )}
    </AuthShell>
  );
}
