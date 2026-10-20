-- Harmony V1 schema. Every table is scoped to a family; a parent only ever sees their own.
-- Writes that create families or add parents go through security definer functions.

-- ── Tables ──────────────────────────────────────────────────────────────

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default now() + interval '14 days',
  paid_until timestamptz,
  stripe_customer_id text
);

create table public.members (
  family_id uuid not null references public.families on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  display_name text not null check (length(display_name) between 1 and 40),
  side text not null check (side in ('A', 'B')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id),
  unique (family_id, side)
);
create unique index members_one_family_per_user on public.members (user_id); -- V1: one family per parent

create table public.invites (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  family_id uuid not null references public.families on delete cascade,
  created_by uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  used_by uuid references auth.users on delete set null
);

create table public.children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  first_name text not null check (length(first_name) between 1 and 40),
  mail_local text not null unique check (mail_local ~ '^[a-z0-9]{2,20}\.[abcdefghjkmnpqrstuvwxyz23456789]{4}$'),
  created_at timestamptz not null default now()
);

create table public.custody_plans (
  child_id uuid primary key references public.children on delete cascade,
  family_id uuid not null references public.families on delete cascade,
  cycle text not null check (cycle ~ '^[AB]+$' and length(cycle) in (7, 14)),
  anchor date not null check (extract(isodow from anchor) = 1), -- a Monday
  handover_time time not null default '18:00',
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  child_id uuid references public.children on delete cascade,
  title text not null check (length(title) between 1 and 120),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  place text check (length(place) <= 200),
  notes text check (length(notes) <= 2000),
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index events_family_starts on public.events (family_id, starts_at);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  author_id uuid default auth.uid() references auth.users on delete set null, -- null once the parent deleted their account
  body text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index messages_family_created on public.messages (family_id, created_at);

create table public.mails (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  child_id uuid not null references public.children on delete cascade,
  message_id text not null unique,
  from_addr text not null,
  from_name text,
  subject text not null default '',
  text text not null default '',
  skipped_attachments jsonb not null default '[]',
  received_at timestamptz not null default now()
);
create index mails_family_received on public.mails (family_id, received_at desc);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  child_id uuid references public.children on delete cascade,
  category text not null check (category in ('school', 'admin', 'activity', 'other')),
  name text not null check (length(name) between 1 and 200),
  path text not null unique,
  size integer not null check (size between 0 and 10485760),
  mime text not null,
  mail_id uuid references public.mails on delete cascade,
  created_by uuid default auth.uid() references auth.users on delete set null,
  created_at timestamptz not null default now(),
  check (path like family_id::text || '/%')
);
create index documents_family_created on public.documents (family_id, created_at desc);

-- ── Helpers ─────────────────────────────────────────────────────────────

create function public.is_member(f uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members where family_id = f and user_id = (select auth.uid()));
$$;

-- Read-only once the trial is over and nothing is paid.
create function public.can_write(f uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.families
    where id = f and (trial_ends_at > now() or coalesce(paid_until > now(), false))
  );
$$;

-- Storage paths look like "<family_id>/<file>".
create function public.path_family(p text) returns uuid
language sql immutable set search_path = '' as $$
  select case when split_part(p, '/', 1) ~ '^[0-9a-f-]{36}$' then split_part(p, '/', 1)::uuid end;
$$;

-- ── RLS ─────────────────────────────────────────────────────────────────

alter table public.families enable row level security;
alter table public.members enable row level security;
alter table public.invites enable row level security;
alter table public.children enable row level security;
alter table public.custody_plans enable row level security;
alter table public.events enable row level security;
alter table public.messages enable row level security;
alter table public.mails enable row level security;
alter table public.documents enable row level security;

-- families: read; rename only (billing columns are written by the service role)
create policy families_read on public.families for select to authenticated using (public.is_member(id));
create policy families_rename on public.families for update to authenticated using (public.is_member(id)) with check (public.is_member(id));
revoke update on public.families from authenticated;
grant update (name) on public.families to authenticated;

-- members: read; a parent can change their own display name
create policy members_read on public.members for select to authenticated using (public.is_member(family_id));
create policy members_rename on public.members for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on public.members from authenticated;
grant update (display_name) on public.members to authenticated;

-- invites: a parent creates and sees their family's invites
create policy invites_read on public.invites for select to authenticated using (public.is_member(family_id));
create policy invites_create on public.invites for insert to authenticated
  with check (public.is_member(family_id) and created_by = (select auth.uid()) and used_at is null);

-- children, custody plans, events: shared by both parents
create policy children_read on public.children for select to authenticated using (public.is_member(family_id));
create policy children_write on public.children for insert to authenticated with check (public.is_member(family_id) and public.can_write(family_id));
create policy children_update on public.children for update to authenticated using (public.is_member(family_id)) with check (public.is_member(family_id) and public.can_write(family_id));
revoke update on public.children from authenticated;
grant update (first_name) on public.children to authenticated;

