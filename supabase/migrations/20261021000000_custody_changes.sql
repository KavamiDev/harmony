-- Custody changes need both parents: one proposes, the other accepts or declines.
--   override: the child is with `side` from start_date to end_date (holidays, swapped weekend…)
--   cycle:    a new custody rhythm (preset or fully custom 14 days)
-- A parent alone in the family sees their changes applied at once.

create table public.custody_changes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  child_id uuid not null references public.children on delete cascade,
  kind text not null check (kind in ('override', 'cycle')),
  start_date date,
  end_date date,
  side text check (side in ('A', 'B')),
  cycle text check (cycle ~ '^[AB]+$' and length(cycle) in (7, 14)),
  anchor date check (extract(isodow from anchor) = 1),
  handover_time time,
  note text check (length(note) <= 500),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  proposed_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  decided_by uuid references auth.users on delete set null,
  decided_at timestamptz,
  check (
    (kind = 'override' and start_date is not null and end_date is not null and side is not null
      and end_date >= start_date and end_date - start_date <= 92)
    or (kind = 'cycle' and cycle is not null and anchor is not null and handover_time is not null)
  )
);
create index custody_changes_family on public.custody_changes (family_id, status, created_at desc);

alter table public.custody_changes enable row level security;
create policy changes_read on public.custody_changes for select to authenticated using (public.is_member(family_id));
revoke insert, update, delete, truncate on public.custody_changes from authenticated, anon;

-- The rhythm itself now only changes through an accepted proposal.
drop policy plans_insert on public.custody_plans;
drop policy plans_update on public.custody_plans;
revoke insert, update, delete on public.custody_plans from authenticated, anon;

-- Applies an accepted change (cycle only: overrides are read from the table).
create function public._apply_change(c public.custody_changes) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if c.kind = 'cycle' then
    update public.custody_plans
      set cycle = c.cycle, anchor = c.anchor, handover_time = c.handover_time, updated_at = now()
      where child_id = c.child_id;
  end if;
end;
$$;
revoke execute on function public._apply_change from public, anon, authenticated;

-- Inserts a proposal; accepts it at once when the proposer is alone in the family.
create function public._propose(c public.custody_changes) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  fam uuid;
  saved public.custody_changes;
begin
  select family_id into fam from public.children where id = c.child_id;
  if fam is null or not public.is_member(fam) then raise exception 'not a member'; end if;
  if not public.can_write(fam) then raise exception 'read only'; end if;
  c.family_id := fam;
  c.proposed_by := uid;
  c.status := 'pending';
  if (select count(*) from public.members where family_id = fam) < 2 then
    c.status := 'accepted';
    c.decided_by := uid;
    c.decided_at := now();
  end if;
  insert into public.custody_changes
    (family_id, child_id, kind, start_date, end_date, side, cycle, anchor, handover_time, note, status, proposed_by, decided_by, decided_at)
  values
    (c.family_id, c.child_id, c.kind, c.start_date, c.end_date, c.side, c.cycle, c.anchor, c.handover_time, c.note, c.status, c.proposed_by, c.decided_by, c.decided_at)
  returning * into saved;
  if saved.status = 'accepted' then perform public._apply_change(saved); end if;
  return saved.id;
end;
$$;
revoke execute on function public._propose from public, anon, authenticated;

create function public.propose_override(child uuid, start_date date, end_date date, side text, note text default null) returns uuid
language sql security definer set search_path = '' as $$
  select public._propose(row(null, null, child, 'override', start_date, end_date, side, null, null, null, note, null, null, null, null, null)::public.custody_changes);
$$;

create function public.propose_cycle(child uuid, cycle text, anchor date, handover_time time, note text default null) returns uuid
language sql security definer set search_path = '' as $$
  select public._propose(row(null, null, child, 'cycle', null, null, null, cycle, anchor, handover_time, note, null, null, null, null, null)::public.custody_changes);
$$;

-- The other parent answers. Nobody validates their own proposal.
create function public.respond_change(change uuid, accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  c public.custody_changes;
begin
  select * into c from public.custody_changes where id = change for update;
  if not found or not public.is_member(c.family_id) then raise exception 'not found'; end if;
  if c.status <> 'pending' then raise exception 'already decided'; end if;
  if c.proposed_by = uid then raise exception 'cannot answer own proposal'; end if;
  if not public.can_write(c.family_id) then raise exception 'read only'; end if;
  update public.custody_changes
    set status = case when accept then 'accepted' else 'declined' end, decided_by = uid, decided_at = now()
    where id = change returning * into c;
  if accept then perform public._apply_change(c); end if;
end;
$$;

-- The proposer withdraws a pending proposal.
create function public.cancel_change(change uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.custody_changes set status = 'cancelled', decided_by = auth.uid(), decided_at = now()
    where id = change and proposed_by = auth.uid() and status = 'pending';
  if not found then raise exception 'cannot cancel'; end if;
end;
$$;

revoke execute on function public.propose_override, public.propose_cycle, public.respond_change, public.cancel_change from public, anon;
grant execute on function public.propose_override, public.propose_cycle, public.respond_change, public.cancel_change to authenticated;

alter publication supabase_realtime add table public.custody_changes;
