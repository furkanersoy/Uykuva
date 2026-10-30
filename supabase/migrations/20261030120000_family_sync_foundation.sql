begin;

create extension if not exists pgcrypto with schema extensions;

create table public.families (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now(),
  unique (id, owner_id)
);

create table public.family_members (
  family_id uuid not null,
  family_owner_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('parent', 'caregiver', 'family')),
  joined_at timestamptz not null default pg_catalog.now(),
  primary key (family_id, user_id),
  foreign key (family_id, family_owner_id)
    references public.families(id, owner_id) on delete cascade
);

create index family_members_by_user_idx on public.family_members(user_id, family_id);

create table public.family_invites (
  id uuid primary key default extensions.gen_random_uuid(),
  family_id uuid not null,
  family_owner_id uuid not null,
  invited_email text not null check (length(invited_email) between 3 and 320),
  role text not null check (role in ('parent', 'caregiver', 'family')),
  token_hash bytea not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default pg_catalog.now(),
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  foreign key (family_id, family_owner_id)
    references public.families(id, owner_id) on delete cascade,
  check (expires_at > created_at),
  check (accepted_at is not null or accepted_by is null),
  check (not (accepted_at is not null and revoked_at is not null))
);

create index family_invites_for_owner_idx
  on public.family_invites(family_id, family_owner_id, created_at desc);

create table public.sync_documents (
  family_id uuid not null references public.families(id) on delete cascade,
  child_id text not null check (length(child_id) between 1 and 128),
  revision bigint not null check (revision > 0),
  encryption_version smallint not null check (encryption_version > 0),
  ciphertext bytea not null check (octet_length(ciphertext) between 1 and 10485760),
  updated_at timestamptz not null default pg_catalog.now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (family_id, child_id)
);

create index sync_documents_updated_idx on public.sync_documents(family_id, updated_at desc);

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_invites enable row level security;
alter table public.sync_documents enable row level security;

revoke all on table public.families, public.family_members, public.family_invites, public.sync_documents
  from public, anon, authenticated;
grant select on table public.families, public.family_members, public.family_invites, public.sync_documents
  to authenticated;

create policy family_members_can_read_family
  on public.families for select to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.family_members as member
      where member.family_id = families.id
        and member.user_id = (select auth.uid())
    )
  );

create policy users_and_family_owners_can_read_members
  on public.family_members for select to authenticated
  using (user_id = (select auth.uid()) or family_owner_id = (select auth.uid()));

create policy family_owners_can_read_invites
  on public.family_invites for select to authenticated
  using (family_owner_id = (select auth.uid()) and created_by = (select auth.uid()));

create policy family_members_can_read_encrypted_documents
  on public.sync_documents for select to authenticated
  using (
    exists (
      select 1 from public.family_members as member
      where member.family_id = sync_documents.family_id
        and member.user_id = (select auth.uid())
    )
  );

create function public.create_family()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_family_id uuid;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'An authenticated account is required.';
  end if;

  insert into public.families (owner_id) values (v_user_id) returning id into v_family_id;
  insert into public.family_members (family_id, family_owner_id, user_id, role)
  values (v_family_id, v_user_id, v_user_id, 'parent');
  return v_family_id;
end;
$$;

create function public.create_family_invite(p_family_id uuid, p_invited_email text, p_role text)
returns table (invite_id uuid, invite_token text, invite_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_invited_email, '')));
  v_token text;
  v_expires_at timestamptz := pg_catalog.clock_timestamp() + interval '7 days';
  v_invite_id uuid;
