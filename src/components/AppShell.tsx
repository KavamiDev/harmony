// Signed-in layout: header, page, and navigation (bottom bar on phones, top on desktop).
import type { ReactNode } from "react";
import { NavLink, Navigate } from "react-router";
import type { Side } from "../lib/custody";
import { useSession, type FamilyData } from "../lib/session";
import { supabase } from "../lib/supabase";
import { Icon, Logo } from "./art";
import { SIDE_STYLE } from "./TodayCard";
import { Loading } from "./ui";

const NAV = [
  { to: "/app", label: "Accueil", icon: "home" },
  { to: "/app/calendrier", label: "Calendrier", icon: "calendar" },
  { to: "/app/mails", label: "Mails", icon: "mail" },
  { to: "/app/messages", label: "Messages", icon: "chat" },
  { to: "/app/documents", label: "Documents", icon: "folder" },
] as const;

/** Renders the page only for a signed-in parent with a family. */
export default function AppShell({ children }: { children: (data: FamilyData) => ReactNode }) {
  const { session, data, loading } = useSession();
  if (loading) return <Loading />;
  if (!session) return <Navigate to="/connexion" replace />;
  if (!data) return <Navigate to="/bienvenue" replace />;

  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition ${isActive ? "bg-white text-brand shadow-sm" : "text-muted hover:text-ink"}`;

  return (
    <div className="min-h-dvh pb-28 md:pb-12">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Logo />
        <nav aria-label="Application" className="hidden items-center gap-1 rounded-full bg-meadow-soft p-1 md:flex">
          {NAV.map((n) => <NavLink key={n.to} to={n.to} end className={link}><Icon name={n.icon} className="size-5" />{n.label}</NavLink>)}
        </nav>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm font-semibold shadow-sm">
            <span className={`size-2.5 rounded-full ${SIDE_STYLE[data.me.side as Side].dot}`} />{data.me.display_name}
          </span>
          <button onClick={() => supabase.auth.signOut()} className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted hover:bg-white hover:text-ink">Déconnexion</button>
        </div>
      </header>

      {children(data)}

      <nav aria-label="Application" className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((n) => (
            <li key={n.to}>
              <NavLink to={n.to} end className={({ isActive }) => `flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-xs font-bold ${isActive ? "text-brand" : "text-muted"}`}>
                {({ isActive }) => (<><span className={`grid h-8 w-12 place-items-center rounded-full ${isActive ? "bg-mint" : ""}`}><Icon name={n.icon} className="size-5" /></span>{n.label}</>)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

/** Display names by side; B can be missing until the second parent joins. */
export const sideNames = (data: FamilyData): Record<Side, string> => ({
  A: data.members.find((m) => m.side === "A")?.display_name ?? "Parent A",
  B: data.members.find((m) => m.side === "B")?.display_name ?? "l'autre parent",
});
