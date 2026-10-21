// Shared documents: uploads by the parents and attachments filed from the child's mails.
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import AppShell from "../components/AppShell";
import { Icon } from "../components/art";
import { ErrorNote } from "../components/ui";
import { acceptAttachment, safeFileName } from "../lib/attachments";
import { fmtWhen } from "../lib/dates";
import { CATEGORIES, formatSize, openDocument, type Category } from "../lib/documents";
import type { FamilyData } from "../lib/session";
import { supabase, type Tables } from "../lib/supabase";

type Doc = Tables<"documents">;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,.doc,.docx,.xls,.xlsx,.odt,.txt";

export default function Documents() {
  return <AppShell>{(data) => <Library data={data} />}</AppShell>;
}

function Library({ data }: { data: FamilyData }) {
  const { family, child } = data;
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filter, setFilter] = useState<Category | "all">("all");

  const load = useCallback(async () => {
    const { data: rows } = await supabase.from("documents").select("*").eq("family_id", family.id).order("created_at", { ascending: false });
    setDocs(rows ?? []);
  }, [family.id]);
  useEffect(() => { load(); }, [load]);

  const shown = filter === "all" ? docs : docs.filter((d) => d.category === filter);

  async function setCategory(d: Doc, category: Category) {
    setDocs((all) => all.map((x) => (x.id === d.id ? { ...x, category } : x)));
    await supabase.from("documents").update({ category }).eq("id", d.id);
  }

  async function remove(d: Doc) {
    if (!confirm(`Supprimer « ${d.name} » pour vous deux ?`)) return;
    const { error } = await supabase.from("documents").delete().eq("id", d.id);
    if (!error) await supabase.storage.from("documents").remove([d.path]);
    load();
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
      <UploadCard data={data} onDone={load} />

      <section aria-labelledby="library" className="card p-5 sm:p-6">
        <h1 id="library" className="font-display text-2xl font-medium">Documents de {child.first_name}</h1>
        <div role="group" aria-label="Filtrer par catégorie" className="mt-4 flex flex-wrap gap-2">
          {(["all", ...Object.keys(CATEGORIES)] as (Category | "all")[]).map((c) => (
            <button key={c} onClick={() => setFilter(c)} aria-pressed={filter === c}
              className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${filter === c ? "bg-brand text-white" : "bg-bg text-muted hover:text-ink"}`}>
              {c === "all" ? "Tous" : CATEGORIES[c]}
            </button>
          ))}
        </div>

        {shown.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-bg px-4 py-3 text-muted">
            {docs.length === 0 ? "Aucun document pour l'instant. Ajoutez-en un, ou laissez les pièces jointes des mails arriver ici toutes seules." : "Rien dans cette catégorie."}
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {shown.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-bg p-3">
                <button onClick={() => openDocument(d.path)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-brand"><Icon name="folder" className="size-5" /></span>
                  <span className="min-w-0">
                    <b className="block truncate text-sm hover:underline">{d.name}</b>
                    <span className="text-xs text-muted">{formatSize(d.size)} · {fmtWhen(d.created_at)}{d.mail_id && " · venu d'un mail"}</span>
                  </span>
                </button>
                <label className="sr-only" htmlFor={`cat-${d.id}`}>Catégorie de {d.name}</label>
                <select id={`cat-${d.id}`} value={d.category} onChange={(e) => setCategory(d, e.target.value as Category)} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm font-semibold">
                  {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                {!d.mail_id && (
                  <button onClick={() => remove(d)} aria-label={`Supprimer ${d.name}`} className="grid size-9 place-items-center rounded-full text-muted hover:bg-white hover:text-side-a"><Icon name="trash" className="size-5" /></button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function UploadCard({ data, onDone }: { data: FamilyData; onDone: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<Category>("school");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function upload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    const name = safeFileName(file.name);
    const check = acceptAttachment({ mime: file.type, filename: name, size: file.size });
    if (!check.ok) return setError(check.reason === "too_big" ? "Ce fichier dépasse 10 Mo." : "Ce type de fichier n'est pas accepté (PDF, images, Word, Excel, texte).");
    setBusy(true); setError(""); setNote("");
    const path = `${data.family.id}/${crypto.randomUUID()}-${name}`;
    const up = await supabase.storage.from("documents").upload(path, file, { contentType: file.type || "application/octet-stream" });
    if (up.error) { setBusy(false); return setError("L'envoi a échoué. Réessayez."); }
    const { error } = await supabase.from("documents").insert({ family_id: data.family.id, child_id: data.child.id, category, name, path, size: file.size, mime: file.type || "application/octet-stream" });
    if (error) { await supabase.storage.from("documents").remove([path]); setBusy(false); return setError("Le document n'a pas pu être enregistré."); }
    setBusy(false); setFile(null); if (input.current) input.current.value = "";
    setNote(`« ${name} » est disponible pour vous deux.`);
    onDone();
  }

  return (
    <section aria-labelledby="upload" className="card h-fit p-5 sm:p-6">
      <h2 id="upload" className="flex items-center gap-2 text-lg font-bold"><span className="grid size-9 place-items-center rounded-full bg-sky text-side-b"><Icon name="plus" className="size-5" /></span>Ajouter un document</h2>
      <form onSubmit={upload} className="mt-4 space-y-4">
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-bg px-4 py-6 text-center hover:border-leaf">
          <Icon name="folder" className="size-8 text-brand" />
          <span className="font-bold">{file ? file.name : "Choisir un fichier"}</span>
          <span className="text-sm text-muted">{file ? formatSize(file.size) : "PDF, photo, Word… 10 Mo maximum"}</span>
          <input ref={input} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(""); setNote(""); }} />
        </label>
        <div className="space-y-1.5">
          <label htmlFor="category" className="block text-sm font-bold">Catégorie</label>
          <select id="category" value={category} onChange={(e) => setCategory(e.target.value as Category)} className="min-h-12 w-full rounded-2xl border border-line bg-bg px-4">
            {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <ErrorNote>{error}</ErrorNote>
        {note && <p role="status" className="text-sm font-semibold text-brand">{note}</p>}
        <button disabled={!file || busy} className="btn btn-primary w-full disabled:opacity-50">{busy ? "Envoi…" : "Ajouter"}</button>
        <p className="text-xs text-muted">Pas de documents médicaux pour le moment (ordonnances, comptes rendus) : leur hébergement demande des garanties particulières.</p>
      </form>
    </section>
  );
}