begin
  if v_user_id is null or not exists (
    select 1 from public.families as family
    where family.id = p_family_id and family.owner_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'Only the family owner can invite members.';
  end if;
  if pg_catalog.length(v_email) not between 3 and 320 or pg_catalog.strpos(v_email, '@') < 2 then
    raise exception using errcode = '22023', message = 'Enter a valid invitation email address.';
  end if;
  if p_role not in ('parent', 'caregiver', 'family') then
    raise exception using errcode = '22023', message = 'The requested family role is not supported.';
  end if;

  v_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  v_invite_id := extensions.gen_random_uuid();
  insert into public.family_invites (
    id, family_id, family_owner_id, invited_email, role, token_hash, created_by, expires_at
  ) values (
    v_invite_id, p_family_id, v_user_id, v_email,
    p_role, extensions.digest(v_token, 'sha256'), v_user_id, v_expires_at
  );
  return query select v_invite_id, v_token, v_expires_at;
end;
$$;

create function public.accept_family_invite(p_invite_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_email text;
  v_confirmed_at timestamptz;
  v_invite public.family_invites%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'An authenticated account is required.';
  end if;
  select account.email, account.email_confirmed_at into v_email, v_confirmed_at
  from auth.users as account where account.id = v_user_id;
  if v_confirmed_at is null or v_email is null then
    raise exception using errcode = '42501', message = 'Confirm the invited email address before joining.';
  end if;

  select invite.* into v_invite
  from public.family_invites as invite
  where invite.token_hash = extensions.digest(coalesce(p_invite_token, ''), 'sha256')
  for update;
  if not found or v_invite.revoked_at is not null or v_invite.expires_at <= pg_catalog.clock_timestamp() then
    raise exception using errcode = '22023', message = 'The invitation is invalid, expired, or revoked.';
  end if;
  if v_invite.accepted_at is not null then
    if v_invite.accepted_by = v_user_id and exists (
      select 1 from public.family_members as member
      where member.family_id = v_invite.family_id and member.user_id = v_user_id
    ) then
      return v_invite.family_id;
    end if;
    raise exception using errcode = '22023', message = 'The invitation is invalid, expired, or revoked.';
  end if;
  if pg_catalog.lower(pg_catalog.btrim(v_email)) <> v_invite.invited_email then
    raise exception using errcode = '42501', message = 'Sign in with the email address that received this invitation.';
  end if;

  insert into public.family_members (family_id, family_owner_id, user_id, role)
  values (v_invite.family_id, v_invite.family_owner_id, v_user_id, v_invite.role);
  update public.family_invites as invite
  set accepted_by = v_user_id, accepted_at = pg_catalog.clock_timestamp()
  where invite.id = v_invite.id;
  return v_invite.family_id;
end;
$$;

create function public.revoke_family_invite(p_family_id uuid, p_invite_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_updated integer;
begin
  if v_user_id is null or not exists (
    select 1 from public.families as family
    where family.id = p_family_id and family.owner_id = v_user_id
  ) then
    raise exception using errcode = '42501', message = 'Only the family owner can revoke invitations.';
  end if;
  update public.family_invites as invite
  set revoked_at = pg_catalog.clock_timestamp()
  where invite.id = p_invite_id and invite.family_id = p_family_id
    and invite.family_owner_id = v_user_id
    and invite.accepted_at is null and invite.revoked_at is null;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create function public.remove_family_member(p_family_id uuid, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_removed integer;
begin
  if v_owner_id is null or not exists (
    select 1 from public.families as family
    where family.id = p_family_id and family.owner_id = v_owner_id
  ) then
    raise exception using errcode = '42501', message = 'Only the family owner can remove members.';
  end if;
  delete from public.family_members as member
  where member.family_id = p_family_id and member.family_owner_id = v_owner_id
    and member.user_id = p_user_id and member.user_id <> v_owner_id;
  get diagnostics v_removed = row_count;
  return v_removed = 1;
end;
$$;

create function public.delete_family(p_family_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := (select auth.uid());
  v_deleted integer;
begin
  if v_owner_id is null then
    raise exception using errcode = '42501', message = 'An authenticated account is required.';
  end if;
  delete from public.families as family
  where family.id = p_family_id and family.owner_id = v_owner_id;
  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

create function public.append_sync_document(
  p_family_id uuid,
  p_child_id text,
  p_expected_revision bigint,
  p_encryption_version smallint,
  p_ciphertext bytea
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_new_revision bigint;
begin
  if v_user_id is null or not exists (
    select 1 from public.family_members as member
    where member.family_id = p_family_id and member.user_id = v_user_id
      and member.role in ('parent', 'caregiver')
  ) then
    raise exception using errcode = '42501', message = 'An active parent or caregiver membership is required to sync changes.';
  end if;
  if p_expected_revision < 0 then
    raise exception using errcode = '22023', message = 'The expected revision cannot be negative.';
  end if;

  if p_expected_revision = 0 then
    insert into public.sync_documents (
      family_id, child_id, revision, encryption_version, ciphertext, updated_at, updated_by
    ) values (
      p_family_id, p_child_id, 1, p_encryption_version, p_ciphertext, pg_catalog.clock_timestamp(), v_user_id
    ) on conflict (family_id, child_id) do nothing
    returning revision into v_new_revision;
  else
    update public.sync_documents as document
    set revision = document.revision + 1,
        encryption_version = p_encryption_version,
        ciphertext = p_ciphertext,
        updated_at = pg_catalog.clock_timestamp(),
        updated_by = v_user_id
    where document.family_id = p_family_id and document.child_id = p_child_id
      and document.revision = p_expected_revision
    returning revision into v_new_revision;
  end if;
  if v_new_revision is null then
    raise exception using errcode = '40001', message = 'The family document changed on another device; fetch the latest revision before retrying.';
  end if;
  return v_new_revision;
end;
$$;

revoke all on function public.create_family() from public, anon, authenticated;
revoke all on function public.create_family_invite(uuid, text, text) from public, anon, authenticated;
revoke all on function public.accept_family_invite(text) from public, anon, authenticated;
revoke all on function public.revoke_family_invite(uuid, uuid) from public, anon, authenticated;
revoke all on function public.remove_family_member(uuid, uuid) from public, anon, authenticated;
revoke all on function public.delete_family(uuid) from public, anon, authenticated;
revoke all on function public.append_sync_document(uuid, text, bigint, smallint, bytea) from public, anon, authenticated;

grant execute on function public.create_family() to authenticated;
grant execute on function public.create_family_invite(uuid, text, text) to authenticated;
grant execute on function public.accept_family_invite(text) to authenticated;
grant execute on function public.revoke_family_invite(uuid, uuid) to authenticated;
grant execute on function public.remove_family_member(uuid, uuid) to authenticated;
grant execute on function public.delete_family(uuid) to authenticated;
grant execute on function public.append_sync_document(uuid, text, bigint, smallint, bytea) to authenticated;

commit;
