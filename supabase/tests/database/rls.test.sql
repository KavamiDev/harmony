-- RLS: families are isolated, messages are append-only, mails are read-only, invites work once.
begin;
select plan(19);

-- Three parents: A1 and A2 will share family 1, C is alone in family 2.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'a1@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'a2@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'c@test.local');

create function pg_temp.login(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

select pg_temp.login('11111111-1111-1111-1111-111111111111');
select lives_ok($$ select public.create_family('Camille', 'Léa', 'Léa', 'lea.k7m2', 'AAAAAAABBBBBBB', '2026-10-19') $$, 'A1 creates family 1');
select throws_ok($$ select public.create_family('Camille', 'X', 'Tom', 'tom.abcd', 'AAAAAAABBBBBBB', '2026-10-19') $$, 'already in a family', 'one family per parent');
insert into public.invites (token_hash, family_id)
  select encode(sha256(convert_to('tok-family-1', 'UTF8')), 'hex'), id from public.families;
insert into public.messages (family_id, body) select id, 'Bonjour' from public.families;
select set_config('test.f1', (select id::text from public.families), true);

select pg_temp.login('33333333-3333-3333-3333-333333333333');
select lives_ok($$ select public.create_family('Sam', 'Tom', 'Tom', 'tom.abcd', 'AABBAAABBAABBB', '2026-10-19') $$, 'C creates family 2');
select is((select count(*) from public.families)::int, 1, 'C sees only their family');
select is((select count(*) from public.messages)::int, 0, 'C cannot read family 1 messages');
select is((select count(*) from public.children where mail_local = 'lea.k7m2')::int, 0, 'C cannot see Léa');
select throws_ok($$ insert into public.messages (family_id, body) values (current_setting('test.f1')::uuid, 'intrusion') $$,
  '42501', null, 'C cannot post in family 1');
select is((select public.is_member(id) from public.families limit 1), true, 'is_member works for own family');

-- Invite preview is available before login, then A2 joins.
reset role;
set local role anon;
select is((select status from public.invite_preview('tok-family-1')), 'ok', 'anon can preview a valid invite');
select is((select status from public.invite_preview('nope')), 'invalid', 'unknown token is invalid');

set local role authenticated;
select pg_temp.login('22222222-2222-2222-2222-222222222222');
select lives_ok($$ select public.accept_invite('tok-family-1', 'Alex') $$, 'A2 joins with the link');
select is((select side from public.members where user_id = auth.uid()), 'B', 'A2 is side B');
select is((select count(*) from public.messages)::int, 1, 'A2 reads the family thread');

-- Messages are append-only, even for their author.
select pg_temp.login('11111111-1111-1111-1111-111111111111');
select throws_ok($$ update public.messages set body = 'changed' $$, '42501', null, 'messages cannot be edited');
select throws_ok($$ delete from public.messages $$, '42501', null, 'messages cannot be deleted');

-- Mails are written by the Worker only.
select throws_ok($$ insert into public.mails (family_id, child_id, message_id, from_addr) select family_id, id, 'm1', 'x@y' from public.children $$,
  '42501', null, 'parents cannot forge a mail');

-- The invite is single use.
select pg_temp.login('33333333-3333-3333-3333-333333333333');
select throws_ok($$ select public.accept_invite('tok-family-1', 'Sam') $$, 'invite already used', 'used invite is refused');

-- Trial over and nothing paid: read-only on the server too.
reset role;
update public.families set trial_ends_at = now() - interval '1 day', paid_until = null where id = current_setting('test.f1')::uuid;
set local role authenticated;
select pg_temp.login('11111111-1111-1111-1111-111111111111');
select throws_ok($$ insert into public.messages (family_id, body) values (current_setting('test.f1')::uuid, 'après l''essai') $$, '42501', null, 'expired family cannot write');
select is((select count(*) from public.messages)::int, 1, 'expired family still reads its messages');

select * from finish();
rollback;
