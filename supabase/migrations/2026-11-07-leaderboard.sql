-- Leaderboards: couples opt in with a nickname; only the nickname, an emoji and numbers are shown — never their records.
-- XP and days are counted here from the couple's shared record of joint actions with the same daily cap as the app
-- (150 XP a day), so the table can't be inflated from a phone. Best flame and passport stamps are reported by the app.
create table if not exists public.leaderboard (
  household  text primary key references public.households(id) on delete cascade,
  nickname   text not null check (char_length(nickname) between 1 and 40),
  emoji      text not null default '💞',
  flame      int  not null default 0,
  stamps     int  not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.leaderboard enable row level security;
-- No policies: read and written only through the functions below.

create or replace function public.leaderboard_join(p_nickname text, p_emoji text, p_flame int, p_stamps int)
returns void language plpgsql security definer set search_path = public as $$
declare hh text := public.my_household();
begin
  if hh is null then raise exception 'not a member'; end if;
  insert into leaderboard(household, nickname, emoji, flame, stamps, updated_at)
  values (hh, left(coalesce(nullif(trim(p_nickname), ''), '💞'), 40), left(coalesce(nullif(p_emoji, ''), '💞'), 16),
          greatest(0, least(coalesce(p_flame, 0), 100000)), greatest(0, least(coalesce(p_stamps, 0), 1000)), now())
  on conflict (household) do update set nickname = excluded.nickname, emoji = excluded.emoji,
    flame = excluded.flame, stamps = excluded.stamps, updated_at = now();
end $$;

create or replace function public.leaderboard_leave()
returns void language sql security definer set search_path = public as $$
  delete from leaderboard where household = public.my_household();
$$;

-- Everyone who opted in (or only couples linked to us by invitations), best first.
create or replace function public.leaderboard_list(p_friends boolean default false)
returns table(nickname text, emoji text, xp bigint, days bigint, flame int, stamps int, mine boolean)
language sql security definer set search_path = public stable as $$
  with me as (select public.my_household() as hh),
  pool as (
    select l.* from leaderboard l, me
    where me.hh is not null and (not p_friends or l.household = me.hh
      or exists (select 1 from households h where h.id = l.household and h.referred_by = me.hh)
      or exists (select 1 from households h where h.id = me.hh and h.referred_by = l.household))
  ),
  acts as (
    select r.household, r.data->>'kind' as kind, r.data->>'date' as d, r.created_by as who,
           coalesce((r.data->>'count')::int, 0) as cnt
    from records r join pool p on p.household = r.household
    where r.collection = 'acts' and not r.deleted
  ),
  perday as (
    select household, d,
      sum(case kind when 'quest' then 5 when 'task' then 3 when 'grocery' then 2 when 'recipe' then 12 when 'watch' then 10
        when 'wish' then 20 when 'date' then 15 when 'trip' then 40 when 'photo' then 3 when 'music' then 2 when 'goal' then 6
        when 'event' then 3 when 'checkin' then 15 when 'note' then 8 when 'blind' then 25 else 0 end) as xp,
      bool_or(kind <> 'taps') as fed,
      coalesce(max(case when kind = 'taps' and who = 'a' then cnt end), 0) >= 30
        and coalesce(max(case when kind = 'taps' and who = 'j' then cnt end), 0) >= 30 as taps
    from acts group by household, d
  ),
  totals as (
    select household,
      sum(least(150, xp + case when fed or taps then 10 else 0 end + case when taps then 5 else 0 end)) as xp,
      count(*) filter (where fed or taps) as days
    from perday group by household
  )
  select p.nickname, p.emoji, coalesce(t.xp, 0)::bigint, coalesce(t.days, 0)::bigint, p.flame, p.stamps,
         p.household = (select hh from me)
  from pool p left join totals t on t.household = p.household
  order by 3 desc, 4 desc
  limit 100;
$$;

revoke all on function public.leaderboard_join(text, text, int, int), public.leaderboard_leave(), public.leaderboard_list(boolean) from public, anon;
grant execute on function public.leaderboard_join(text, text, int, int), public.leaderboard_leave(), public.leaderboard_list(boolean) to authenticated;
