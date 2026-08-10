alter table church_groups add column if not exists privacy text default 'public';

create table if not exists church_group_members (
  group_id uuid references church_groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member', -- member, admin, leader
  joined_at timestamp default now(),
  primary key (group_id, user_id)
);

alter table church_group_members enable row level security;
create policy "Membros visiveis" on church_group_members for select using (true);
create policy "Qualquer um logado pode ver" on church_groups for select using (true);
