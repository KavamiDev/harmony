-- Two sends can run at the same time (one per trigger): each claims its rows atomically.
alter table public.notifications add column claimed_at timestamptz;

create function public.claim_notifications(max integer) returns setof public.notifications
language sql security definer set search_path = '' as $$
  update public.notifications n set claimed_at = now()
  where n.id in (
    select id from public.notifications
    where sent_at is null and attempts < 5 and (claimed_at is null or claimed_at < now() - interval '5 minutes')
    order by created_at limit max
    for update skip locked
  )
  returning n.*;
$$;
revoke execute on function public.claim_notifications from public, anon, authenticated;
grant execute on function public.claim_notifications to service_role;
