-- Calendar links are personal: each parent only sees their own, and a new link replaces the old one.
begin;
select plan(5);
insert into auth.users (id, email) values
  ('cccccccc-0000-0000-0000-000000000001', 'fa@test.local'),
  ('cccccccc-0000-0000-0000-000000000002', 'fb@test.local');
create function pg_temp.login(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;
set local role authenticated;
select pg_temp.login('cccccccc-0000-0000-0000-000000000001');
select public.create_family('Fa', 'Ana', 'Ana', 'ana.abcd', 'AAAAAAABBBBBBB', '2026-10-19');
insert into public.invites (token_hash, family_id) select encode(sha256(convert_to('tok-ana', 'UTF8')), 'hex'), id from public.families;
select set_config('test.t1', public.new_calendar_feed(), true);
select matches(current_setting('test.t1'), '^[0-9a-f]{48}$', 'the link token is 192 random bits in hex');
select set_config('test.t2', public.new_calendar_feed(), true);
select is((select token_hash from public.calendar_feeds), encode(sha256(convert_to(current_setting('test.t2'), 'UTF8')), 'hex'), 'a new link replaces the old one');
select pg_temp.login('cccccccc-0000-0000-0000-000000000002');
select public.accept_invite('tok-ana', 'Fb');
select is((select count(*) from public.calendar_feeds)::int, 0, 'the other parent cannot see my link');
select throws_ok($$ insert into public.calendar_feeds (user_id, family_id, token_hash) select auth.uid(), id, repeat('a', 64) from public.families $$, '42501', null, 'links cannot be written directly');
select pg_temp.login('cccccccc-0000-0000-0000-000000000001');
select public.delete_calendar_feed();
select is((select count(*) from public.calendar_feeds)::int, 0, 'a parent can delete their link');
select * from finish();
rollback;
