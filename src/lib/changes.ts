// Custody change proposals for the family, kept live with Realtime.
import { useCallback, useEffect, useState } from "react";
import { useSession, type FamilyData } from "./session";
import { supabase, type Tables } from "./supabase";

export type Change = Tables<"custody_changes">;

export function useCustodyChanges(data: FamilyData) {
  const { reload } = useSession();
  const [changes, setChanges] = useState<Change[]>([]);
  const familyId = data.family.id;

  const load = useCallback(async () => {
    const { data: rows } = await supabase.from("custody_changes").select("*").eq("family_id", familyId).order("created_at", { ascending: false }).limit(300);
    setChanges(rows ?? []);
  }, [familyId]);

  useEffect(() => {
    load();
    const channel = supabase.channel(`changes-${familyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "custody_changes", filter: `family_id=eq.${familyId}` }, (p) => {
        load();
        const row = p.new as Partial<Change>;
        if (row.kind === "cycle" && row.status === "accepted") reload(); // the rhythm itself changed
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [familyId, load, reload]);

  const overrides = changes
    .filter((c) => c.kind === "override" && c.status === "accepted")
    .map((c) => ({ start_date: c.start_date!, end_date: c.end_date!, side: c.side!, decided_at: c.decided_at }));
  const pending = changes.filter((c) => c.status === "pending");
  return { changes, overrides, pending, reload: load };
}
