-- Вдвоём: one generic table for every record, with the privacy rules enforced by Postgres itself.
-- Private records and unrevealed surprises are never sent to the other person's device.

create table if not exists public.members (
  email text primary key,
  role  text not null unique check (role in ('a', 'j'))
);
alter table public.members enable row level security;

-- Role ('a' or 'j') of the signed-in user, or null for anyone not on the members list.
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.members where lower(email) = lower(auth.jwt() ->> 'email')
$$;
revoke execute on function public.my_role() from public, anon;
grant execute on function public.my_role() to authenticated;

create policy "members see members" on public.members for select to authenticated using (public.my_role() is not null);

create table if not exists public.records (
  id           text primary key,
  collection   text not null,
  data         jsonb not null,
  created_by   text not null check (created_by in ('a', 'j')),
  private_to   text check (private_to in ('a', 'j')),
  surprise_for text check (surprise_for in ('a', 'j')),
  reveal_at    date,
  deleted      boolean not null default false,
  updated_at   timestamptz not null default now()
);
create index if not exists records_updated_at on public.records (updated_at);
alter table public.records enable row level security;
alter table public.records replica identity full;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists records_touch on public.records;
create trigger records_touch before insert or update on public.records for each row execute function public.touch_updated_at();

-- The single visibility rule, shared by every policy.
create or replace function public.can_see(private_to text, surprise_for text, reveal_at date) returns boolean
language sql stable as $$
  select public.my_role() is not null
     and (private_to is null or private_to = public.my_role())
     and (surprise_for is null or surprise_for <> public.my_role() or reveal_at <= current_date)
$$;

create policy "read visible" on public.records for select to authenticated
  using (public.can_see(private_to, surprise_for, reveal_at));
create policy "insert visible" on public.records for insert to authenticated
  with check (public.can_see(private_to, surprise_for, reveal_at));
create policy "update visible" on public.records for update to authenticated
  using (public.can_see(private_to, surprise_for, reveal_at))
  with check (public.can_see(private_to, surprise_for, reveal_at));
create policy "delete visible" on public.records for delete to authenticated
  using (public.can_see(private_to, surprise_for, reveal_at));

-- Live updates between the two phones (Realtime applies the same RLS rules).
alter publication supabase_realtime add table public.records;

-- Photos: private bucket, members only.
insert into storage.buckets (id, name, public) values ('photos', 'photos', false) on conflict (id) do nothing;
create policy "members read photos" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.my_role() is not null);
create policy "members add photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.my_role() is not null);
create policy "members remove photos" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.my_role() is not null);
