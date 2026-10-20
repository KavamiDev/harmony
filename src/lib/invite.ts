// Invitation links: a random token is shared, only its SHA-256 is stored.

export const INVITE_DAYS = 7;
export const MAX_PARENTS = 2;

export function newInviteToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function inviteStatus(invite: { expires_at: string; used_at: string | null }, memberCount: number, now: number) {
  if (invite.used_at) return "used" as const;
  if (Date.parse(invite.expires_at) <= now) return "expired" as const;
  if (memberCount >= MAX_PARENTS) return "full" as const;
  return "ok" as const;
}
