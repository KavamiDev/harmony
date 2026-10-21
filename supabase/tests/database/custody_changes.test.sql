-- Custody changes: proposed by one parent, validated by the other.
begin;
select plan(14);

insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'pa@test.local'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'pb@test.local'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'other@test.local');

create function pg_temp.login(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- Alone in the family: changes apply at once.
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
select public.create_family('Pa', 'Zoé', 'Zoé', 'zoe.abcd', 'AAAAAAABBBBBBB', '2026-10-19');
select set_config('test.child', (select id::text from public.children), true);
select set_config('test.fam', (select id::text from public.families), true);
select set_config('test.c0', public.propose_cycle(current_setting('test.child')::uuid, 'AABBAAABBAABBB', '2026-10-19', '17:30')::text, true);
select is((select status from public.custody_changes where id = current_setting('test.c0')::uuid), 'accepted', 'a parent alone sees a cycle change applied at once');
select is((select cycle from public.custody_plans), 'AABBAAABBAABBB', 'the cycle was applied');
select throws_ok($$ update public.custody_plans set cycle = 'BBBBBBBAAAAAAA' $$, '42501', null, 'the rhythm cannot be edited directly');

-- Second parent joins.
insert into public.invites (token_hash, family_id) values (encode(sha256(convert_to('tok-zoe', 'UTF8')), 'hex'), current_setting('test.fam')::uuid);
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000002');
select public.accept_invite('tok-zoe', 'Pb');

-- Pb proposes a weekend; it stays pending until Pa answers.
select set_config('test.c1', public.propose_override(current_setting('test.child')::uuid, '2026-10-24', '2026-10-25', 'B', 'Anniversaire de mamie')::text, true);
select is((select status from public.custody_changes where id = current_setting('test.c1')::uuid), 'pending', 'with two parents a change waits for validation');
select throws_ok($$ select public.respond_change(current_setting('test.c1')::uuid, true) $$, 'cannot answer own proposal', 'nobody validates their own proposal');
select throws_ok($$ insert into public.custody_changes (family_id, child_id, kind, cycle, anchor, handover_time) values (current_setting('test.fam')::uuid, current_setting('test.child')::uuid, 'cycle', 'AAAAAAA', '2026-10-19', '18:00') $$,
  '42501', null, 'changes cannot be written directly');

-- A stranger sees nothing and cannot answer.
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000003');
select is((select count(*) from public.custody_changes)::int, 0, 'a stranger sees no change');
select throws_ok($$ select public.respond_change(current_setting('test.c1')::uuid, true) $$, 'not found', 'a stranger cannot answer');

-- Pa accepts.
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
select lives_ok($$ select public.respond_change(current_setting('test.c1')::uuid, true) $$, 'the other parent accepts');
select is((select status || '/' || (decided_by = auth.uid())::text from public.custody_changes where id = current_setting('test.c1')::uuid), 'accepted/true', 'accepted and signed by Pa');
select throws_ok($$ select public.respond_change(current_setting('test.c1')::uuid, false) $$, 'already decided', 'a decision is final');

-- A cycle proposal by Pa, declined by Pb, leaves the rhythm untouched.
select set_config('test.c2', public.propose_cycle(current_setting('test.child')::uuid, 'BBBBBBBAAAAAAA', '2026-10-19', '18:00')::text, true);
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000002');
select lives_ok($$ select public.respond_change(current_setting('test.c2')::uuid, false) $$, 'Pb declines');
select is((select cycle from public.custody_plans), 'AABBAAABBAABBB', 'a declined cycle is not applied');

-- Only the proposer can cancel a pending proposal.
select set_config('test.c3', public.propose_override(current_setting('test.child')::uuid, '2026-12-24', '2026-12-26', 'B')::text, true);
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
select throws_ok($$ select public.cancel_change(current_setting('test.c3')::uuid) $$, 'cannot cancel', 'only the proposer can cancel');

select * from finish();
rollback;
