-- Mail notifications: a new mail for the child, a message from the other parent,
-- a custody change waiting for an answer (and the answer, for the proposer).
-- Triggers fill an outbox, then ping the `notify` Edge Function, which sends and marks them.

-- Each parent chooses what they hear about.
alter table public.members
  add column notify_mail boolean not null default true,
  add column notify_message boolean not null default true,
  add column notify_change boolean not null default true;
grant update (notify_mail, notify_message, notify_change) on public.members to authenticated;

-- Server-side settings, never exposed through the API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.config (key text primary key, value text not null);
-- Set per environment: notify_url (Edge Function URL) and notify_secret (shared with the function).

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  recipient uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('mail', 'message', 'change', 'change_answered')),
  ref_id uuid not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  skipped text,
  attempts integer not null default 0,
  unique (recipient, kind, ref_id)
);
create index notifications_unsent on public.notifications (created_at) where sent_at is null;
alter table public.notifications enable row level security; -- no policy: service role only
revoke all on public.notifications from anon, authenticated;

create function private.enqueue(fam uuid, recipients uuid[], kind text, ref uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  url text := (select value from private.config where key = 'notify_url');
  secret text := (select value from private.config where key = 'notify_secret');
begin
  if coalesce(array_length(recipients, 1), 0) = 0 then return; end if;
  insert into public.notifications (family_id, recipient, kind, ref_id)
    select fam, r, kind, ref from unnest(recipients) r
    on conflict do nothing;
  if url is not null then
    perform net.http_post(
      url := url,
      body := '{}'::jsonb,
      headers := jsonb_build_object('content-type', 'application/json', 'x-notify-secret', coalesce(secret, ''))
    );
  end if;
end;
$$;

create function private.on_mail() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.enqueue(new.family_id,
    array(select user_id from public.members where family_id = new.family_id and notify_mail), 'mail', new.id);
  return new;
end;
$$;

create function private.on_message() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.enqueue(new.family_id,
    array(select user_id from public.members where family_id = new.family_id and user_id is distinct from new.author_id and notify_message), 'message', new.id);
  return new;
end;
$$;

create function private.on_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform private.enqueue(new.family_id,
      array(select user_id from public.members where family_id = new.family_id and user_id is distinct from new.proposed_by and notify_change), 'change', new.id);
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status in ('accepted', 'declined') and new.decided_by is distinct from new.proposed_by then
    perform private.enqueue(new.family_id,
      array(select user_id from public.members where family_id = new.family_id and user_id = new.proposed_by and notify_change), 'change_answered', new.id);
  end if;
  return new;
end;
$$;

create trigger notify_mail after insert on public.mails for each row execute function private.on_mail();
create trigger notify_message after insert on public.messages for each row execute function private.on_message();
create trigger notify_change after insert or update of status on public.custody_changes for each row execute function private.on_change();
