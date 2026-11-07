-- Access tiers for the collection (themes, atmospheres, mascots, scenes, postcards, piggy designs).
--   dev    — Лёша и Юля (h1): everything open, they set thresholds and prices, grant items to any couple.
--   close  — close couples (h2, h3…): items open up by using the app together (thresholds).
--   public — everyone else: items are bought (Telegram Stars once the Telegram version ships) or gifted.

create table if not exists public.households (
  id         text primary key,
  tier       text not null default 'public' check (tier in ('dev', 'close', 'public')),
  created_at timestamptz not null default now()
);
alter table public.households enable row level security;

insert into public.households (id, tier) values ('h1', 'dev'), ('h2', 'close'), ('h3', 'close')
  on conflict (id) do update set tier = excluded.tier;
insert into public.households (id) select distinct household from public.members on conflict do nothing;

-- Tier of the signed-in member's household; a household without a row counts as public.
create or replace function public.my_tier() returns text
language sql stable security definer set search_path = public as $$
  select case when public.my_household() is null then null
    else coalesce((select tier from public.households where id = public.my_household()), 'public') end
$$;
revoke execute on function public.my_tier() from public, anon;
grant execute on function public.my_tier() to authenticated;

drop policy if exists "see own household" on public.households;
drop policy if exists "dev sets tiers" on public.households;
drop policy if exists "dev adds households" on public.households;
create policy "see own household" on public.households for select to authenticated
  using (id = public.my_household() or public.my_tier() = 'dev');
-- A developer can't demote their own household by accident.
create policy "dev sets tiers" on public.households for update to authenticated
  using (public.my_tier() = 'dev')
  with check (public.my_tier() = 'dev' and (id <> public.my_household() or tier = 'dev'));
create policy "dev adds households" on public.households for insert to authenticated
  with check (public.my_tier() = 'dev');

-- App-wide settings the developers edit: thresholds and prices per item, the "everything free" test switch.
create table if not exists public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);
alter table public.app_config enable row level security;
drop policy if exists "everyone reads config" on public.app_config;
drop policy if exists "dev writes config" on public.app_config;
create policy "everyone reads config" on public.app_config for select to authenticated using (true);
create policy "dev writes config" on public.app_config for all to authenticated
  using (public.my_tier() = 'dev') with check (public.my_tier() = 'dev');

-- Items a household owns outright: bought, gifted by the partner, granted by the developers or earned as a reward.
create table if not exists public.grants (
  household  text not null,
  item       text not null,
  source     text not null check (source in ('purchase', 'gift', 'dev', 'reward')),
  from_role  text check (from_role in ('a', 'j')),
  note       text,
  seen       boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (household, item)
);
alter table public.grants enable row level security;
drop policy if exists "see own grants" on public.grants;
drop policy if exists "dev grants" on public.grants;
drop policy if exists "dev revokes" on public.grants;
drop policy if exists "mark gift seen" on public.grants;
create policy "see own grants" on public.grants for select to authenticated
  using (household = public.my_household() or public.my_tier() = 'dev');
create policy "dev grants" on public.grants for insert to authenticated with check (public.my_tier() = 'dev');
create policy "dev revokes" on public.grants for delete to authenticated using (public.my_tier() = 'dev');
-- Members may only flip "seen" on their own gifts (column privilege below); developers may edit anything.
create policy "mark gift seen" on public.grants for update to authenticated
  using (household = public.my_household() or public.my_tier() = 'dev')
  with check (household = public.my_household() or public.my_tier() = 'dev');
revoke update on public.grants from authenticated;
grant update (seen) on public.grants to authenticated;

-- The developers' list of couples: no personal data beyond a masked e-mail to tell couples apart.
create or replace function public.dev_households()
returns table (id text, tier text, members int, emails text, last_active timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_tier() is distinct from 'dev' then raise exception 'developers only'; end if;
  return query
    select h.id, h.tier, count(m.email)::int,
      string_agg(regexp_replace(m.email, '^(.{2})[^@]*', '\1•••'), ', ' order by m.role),
      (select max(r.updated_at) from public.records r where r.household = h.id)
    from public.households h left join public.members m on m.household = h.id
    group by h.id, h.tier
    order by h.id;
end $$;
revoke execute on function public.dev_households() from public, anon;
grant execute on function public.dev_households() to authenticated;

-- Referrals: which couple invited this one. Close couples can open top items by inviting couples.
alter table public.households add column if not exists referred_by text references public.households (id);
create or replace function public.my_referrals() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.households where referred_by = public.my_household() and referred_by is not null
$$;
revoke execute on function public.my_referrals() from public, anon;
grant execute on function public.my_referrals() to authenticated;

-- The developers' list also shows who invited whom.
drop function if exists public.dev_households();
create or replace function public.dev_households()
returns table (id text, tier text, members int, emails text, last_active timestamptz, referred_by text)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.my_tier() is distinct from 'dev' then raise exception 'developers only'; end if;
  return query
    select h.id, h.tier, count(m.email)::int,
      string_agg(regexp_replace(m.email, '^(.{2})[^@]*', '\1•••'), ', ' order by m.role),
      (select max(r.updated_at) from public.records r where r.household = h.id),
      h.referred_by
    from public.households h left join public.members m on m.household = h.id
    group by h.id, h.tier, h.referred_by
    order by h.id;
end $$;
revoke execute on function public.dev_households() from public, anon;
grant execute on function public.dev_households() to authenticated;
