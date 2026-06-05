-- Cosmic Crunch — email/password auth, cloud saves & leaderboard
-- Run via the Supabase SQL editor (paste & Run) or `supabase db push`.

-- ─────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- game_saves (one per user — full GameState stored as a JSONB blob)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.game_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete cascade,
  save_data jsonb not null default '{}'::jsonb,
  last_saved_at timestamptz default now(),
  last_active_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- leaderboard_entries (publicly readable)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.leaderboard_entries (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  total_earned numeric default 0,
  stardust numeric default 0,
  ascensions numeric default 0,
  dark_matter numeric default 0,
  golden_caught numeric default 0,
  flagged boolean default false,
  updated_at timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.game_saves enable row level security;
alter table public.leaderboard_entries enable row level security;

-- profiles: a user can read & write only their own row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- game_saves: a user can read & write only their own save.
drop policy if exists "game_saves_select_own" on public.game_saves;
create policy "game_saves_select_own" on public.game_saves
  for select using (auth.uid() = user_id);

drop policy if exists "game_saves_insert_own" on public.game_saves;
create policy "game_saves_insert_own" on public.game_saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "game_saves_update_own" on public.game_saves;
create policy "game_saves_update_own" on public.game_saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "game_saves_delete_own" on public.game_saves;
create policy "game_saves_delete_own" on public.game_saves
  for delete using (auth.uid() = user_id);

-- leaderboard_entries: world-readable, but only the owner can write their row.
drop policy if exists "leaderboard_select_all" on public.leaderboard_entries;
create policy "leaderboard_select_all" on public.leaderboard_entries
  for select using (true);

drop policy if exists "leaderboard_insert_own" on public.leaderboard_entries;
create policy "leaderboard_insert_own" on public.leaderboard_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists "leaderboard_update_own" on public.leaderboard_entries;
create policy "leaderboard_update_own" on public.leaderboard_entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Auto-create a profile row when a new auth user signs up.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
