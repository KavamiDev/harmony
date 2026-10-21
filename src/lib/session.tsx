// Session + the parent's family, loaded once and shared by every page.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { canWrite, planStatus, type PlanStatus } from "./subscription";
import { supabase, type Tables } from "./supabase";

export interface FamilyData {
  family: Tables<"families">;
  me: Tables<"members">;
  members: Tables<"members">[];
  child: Tables<"children">;
  plan: Tables<"custody_plans">;
  status: PlanStatus;
  readOnly: boolean; // trial over and not paid: the server refuses writes too
}

interface Ctx {
  session: Session | null;
  loading: boolean;
  data: FamilyData | null;
  reload: () => Promise<void>;
}

const SessionContext = createContext<Ctx>({ session: null, loading: true, data: null, reload: async () => {} });

async function loadFamily(userId: string): Promise<FamilyData | null> {
  const { data: me } = await supabase.from("members").select("*").eq("user_id", userId).maybeSingle();
  if (!me) return null;
  const [family, members, child, plan] = await Promise.all([
    supabase.from("families").select("*").eq("id", me.family_id).single(),
    supabase.from("members").select("*").eq("family_id", me.family_id).order("side"),
    supabase.from("children").select("*").eq("family_id", me.family_id).order("created_at").limit(1).single(),
    supabase.from("custody_plans").select("*").eq("family_id", me.family_id).limit(1).single(),
  ]);
  if (!family.data || !child.data || !plan.data) return null;
  const status = planStatus(family.data, Date.now());
  return { family: family.data, me, members: members.data ?? [me], child: child.data, plan: plan.data, status, readOnly: !canWrite(status) };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession();
    setSession(s.session);
    setData(s.session ? await loadFamily(s.session.user.id) : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") reload();
    });
    return () => sub.subscription.unsubscribe();
  }, [reload]);

  return <SessionContext.Provider value={{ session, loading, data, reload }}>{children}</SessionContext.Provider>;
}

export const useSession = () => useContext(SessionContext);
