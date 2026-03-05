-- ============================================================
-- DETERMINED iOS - Supabase Schema
-- Run this in the Supabase SQL Editor (supabase.com/dashboard)
-- ============================================================

-- 1. Profiles (linked to Supabase Auth users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);


-- 2. Quests
create table public.quests (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  habit_name text not null,
  target_days integer not null check (target_days > 0),
  bounty numeric(10, 2) not null default 0,
  status text not null default 'active' check (status in ('active', 'completed', 'failed')),
  created_at timestamp with time zone default now()
);

alter table public.quests enable row level security;

create policy "Users can view their own quests"
  on public.quests for select using (auth.uid() = owner_id);

create policy "Users can create their own quests"
  on public.quests for insert with check (auth.uid() = owner_id);

create policy "Users can update their own quests"
  on public.quests for update using (auth.uid() = owner_id);


-- 3. Check-ins (one per day per quest)
create table public.check_ins (
  id uuid default gen_random_uuid() primary key,
  quest_id uuid references public.quests(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  checked_in_date date not null,
  created_at timestamp with time zone default now(),
  unique(quest_id, checked_in_date)
);

alter table public.check_ins enable row level security;

create policy "Users can view check-ins for their quests"
  on public.check_ins for select using (
    exists (select 1 from public.quests where id = quest_id and owner_id = auth.uid())
  );

create policy "Users can insert check-ins for their own quests"
  on public.check_ins for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.quests where id = quest_id and owner_id = auth.uid())
  );


-- 4. Penalties
create table public.penalties (
  id uuid default gen_random_uuid() primary key,
  quest_id uuid references public.quests(id) on delete cascade not null,
  tempter_handle text not null,
  amount numeric(10, 2) not null default 10,
  created_at timestamp with time zone default now()
);

alter table public.penalties enable row level security;

create policy "Users can view penalties for their quests"
  on public.penalties for select using (
    exists (select 1 from public.quests where id = quest_id and owner_id = auth.uid())
  );

create policy "Users can insert penalties for their own quests"
  on public.penalties for insert with check (
    exists (select 1 from public.quests where id = quest_id and owner_id = auth.uid())
  );
