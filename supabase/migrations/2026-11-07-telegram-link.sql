-- Linking Telegram to an existing account: the app asks the function for a one-time code, opens
-- t.me/<bot>?start=<code>, and the bot ties that Telegram chat to the signed-in member. Codes live 15 minutes.
create table if not exists public.tg_codes (
  code       text primary key,
  email      text not null,
  created_at timestamptz not null default now()
);
alter table public.tg_codes enable row level security;
