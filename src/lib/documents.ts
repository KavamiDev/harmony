// Document categories, sizes and the signed-URL opener shared by Mails and Documents.
import { supabase } from "./supabase";

export const CATEGORIES = { school: "École", admin: "Administratif", activity: "Activités", other: "Autre" } as const;
export type Category = keyof typeof CATEGORIES;

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

/** Splits text into plain parts and http(s) links, for safe rendering without HTML. */
export function linkify(text: string): { text: string; href?: string }[] {
  const parts: { text: string; href?: string }[] = [];
  let last = 0;
  for (const m of text.matchAll(/https?:\/\/[^\s<>()"]+[^\s<>()".,;:!?]/g)) {
    if (m.index > last) parts.push({ text: text.slice(last, m.index) });
    parts.push({ text: m[0], href: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** Opens a private file through a short-lived signed URL. */
export async function openDocument(path: string) {
  const tab = window.open("", "_blank"); // opened synchronously so mobile browsers do not block it
  const { data } = await supabase.storage.from("documents").createSignedUrl(path, 60);
  if (data && tab) tab.location.href = data.signedUrl;
  else tab?.close();
}
