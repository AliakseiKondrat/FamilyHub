-- Several couples in one database: every member, record and device belongs to a household.
-- Existing data becomes household 'h1'. Rows from one household are never visible to another (RLS).

-- Members: role is unique per household, not globally.
alter table public.members add column if not exists household text not null default 'h1';
alter table public.members alter column household drop default;
alter table public.members drop constraint if exists members_role_key;
alter table public.members add constraint members_household_role_key unique (household, role);

create or replace function public.my_household() returns text
language sql stable security definer set search_path = public as $$
  select household from public.members where lower(email) = lower(auth.jwt() ->> 'email')
$$;
revoke execute on function public.my_household() from public, anon;
grant execute on function public.my_household() to authenticated;

-- Members only see their own household's members.
drop policy if exists "members see members" on public.members;
create policy "members see members" on public.members for select to authenticated
  using (household = public.my_household());

-- Records: household filled in from the signed-in member; the key becomes (household, id)
-- so per-household ids like 'meta:settings' don't collide.
alter table public.records add column if not exists household text;
update public.records set household = 'h1' where household is null;
alter table public.records alter column household set not null;
alter table public.records alter column household set default public.my_household();
alter table public.records drop constraint if exists records_pkey;
alter table public.records add primary key (household, id);

drop policy if exists "read visible" on public.records;
drop policy if exists "insert visible" on public.records;
drop policy if exists "update visible" on public.records;
drop policy if exists "delete visible" on public.records;
create policy "read visible" on public.records for select to authenticated
  using (household = public.my_household() and public.can_see(private_to, surprise_for, reveal_at));
create policy "insert visible" on public.records for insert to authenticated
  with check (household = public.my_household() and public.can_see(private_to, surprise_for, reveal_at));
create policy "update visible" on public.records for update to authenticated
  using (household = public.my_household() and public.can_see(private_to, surprise_for, reveal_at))
  with check (household = public.my_household() and public.can_see(private_to, surprise_for, reveal_at));
create policy "delete visible" on public.records for delete to authenticated
  using (household = public.my_household() and public.can_see(private_to, surprise_for, reveal_at));

-- Devices and keys belong to a household too.
alter table public.push_subscriptions add column if not exists household text;
update public.push_subscriptions set household = 'h1' where household is null;
alter table public.push_subscriptions alter column household set not null;
alter table public.push_subscriptions alter column household set default public.my_household();
drop policy if exists "own subscriptions add" on public.push_subscriptions;
drop policy if exists "own subscriptions read" on public.push_subscriptions;
drop policy if exists "own subscriptions remove" on public.push_subscriptions;
drop policy if exists "own subscriptions update" on public.push_subscriptions;
create policy "own subscriptions add" on public.push_subscriptions for insert to authenticated
  with check (role = public.my_role() and household = public.my_household());
create policy "own subscriptions read" on public.push_subscriptions for select to authenticated
  using (role = public.my_role() and household = public.my_household());
create policy "own subscriptions remove" on public.push_subscriptions for delete to authenticated
  using (role = public.my_role() and household = public.my_household());
create policy "own subscriptions update" on public.push_subscriptions for update to authenticated
  using (role = public.my_role() and household = public.my_household())
  with check (role = public.my_role() and household = public.my_household());

alter table public.api_tokens add column if not exists household text;
update public.api_tokens set household = 'h1' where household is null;
alter table public.api_tokens alter column household set not null;

create or replace function public.create_api_token() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  r text := public.my_role();
  h text := public.my_household();
  tok text;
begin
  if r is null then raise exception 'not a member'; end if;
  tok := 'fh_' || encode(gen_random_bytes(24), 'hex');
  delete from public.api_tokens where role = r and household = h;
  insert into public.api_tokens (token_hash, role, household) values (encode(digest(tok, 'sha256'), 'hex'), r, h);
  return tok;
end $$;

create or replace function public.has_api_token() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.api_tokens where role = public.my_role() and household = public.my_household())
$$;

-- Photos: other households keep theirs under "<household>/…"; household h1 keeps its original paths.
drop policy if exists "members read photos" on storage.objects;
drop policy if exists "members add photos" on storage.objects;
drop policy if exists "members remove photos" on storage.objects;
create or replace function public.photo_allowed(name text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_household() is not null and (
    (storage.foldername(name))[1] = public.my_household()
    or (public.my_household() = 'h1' and (storage.foldername(name))[1] !~ '^h[0-9]+$')
  )
$$;
revoke execute on function public.photo_allowed(text) from public, anon;
grant execute on function public.photo_allowed(text) to authenticated;
create policy "members read photos" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.photo_allowed(name));
create policy "members add photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.photo_allowed(name));
create policy "members remove photos" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.photo_allowed(name));
