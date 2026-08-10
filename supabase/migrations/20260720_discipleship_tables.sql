create table if not exists church_discipleship_tracks (
  id uuid default uuid_generate_v4() primary key,
  church_id uuid references churches(id) on delete cascade not null,
  title text not null,
  description text,
  lessons_count int default 0,
  icon_name text default 'book',
  is_locked boolean default false,
  order_index int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists user_discipleship_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  track_id uuid references church_discipleship_tracks(id) on delete cascade not null,
  progress int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, track_id)
);

-- Enable RLS
alter table church_discipleship_tracks enable row level security;
alter table user_discipleship_progress enable row level security;

-- Policies for tracks (everyone can read)
create policy "Public tracks are viewable by everyone." on church_discipleship_tracks
  for select using (true);

-- Policies for progress (users can read their own progress)
create policy "Users can view own progress." on user_discipleship_progress
  for select using (auth.uid() = user_id);
