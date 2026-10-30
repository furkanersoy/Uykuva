begin;

create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email, email_confirmed_at) values
  ('e0000000-0000-4000-8000-000000000001', 'owner@uykuva.test', pg_catalog.now()),
  ('e0000000-0000-4000-8000-000000000002', 'caregiver@uykuva.test', pg_catalog.now()),
  ('e0000000-0000-4000-8000-000000000003', 'family@uykuva.test', pg_catalog.now()),
  ('e0000000-0000-4000-8000-000000000004', 'outsider@uykuva.test', pg_catalog.now());

create temporary table sync_test_state (
  kind text primary key,
  family_id uuid,
  invite_token text,
  revision bigint
);
grant all on table pg_temp.sync_test_state to authenticated;

set local role authenticated;
set local request.jwt.claim.sub = 'e0000000-0000-4000-8000-000000000001';
insert into pg_temp.sync_test_state(kind, family_id)
values ('family', public.create_family());
select ok((select family_id is not null from pg_temp.sync_test_state where kind = 'family'), 'signed-in parent can create a family');

insert into pg_temp.sync_test_state(kind, invite_token)
select 'caregiver-invite', invite_token
from public.create_family_invite(
  (select family_id from pg_temp.sync_test_state where kind = 'family'),
  'caregiver@uykuva.test',
  'caregiver'
);

set local request.jwt.claim.sub = 'e0000000-0000-4000-8000-000000000004';
select throws_ok(
  $$select public.accept_family_invite((select invite_token from pg_temp.sync_test_state where kind = 'caregiver-invite'))$$,
  '42501',
  'Sign in with the email address that received this invitation.',
  'invitation token cannot be claimed from a different email account'
);

set local request.jwt.claim.sub = 'e0000000-0000-4000-8000-000000000002';
select is(
  public.accept_family_invite((select invite_token from pg_temp.sync_test_state where kind = 'caregiver-invite')),
  (select family_id from pg_temp.sync_test_state where kind = 'family'),
  'confirmed invitee joins the intended family'
);

set local request.jwt.claim.sub = 'e0000000-0000-4000-8000-000000000001';
insert into pg_temp.sync_test_state(kind, revision)
select 'first-write', public.append_sync_document(
  (select family_id from pg_temp.sync_test_state where kind = 'family'),
  'baby-1', 0, 1::smallint, pg_catalog.decode('00ff', 'hex')
);
select is((select revision from pg_temp.sync_test_state where kind = 'first-write'), 1::bigint, 'first encrypted document starts at revision one');

set local request.jwt.claim.sub = 'e0000000-0000-4000-8000-000000000002';
select is(
  (select count(*) from public.sync_documents where family_id = (select family_id from pg_temp.sync_test_state where kind = 'family')),
  1::bigint,
  'active caregiver can read family ciphertext'
);
select throws_ok(
  $$select public.append_sync_document(
    (select family_id from pg_temp.sync_test_state where kind = 'family'), 'baby-1', 0, 1::smallint, pg_catalog.decode('beef', 'hex')
  )$$,
  '40001',
  'The family document changed on another device; fetch the latest revision before retrying.',
  'stale revision cannot overwrite a newer device change'
);

set local request.jwt.claim.sub = 'e0000000-0000-4000-8000-000000000001';
insert into pg_temp.sync_test_state(kind, invite_token)
select 'family-invite', invite_token
from public.create_family_invite(
  (select family_id from pg_temp.sync_test_state where kind = 'family'),
  'family@uykuva.test',
  'family'
);

set local request.jwt.claim.sub = 'e0000000-0000-4000-8000-000000000003';
select is(
  public.accept_family_invite((select invite_token from pg_temp.sync_test_state where kind = 'family-invite')),
  (select family_id from pg_temp.sync_test_state where kind = 'family'),
  'family member can accept an email-matched invitation'
);
select is(
  (select count(*) from public.sync_documents where family_id = (select family_id from pg_temp.sync_test_state where kind = 'family')),
  1::bigint,
  'read-only family member can view encrypted data'
);
select throws_ok(
  $$select public.append_sync_document(
    (select family_id from pg_temp.sync_test_state where kind = 'family'), 'baby-1', 1, 1::smallint, pg_catalog.decode('cafe', 'hex')
  )$$,
  '42501',
  'An active parent or caregiver membership is required to sync changes.',
  'read-only family member cannot write a document'
);

set local request.jwt.claim.sub = 'e0000000-0000-4000-8000-000000000004';
select is_empty(
  $$select 1 from public.sync_documents where family_id = (select family_id from pg_temp.sync_test_state where kind = 'family')$$,
  'uninvited account cannot read family data'
);
select throws_ok(
  $$insert into public.sync_documents (family_id, child_id, revision, encryption_version, ciphertext, updated_by)
    values ((select family_id from pg_temp.sync_test_state where kind = 'family'), 'baby-2', 1, 1, pg_catalog.decode('01', 'hex'), auth.uid())$$,
  '42501',
  'permission denied for table sync_documents',
  'clients cannot bypass revision control with direct table writes'
);

set local request.jwt.claim.sub = 'e0000000-0000-4000-8000-000000000001';
select is(
  public.remove_family_member(
    (select family_id from pg_temp.sync_test_state where kind = 'family'),
    'e0000000-0000-4000-8000-000000000002'
  ),
  true,
  'family owner can revoke a caregiver membership'
);

set local request.jwt.claim.sub = 'e0000000-0000-4000-8000-000000000002';
select is_empty(
  $$select 1 from public.sync_documents where family_id = (select family_id from pg_temp.sync_test_state where kind = 'family')$$,
  'removed member loses access immediately'
);

set local request.jwt.claim.sub = 'e0000000-0000-4000-8000-000000000004';
select is(
  public.delete_family((select family_id from pg_temp.sync_test_state where kind = 'family')),
  false,
  'non-owner cannot delete a family or its data'
);

set local request.jwt.claim.sub = 'e0000000-0000-4000-8000-000000000001';
select is(
  public.delete_family((select family_id from pg_temp.sync_test_state where kind = 'family')),
  true,
  'family owner can delete the cloud copy'
);
select is(
  (select count(*) from public.families where id = (select family_id from pg_temp.sync_test_state where kind = 'family')),
  0::bigint,
  'family deletion removes its membership and invite records'
);
select is(
  (select count(*) from public.sync_documents where family_id = (select family_id from pg_temp.sync_test_state where kind = 'family')),
  0::bigint,
  'family deletion removes every encrypted child document'
);

select * from finish();
rollback;
