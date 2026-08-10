drop table if exists church_live_comments;

create table church_live_comments (
  id uuid default uuid_generate_v4() primary key,
  church_id uuid references churches(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  user_name text not null,
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table church_live_comments enable row level security;

create policy "Public can read live comments" on church_live_comments
  for select using (true);

create policy "Authenticated users can insert comments" on church_live_comments
  for insert with check (auth.uid() = user_id);