create policy plans_read on public.custody_plans for select to authenticated using (public.is_member(family_id));
create policy plans_insert on public.custody_plans for insert to authenticated with check (public.is_member(family_id) and public.can_write(family_id));
create policy plans_update on public.custody_plans for update to authenticated using (public.is_member(family_id)) with check (public.is_member(family_id) and public.can_write(family_id));

create policy events_read on public.events for select to authenticated using (public.is_member(family_id));
create policy events_insert on public.events for insert to authenticated with check (public.is_member(family_id) and public.can_write(family_id) and created_by = (select auth.uid()));
create policy events_update on public.events for update to authenticated using (public.is_member(family_id)) with check (public.is_member(family_id) and public.can_write(family_id));
create policy events_delete on public.events for delete to authenticated using (public.is_member(family_id) and public.can_write(family_id));

-- messages: append-only. No update or delete policy, and the privileges are revoked too.
create policy messages_read on public.messages for select to authenticated using (public.is_member(family_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (public.is_member(family_id) and public.can_write(family_id) and author_id = (select auth.uid()));
revoke update, delete, truncate on public.messages from authenticated, anon;

-- mails: read-only for parents, written by the mail-in Worker (service role)
create policy mails_read on public.mails for select to authenticated using (public.is_member(family_id));
revoke insert, update, delete, truncate on public.mails from authenticated, anon;

-- documents: shared; a document that came with a mail cannot be deleted
create policy documents_read on public.documents for select to authenticated using (public.is_member(family_id));
create policy documents_insert on public.documents for insert to authenticated
  with check (public.is_member(family_id) and public.can_write(family_id) and mail_id is null and created_by = (select auth.uid()));
create policy documents_update on public.documents for update to authenticated using (public.is_member(family_id)) with check (public.is_member(family_id));
create policy documents_delete on public.documents for delete to authenticated using (public.is_member(family_id) and mail_id is null);
revoke update on public.documents from authenticated;
grant update (name, category) on public.documents to authenticated;

-- ── Functions called by the app ─────────────────────────────────────────

-- First parent: creates the family, themself as side A, the child and the custody plan, in one go.
create function public.create_family(
  display_name text, family_name text, child_first_name text, child_mail_local text, cycle text, anchor date
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  fid uuid;
  cid uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if exists (select 1 from public.members where user_id = uid) then raise exception 'already in a family'; end if;
  insert into public.families (name) values (family_name) returning id into fid;
  insert into public.members (family_id, user_id, display_name, side) values (fid, uid, display_name, 'A');
  insert into public.children (family_id, first_name, mail_local) values (fid, child_first_name, child_mail_local) returning id into cid;
  insert into public.custody_plans (child_id, family_id, cycle, anchor) values (cid, fid, cycle, anchor);
  return fid;
end;
$$;

-- Join page, before login: who invites, for which child. Nothing else leaks.
create function public.invite_preview(token text) returns table (inviter text, child text, status text)
language plpgsql stable security definer set search_path = '' as $$
declare
  inv public.invites;
begin
  select * into inv from public.invites where token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex');
  if not found then return query select null::text, null::text, 'invalid'::text; return; end if;
  return query
    select m.display_name, (select c.first_name from public.children c where c.family_id = inv.family_id order by c.created_at limit 1),
      case
        when inv.used_at is not null then 'used'
        when inv.expires_at <= now() then 'expired'
        when (select count(*) from public.members where family_id = inv.family_id) >= 2 then 'full'
        else 'ok'
      end
    from public.members m where m.family_id = inv.family_id and m.user_id = inv.created_by;
end;
$$;

-- Second parent: consumes the invite and joins as side B.
create function public.accept_invite(token text, display_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  inv public.invites;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into inv from public.invites where token_hash = encode(sha256(convert_to(token, 'UTF8')), 'hex') for update;
  if not found then raise exception 'invalid invite'; end if;
  if inv.used_at is not null then raise exception 'invite already used'; end if;
  if inv.expires_at <= now() then raise exception 'invite expired'; end if;
  if exists (select 1 from public.members where user_id = uid) then raise exception 'already in a family'; end if;
  if (select count(*) from public.members where family_id = inv.family_id) >= 2 then raise exception 'family is full'; end if;
  insert into public.members (family_id, user_id, display_name, side) values (inv.family_id, uid, display_name, 'B');
  update public.invites set used_at = now(), used_by = uid where token_hash = inv.token_hash;
  return inv.family_id;
end;
$$;

revoke execute on function public.create_family, public.accept_invite from anon, public;
grant execute on function public.create_family, public.accept_invite to authenticated;
grant execute on function public.invite_preview to anon, authenticated;

-- ── Storage ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 10485760);

create policy documents_files_read on storage.objects for select to authenticated
  using (bucket_id = 'documents' and public.is_member(public.path_family(name)));
create policy documents_files_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and public.is_member(public.path_family(name)) and public.can_write(public.path_family(name)));
create policy documents_files_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents' and public.is_member(public.path_family(name))
    and not exists (select 1 from public.documents d where d.path = storage.objects.name and d.mail_id is not null)
  );

-- ── Realtime ────────────────────────────────────────────────────────────

alter publication supabase_realtime add table public.messages, public.mails, public.events;
