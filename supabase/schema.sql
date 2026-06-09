-- Calorie Chat — database schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Multi-user (shared password, separate data per profile). All access is
-- server-side via the service-role key, so RLS is enabled with no policies —
-- the service role bypasses RLS, the public anon/authenticated roles are locked
-- out, and the app's password gate is the access control.

-- ---------------------------------------------------------------------------
-- profiles: each person who uses the app (e.g. you + partner)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id text primary key,            -- short slug, also stored in the cc_profile cookie
  name text not null,             -- display name (editable in Settings)
  ord integer not null default 0, -- sort order in the switcher
  created_at timestamptz not null default now()
);

insert into public.profiles (id, name, ord) values
  ('user1', 'User 1', 1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- settings: one row PER profile (goals/preferences/assistant notes)
-- ---------------------------------------------------------------------------
create table if not exists public.settings (
  profile_id text primary key references public.profiles(id) on delete cascade,
  goal_weight_kg numeric,
  start_weight_kg numeric,
  daily_calorie_limit integer,
  unit_system text not null default 'imperial' check (unit_system in ('imperial', 'metric')),
  -- Free-text personal context the in-app assistant reads on every chat.
  assistant_notes text,
  updated_at timestamptz not null default now()
);

insert into public.settings (profile_id) values ('user1')
on conflict (profile_id) do nothing;

-- ---------------------------------------------------------------------------
-- food_entries: every logged item, scoped to a profile
-- ---------------------------------------------------------------------------
create table if not exists public.food_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references public.profiles(id) on delete cascade,
  eaten_on date not null default current_date,
  eaten_at timestamptz not null default now(),
  meal text check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  description text not null,
  calories integer not null,
  protein_g integer,
  carbs_g integer,
  fat_g integer,
  source text not null default 'chat' check (source in ('chat', 'manual')),
  created_at timestamptz not null default now()
);

create index if not exists food_entries_profile_day_idx on public.food_entries (profile_id, eaten_on);

-- ---------------------------------------------------------------------------
-- weight_entries: one weigh-in per profile per day (kg canonical)
-- ---------------------------------------------------------------------------
create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references public.profiles(id) on delete cascade,
  recorded_on date not null,
  weight_kg numeric not null,
  note text,
  created_at timestamptz not null default now(),
  unique (profile_id, recorded_on)
);

create index if not exists weight_entries_profile_day_idx on public.weight_entries (profile_id, recorded_on);

-- ---------------------------------------------------------------------------
-- chat_messages: persisted conversation, scoped to a profile
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id text primary key,
  profile_id text not null references public.profiles(id) on delete cascade,
  role text not null,
  parts jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_profile_idx on public.chat_messages (profile_id, created_at);

-- ---------------------------------------------------------------------------
-- Lock out public roles (service-role bypasses RLS; see note at top).
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.food_entries enable row level security;
alter table public.weight_entries enable row level security;
alter table public.chat_messages enable row level security;
