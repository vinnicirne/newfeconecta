-- Migration: Add War Room System (Sala de Guerra) - Idempotent Version

-- 1. Profiles Table Update (Add premium column if missing)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;

-- 2. Rooms Table
create table if not exists public.rooms (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'active' check (status in ('active', 'ended')),
  duration_minutes int default 60,
  created_at timestamp with time zone default now(),
  ended_at timestamp with time zone
);

-- 3. Participants Table
create table if not exists public.participants (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'listener' check (role in ('creator', 'admin', 'listener', 'speaker')),
  joined_at timestamp with time zone default now(),
  unique(room_id, user_id)
);

-- 4. Messages Table (Chat)
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default now()
);

-- 5. Requests Table (Request to speak)
create table if not exists public.requests (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamp with time zone default now()
);

-- RLS (Row Level Security) - Final Stable Version
alter table public.rooms enable row level security;
alter table public.participants enable row level security;
alter table public.messages enable row level security;
alter table public.requests enable row level security;

-- Rooms Policies
drop policy if exists "Anyone can view active rooms" on public.rooms;
create policy "rooms_select_public" on public.rooms for select using (true);

drop policy if exists "Creators can manage their rooms" on public.rooms;
create policy "rooms_manage_owner" on public.rooms for all using (auth.uid() = creator_id);

-- Participants Policies
drop policy if exists "Participants can view other participants" on public.participants;
create policy "participants_select_public" on public.participants for select using (true);

drop policy if exists "Anyone can join a room" on public.participants;
create policy "participants_insert_auth" on public.participants for insert with check (auth.role() = 'authenticated');

drop policy if exists "Admins can manage participants" on public.participants;
drop policy if exists "Anyone can update their own participant record" on public.participants;
create policy "participants_update_logic" on public.participants for update using (
  auth.uid() = user_id OR 
  exists (select 1 from public.rooms r where r.id = room_id and r.creator_id = auth.uid())
);

drop policy if exists "Anyone can delete their own participant record" on public.participants;
create policy "participants_delete_logic" on public.participants for delete using (
  auth.uid() = user_id OR 
  exists (select 1 from public.rooms r where r.id = room_id and r.creator_id = auth.uid())
);

-- Messages Policies
drop policy if exists "Room messages are visible to participants" on public.messages;
create policy "messages_select_public" on public.messages for select using (true);

drop policy if exists "Anyone can send messages in a room" on public.messages;
create policy "messages_insert_auth" on public.messages for insert with check (auth.role() = 'authenticated');

-- Requests Policies
drop policy if exists "Room requests are visible to participants" on public.requests;
create policy "requests_select_public" on public.requests for select using (true);

drop policy if exists "Anyone can request to speak" on public.requests;
create policy "requests_insert_auth" on public.requests for insert with check (auth.role() = 'authenticated');

drop policy if exists "Moderators can update requests" on public.requests;
create policy "requests_manage_logic" on public.requests for update using (
  exists (
    select 1 from public.rooms 
    where id = public.requests.room_id 
    and creator_id = auth.uid()
  )
);
