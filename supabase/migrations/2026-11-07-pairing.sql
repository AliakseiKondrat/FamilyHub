-- Self-serve couples: anyone can create a couple and invite their partner with a 6-character code;
-- another couple's link (?ref=hN) records who invited whom (referrals open collection items for close couples).
-- Plus feedback (bug / idea) and «delete my data». Our own households h1–h3 can never be deleted here.

create table if not exists public.invites (
  code       text primary key,
  household  text not null references public.households (id) on delete cascade,
  created_at timestamptz not null default now(),
  used_by    text
);
alter table public.invites enable row level security;  -- no direct access: only through the functions below

create or replace function public.new_invite_code() returns text
language sql volatile set search_path = public, extensions as $$
  select upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 6))
$$;
revoke execute on function public.new_invite_code() from public, anon, authenticated;

-- Create a couple for the signed-in person (role a) and return its invite code.
create or replace function public.create_household(ref text default null) returns json
language plpgsql security definer set search_path = public, extensions as $$
declare
  em text := lower(auth.jwt() ->> 'email');
  hh text; n int; c text; r text := null;
begin
  if em is null then raise exception 'not signed in'; end if;
  if exists (select 1 from members where lower(email) = em) then raise exception 'already in a couple'; end if;
  select coalesce(max(substring(id from 2)::int), 0) + 1 into n from households where id ~ '^h[0-9]+$';
  hh := 'h' || n;
  if ref is not null and exists (select 1 from households where id = ref) then r := ref; end if;
  insert into households (id, tier, referred_by) values (hh, 'public', r);
  insert into members (email, role, household) values (em, 'a', hh);
  c := new_invite_code();
  insert into invites (code, household) values (c, hh);
  return json_build_object('household', hh, 'code', c);
end $$;

-- Join the partner's couple with their code (role j).
create or replace function public.join_household(invite text) returns text
language plpgsql security definer set search_path = public as $$
declare em text := lower(auth.jwt() ->> 'email'); hh text; c text := upper(trim(invite));
begin
  if em is null then raise exception 'not signed in'; end if;
  if exists (select 1 from members where lower(email) = em) then raise exception 'already in a couple'; end if;
  select household into hh from invites where code = c and used_by is null;
  if hh is null then raise exception 'invite not found'; end if;
  if (select count(*) from members where household = hh) >= 2 then raise exception 'couple is full'; end if;
  insert into members (email, role, household) values (em, 'j', hh);
  update invites set used_by = em where code = c;
  return hh;
end $$;

-- My couple's open invite code while the partner hasn't joined (null once we're two).
create or replace function public.my_invite() returns text
language plpgsql security definer set search_path = public, extensions as $$
declare hh text := public.my_household(); c text;
begin
  if hh is null or (select count(*) from members where household = hh) >= 2 then return null; end if;
  select code into c from invites where household = hh and used_by is null order by created_at desc limit 1;
  if c is null then c := new_invite_code(); insert into invites (code, household) values (c, hh); end if;
  return c;
end $$;

revoke execute on function public.create_household(text) from public, anon;
revoke execute on function public.join_household(text) from public, anon;
revoke execute on function public.my_invite() from public, anon;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.my_invite() to authenticated;

-- Feedback: anyone signed in can send; only the developers read it.
create table if not exists public.feedback (
  id         bigserial primary key,
  household  text default public.my_household(),
  email      text default lower(auth.jwt() ->> 'email'),
  kind       text not null check (kind in ('bug', 'idea', 'other')),
  text       text not null check (length(text) between 1 and 4000),
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
drop policy if exists "send feedback" on public.feedback;
drop policy if exists "dev reads feedback" on public.feedback;
create policy "send feedback" on public.feedback for insert to authenticated with check (true);
create policy "dev reads feedback" on public.feedback for select to authenticated using (public.my_tier() = 'dev');

-- Delete my data: my private records and my membership; the last one out takes the couple's data along.
-- Never for our own households (h1–h3).
create or replace function public.delete_my_data() returns text
language plpgsql security definer set search_path = public as $$
declare hh text := public.my_household(); r text := public.my_role(); left_n int;
begin
  if hh is null then return 'none'; end if;
  if hh in ('h1', 'h2', 'h3') then raise exception 'protected household'; end if;
  delete from records where household = hh and private_to = r;
  delete from push_subscriptions where household = hh and role = r;
  delete from api_tokens where household = hh and role = r;
  delete from members where lower(email) = lower(auth.jwt() ->> 'email');
  select count(*) into left_n from members where household = hh;
  if left_n = 0 then
    delete from records where household = hh;
    delete from grants where household = hh;
    delete from invites where household = hh;
    update households set referred_by = null where referred_by = hh;
    delete from households where id = hh;
    return 'couple';
  end if;
  return 'me';
end $$;
revoke execute on function public.delete_my_data() from public, anon;
grant execute on function public.delete_my_data() to authenticated;
