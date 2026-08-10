-- Tabela de posts do feed da igreja
create table church_posts (
  id uuid default uuid_generate_v4() primary key,
  church_id uuid references churches(id) on delete cascade,
  author_id uuid references profiles(id) on delete cascade,
  content text not null,
  type text default 'text',
  likes_count int default 0,
  comments_count int default 0,
  created_at timestamp default now()
);

alter table church_posts enable row level security;

-- Políticas
create policy "Membros podem ver posts de sua igreja" on church_posts 
  for select using (
    exists (
      select 1 from church_members 
      where church_members.church_id = church_posts.church_id 
      and church_members.user_id = auth.uid()
      and church_members.approved = true
    )
  );

create policy "Membros podem criar posts" on church_posts 
  for insert with check (
    exists (
      select 1 from church_members 
      where church_members.church_id = church_id 
      and church_members.user_id = auth.uid()
      and church_members.approved = true
    )
    and auth.uid() = author_id
  );
