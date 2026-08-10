create table church_discipleship_modules (
  id uuid default gen_random_uuid() primary key,
  track_id uuid references church_discipleship_tracks(id) on delete cascade not null,
  title text not null,
  order_index integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table church_discipleship_modules enable row level security;
create policy "Public modules are viewable by everyone." on church_discipleship_modules for select using (true);
create policy "All can insert modules" on church_discipleship_modules for insert with check (true);
create policy "All can update modules" on church_discipleship_modules for update using (true);
create policy "All can delete modules" on church_discipleship_modules for delete using (true);

-- Grant privileges
grant all privileges on table church_discipleship_modules to anon, authenticated, service_role;

-- Add module_id to lessons
alter table church_discipleship_lessons add column module_id uuid references church_discipleship_modules(id) on delete cascade;
