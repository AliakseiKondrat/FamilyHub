-- Telegram: which Telegram user is which member (filled when someone opens the mini app signed in, or signs in
-- with Telegram), and links sent to the bot waiting for «where to save?». Only the edge function touches these.
create table if not exists public.tg_links (
  tg_id      bigint primary key,
  email      text not null,
  chat_id    bigint,
  updated_at timestamptz not null default now()
);
alter table public.tg_links enable row level security;

create table if not exists public.tg_pending (
  id         uuid primary key default gen_random_uuid(),
  household  text not null,
  role       text not null,
  text       text not null,
  created_at timestamptz not null default now()
);
alter table public.tg_pending enable row level security;
