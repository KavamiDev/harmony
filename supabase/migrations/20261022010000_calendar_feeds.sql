-- Private calendar links (Google / Apple subscribe by URL). One per parent, only its hash is stored.

create table public.calendar_feeds (
  user_id uuid primary key references auth.users on delete cascade,
  family_id uuid not null references public.families on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.calendar_feeds enable row level security;
create policy feeds_read_own on public.calendar_feeds for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete, truncate on public.calendar_feeds from authenticated, anon;

-- Creates (or replaces) the caller's link. The plain token is returned once, never stored.
create function public.new_calendar_feed() returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  fam uuid := (select family_id from public.members where user_id = auth.uid());
  token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if fam is null then raise exception 'not a member'; end if;
  insert into public.calendar_feeds (user_id, family_id, token_hash)
    values (uid, fam, encode(sha256(convert_to(token, 'UTF8')), 'hex'))
    on conflict (user_id) do update set token_hash = excluded.token_hash, family_id = excluded.family_id, created_at = now();
  return token;
end;
$$;

create function public.delete_calendar_feed() returns void
language sql security definer set search_path = '' as $$
  delete from public.calendar_feeds where user_id = auth.uid();
$$;

revoke execute on function public.new_calendar_feed, public.delete_calendar_feed from public, anon;
grant execute on function public.new_calendar_feed, public.delete_calendar_feed to authenticated;
