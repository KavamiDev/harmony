import type { InputHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";
import { Logo, Meadow } from "./art";

/** Centered card on the cream background, used by login, join and welcome. */
export function AuthShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-6">
      <Link to="/" aria-label="Harmony, accueil" className="mb-6 self-start sm:self-center"><Logo /></Link>
      <main className={`card w-full overflow-hidden ${wide ? "max-w-lg" : "max-w-md"}`}>
        <div className="p-6 sm:p-8">{children}</div>
        <Meadow className="w-full" />
      </main>
    </div>
  );
}

export function Field({ label, hint, ...input }: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = input.id ?? input.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-bold">{label}</label>
      <input id={id} {...input} className="min-h-12 w-full rounded-2xl border border-line bg-bg px-4 text-base outline-none transition focus:border-brand focus:bg-white" />
      {hint && <p className="text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return children ? <p role="alert" className="rounded-2xl bg-side-a-soft px-4 py-3 text-sm font-semibold text-side-a">{children}</p> : null;
}

export function Loading() {
  return <div className="grid min-h-dvh place-items-center text-muted" role="status">Chargement…</div>;
}
