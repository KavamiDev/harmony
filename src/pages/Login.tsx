import { Navigate } from "react-router";
import CodeLogin from "../components/CodeLogin";
import { AuthShell, Loading } from "../components/ui";
import { useSession } from "../lib/session";

export default function Login() {
  const { session, loading } = useSession();
  if (loading) return <Loading />;
  if (session) return <Navigate to="/app" replace />;
  return (
    <AuthShell>
      <p className="eyebrow">Bienvenue</p>
      <h1 className="mt-2 font-display text-3xl font-medium">Connexion à Harmony</h1>
      <p className="mt-2 mb-6 text-muted">Entrez votre adresse mail, vous recevrez un code pour vous connecter.</p>
      <CodeLogin />
    </AuthShell>
  );
}
