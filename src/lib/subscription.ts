// 19 EUR/year per family. 14 free days, then paid or read-only.

export const TRIAL_DAYS = 14;
export type PlanStatus = "trialing" | "active" | "expired";

export function planStatus(f: { trial_ends_at: string; paid_until: string | null }, now: number): PlanStatus {
  if (f.paid_until && Date.parse(f.paid_until) > now) return "active";
  if (Date.parse(f.trial_ends_at) > now) return "trialing";
  return "expired";
}

export const canWrite = (s: PlanStatus) => s !== "expired";
export const trialEnd = (createdAt: number) => new Date(createdAt + TRIAL_DAYS * 86_400_000).toISOString();
