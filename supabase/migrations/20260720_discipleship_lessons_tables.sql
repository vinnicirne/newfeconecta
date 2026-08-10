create table if not exists church_discipleship_lessons (
  id uuid default uuid_generate_v4() primary key,
  track_id uuid references church_discipleship_tracks(id) on delete cascade not null,
  title text not null,
  content text,
  video_url text,
  order_index int default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists user_discipleship_completed_lessons (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  lesson_id uuid references church_discipleship_lessons(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, lesson_id)
);

-- Enable RLS
alter table church_discipleship_lessons enable row level security;
alter table user_discipleship_completed_lessons enable row level security;

-- Policies for lessons (everyone can read)
create policy "Public lessons are viewable by everyone." on church_discipleship_lessons
  for select using (true);

-- Policies for completed lessons (users can read and insert their own progress)
create policy "Users can view own completed lessons." on user_discipleship_completed_lessons
  for select using (auth.uid() = user_id);

create policy "Users can mark lessons as completed." on user_discipleship_completed_lessons
  for insert with check (auth.uid() = user_id);
