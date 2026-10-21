-- Notifications are queued for the right parent, and respect each parent's settings.
begin;
select plan(8);

insert into auth.users (id, email) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'na@test.local'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'nb@test.local');

create function pg_temp.login(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000001');
select public.create_family('Na', 'Noé', 'Noé', 'noe.abcd', 'AAAAAAABBBBBBB', '2026-10-19');
select set_config('test.fam', (select id::text from public.families), true);
select set_config('test.child', (select id::text from public.children), true);
insert into public.invites (token_hash, family_id) values (encode(sha256(convert_to('tok-noe', 'UTF8')), 'hex'), current_setting('test.fam')::uuid);
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
select public.accept_invite('tok-noe', 'Nb');

-- Nb writes: only Na is notified.
insert into public.messages (family_id, body) values (current_setting('test.fam')::uuid, 'Coucou');
reset role;
select is((select array_agg(recipient)::text from public.notifications where family_id = current_setting('test.fam')::uuid and kind = 'message'), '{bbbbbbbb-0000-0000-0000-000000000001}', 'a message notifies the other parent only');

-- A mail for the child notifies both parents.
insert into public.mails (family_id, child_id, message_id, from_addr, subject)
  values (current_setting('test.fam')::uuid, current_setting('test.child')::uuid, '<n1@school>', 'school@example.org', 'Réunion');
select is((select count(*) from public.notifications where family_id = current_setting('test.fam')::uuid and kind = 'mail')::int, 2, 'a mail for the child notifies both parents');

-- A pending change notifies the other parent; the answer notifies the proposer.
set local role authenticated;
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
select set_config('test.c', public.propose_override(current_setting('test.child')::uuid, '2026-11-07', '2026-11-08', 'B')::text, true);
reset role;
select is((select recipient::text from public.notifications where family_id = current_setting('test.fam')::uuid and kind = 'change'), 'bbbbbbbb-0000-0000-0000-000000000001', 'a change request notifies the other parent');
set local role authenticated;
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000001');
select public.respond_change(current_setting('test.c')::uuid, true);
reset role;
select is((select recipient::text from public.notifications where family_id = current_setting('test.fam')::uuid and kind = 'change_answered'), 'bbbbbbbb-0000-0000-0000-000000000002', 'the answer notifies the proposer');

-- Na turns messages off: no more message notifications for Na.
set local role authenticated;
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000001');
select lives_ok($$ update public.members set notify_message = false where user_id = auth.uid() $$, 'a parent can turn message notifications off');
select throws_ok($$ update public.members set side = 'B' where user_id = auth.uid() $$, '42501', null, 'but cannot change their side');
select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
insert into public.messages (family_id, body) values (current_setting('test.fam')::uuid, 'Encore');
reset role;
select is((select count(*) from public.notifications where family_id = current_setting('test.fam')::uuid and kind = 'message')::int, 1, 'no notification once turned off');

-- Parents cannot read the outbox.
set local role authenticated;
select throws_ok($$ select * from public.notifications $$, '42501', null, 'the outbox is not readable by parents');

select * from finish();
rollback;
