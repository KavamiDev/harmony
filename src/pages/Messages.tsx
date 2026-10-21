// One thread between the two parents. Append-only, live through Supabase Realtime.
import { useEffect, useRef, useState, type FormEvent } from "react";
import AppShell, { sideNames } from "../components/AppShell";
import { Icon } from "../components/art";
import { SIDE_STYLE } from "../components/TodayCard";
import { dayBucket, localDay } from "../lib/calendar";
import type { Side } from "../lib/custody";
import { fmtTime, todayLocal } from "../lib/dates";
import type { FamilyData } from "../lib/session";
import { supabase, type Tables } from "../lib/supabase";

type Message = Tables<"messages">;

export default function Messages() {
  return <AppShell>{(data) => <Thread data={data} />}</AppShell>;
}

function Thread({ data }: { data: FamilyData }) {
  const { family, me, members } = data;
  const names = sideNames(data);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLLIElement>(null);

  const add = (rows: Message[]) =>
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      return [...prev, ...rows.filter((m) => !seen.has(m.id))].sort((a, b) => a.created_at.localeCompare(b.created_at));
    });

  useEffect(() => {
    supabase.from("messages").select("*").eq("family_id", family.id).order("created_at").limit(500).then(({ data: rows }) => add(rows ?? []));
    const channel = supabase.channel(`messages-${family.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `family_id=eq.${family.id}` }, (p) => add([p.new as Message]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [family.id]);

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [messages.length]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true); setError("");
    const { data: row, error } = await supabase.from("messages").insert({ family_id: family.id, body: text }).select().single();
    setSending(false);
    if (error) return setError("Le message n'est pas parti. Réessayez.");
    setBody("");
    add([row]);
  }

  const sideOf = (userId: string | null) => (members.find((m) => m.user_id === userId)?.side ?? null) as Side | null;
  const other = members.find((m) => m.user_id !== me.user_id);
  const today = todayLocal();
  let lastDay = "";

  return (
    <main className="mx-auto max-w-3xl px-4 sm:px-6">
      <section aria-labelledby="thread" className="card flex flex-col overflow-hidden">
        <div className="border-b border-line px-5 py-4 sm:px-6">
          <h1 id="thread" className="font-display text-2xl font-medium">Messages</h1>
          <p className="text-sm text-muted">Entre {names.A} et {names.B}. Chaque message est daté et ne peut plus être modifié ni supprimé.</p>
        </div>

        <ol aria-live="polite" aria-label="Fil de messages" className="flex max-h-[60dvh] min-h-64 flex-col gap-2 overflow-y-auto px-4 py-4 sm:px-6">
          {messages.length === 0 && (
            <li className="m-auto max-w-xs text-center text-muted">
              Pas encore de message. Un horaire, un oubli de doudou, un rendez-vous : écrivez-le ici, tout reste au même endroit.
            </li>
          )}
          {messages.map((m) => {
            const day = localDay(m.created_at);
            const sep = day !== lastDay ? ((lastDay = day), dayBucket(day, today)) : null;
            const side = sideOf(m.author_id);
            const mine = m.author_id === me.user_id;
            return (
              <li key={m.id} className="contents">
                {sep && <span className="my-2 self-center rounded-full bg-bg px-3 py-1 text-xs font-bold text-muted first-letter:uppercase">{sep}</span>}
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${mine ? "self-end rounded-br-md" : "self-start rounded-bl-md"} ${side ? SIDE_STYLE[side].soft : "bg-bg"}`}>
                  <p className="whitespace-pre-wrap break-words text-[15px]">{m.body}</p>
                  <p className="mt-1 text-xs text-muted">{side ? names[side] : "Ancien membre"} · {fmtTime(m.created_at)}</p>
                </div>
              </li>
            );
          })}
          <li ref={end} aria-hidden="true" className="h-0" />
        </ol>

        {data.readOnly ? (
          <p className="border-t border-line bg-bg p-4 text-center text-sm text-muted">Lecture seule : abonnez-vous depuis les réglages pour écrire à nouveau.</p>
        ) : (
        <form onSubmit={send} className="border-t border-line bg-white p-3 sm:p-4">
          {error && <p role="alert" className="mb-2 text-sm font-semibold text-side-a">{error}</p>}
          <div className="flex items-end gap-2">
            <label htmlFor="body" className="sr-only">Votre message</label>
            <textarea
              id="body" rows={1} maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
              placeholder={other ? `Écrire à ${other.display_name}…` : "L'autre parent lira ce message quand il vous aura rejoint."}
              className="max-h-40 min-h-12 flex-1 resize-y rounded-3xl border border-line bg-bg px-4 py-3 text-[15px] outline-none focus:border-brand focus:bg-white"
            />
            <button disabled={sending || !body.trim()} aria-label="Envoyer" className="btn btn-primary !min-h-12 !w-12 !px-0 disabled:opacity-50"><Icon name="send" className="size-5" /></button>
          </div>
          <p className="mt-2 text-center text-xs text-muted">Entrée pour envoyer · Maj + Entrée pour aller à la ligne</p>
        </form>
        )}
      </section>
    </main>
  );
}
