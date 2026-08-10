-- 1. Tabela de Igrejas
create table churches (
  id uuid default uuid_generate_v4() primary key,
  slug text unique not null,
  name text not null,
  slogan text,
  banner_url text,
  avatar_url text,
  pastor_id uuid references profiles(id),
  description text,
  is_verified boolean default false,
  member_count int default 0,
  created_at timestamp default now()
);

-- 2. Membros da Igreja
create table church_members (
  church_id uuid references churches(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  role text default 'member', -- member, moderator, leader, pastor
  joined_at timestamp default now(),
  approved boolean default false,
  primary key (church_id, user_id)
);

-- 3. Pedidos de Entrada
create table church_join_requests (
  id uuid default uuid_generate_v4() primary key,
  church_id uuid references churches(id),
  user_id uuid references profiles(id),
  message text,
  status text default 'pending', -- pending, approved, rejected
  created_at timestamp default now()
);

-- 4. Células e Grupos
create table church_groups (
  id uuid default uuid_generate_v4() primary key,
  church_id uuid references churches(id),
  name text not null,
  type text, -- 'cell', 'ministry', 'prayer', 'kids', etc
  leader_id uuid references profiles(id),
  meeting_day text,
  meeting_time text,
  created_at timestamp default now()
);

-- Políticas RLS (Segurança)
alter table churches enable row level security;
alter table church_members enable row level security;
alter table church_join_requests enable row level security;

-- Políticas básicas (ajuste conforme necessário)
create policy "Igrejas públicas" on churches for select using (true);
create policy "Membros podem ver sua igreja" on church_members for select using (auth.uid() = user_id);
