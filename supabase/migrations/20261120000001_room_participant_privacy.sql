-- Stop anonymous participant enumeration and self-promotion in private rooms.
-- Run through Supabase migrations before deploying room clients that depend on it.

begin;

create or replace function public.is_room_manager(lookup_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.rooms r
    where r.id = lookup_room_id and r.creator_id = auth.uid()
  ) or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('admin', 'superadmin')
  );
$$;

create or replace function public.is_public_room(lookup_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.rooms r
    where r.id = lookup_room_id and r.visibility = 'public' and r.status = 'active'
  );
$$;

create or replace function public.can_view_room_participants(lookup_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_room_manager(lookup_room_id)
    or exists (
      select 1 from public.participants p
      where p.room_id = lookup_room_id and p.user_id = auth.uid()
    );
$$;

create or replace function public.is_invited_to_room(lookup_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.participants p
    join public.rooms r on r.id = p.room_id and r.status = 'active'
    where p.room_id = lookup_room_id
      and p.user_id = auth.uid()
      and p.role = 'invited'
  );
$$;

revoke all on function public.is_room_manager(uuid) from public, anon;
revoke all on function public.is_public_room(uuid) from public, anon;
revoke all on function public.can_view_room_participants(uuid) from public, anon;
revoke all on function public.is_invited_to_room(uuid) from public, anon;
grant execute on function public.is_room_manager(uuid) to authenticated, service_role;
grant execute on function public.is_public_room(uuid) to authenticated, service_role;
grant execute on function public.can_view_room_participants(uuid) to authenticated, service_role;
grant execute on function public.is_invited_to_room(uuid) to authenticated, service_role;

alter table public.participants enable row level security;
alter table public.participants drop constraint if exists participants_role_check;
alter table public.participants
  add constraint participants_role_check
  check (role = any (array['creator', 'admin', 'listener', 'speaker', 'invited']::text[]));

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'participants'
  loop
    execute format('drop policy if exists %I on public.participants', policy_row.policyname);
  end loop;
end;
$$;

revoke select on public.participants from public, anon;

create policy participants_select_scoped
  on public.participants for select to authenticated
  using (
    user_id = auth.uid()
    or public.can_view_room_participants(room_id)
  );

create policy participants_insert_scoped
  on public.participants for insert to authenticated
  with check (
    public.is_room_manager(room_id)
    or (
      user_id = auth.uid()
      and role = 'listener'
      and (
        public.is_public_room(room_id)
        or public.is_invited_to_room(room_id)
      )
    )
  );

create policy participants_update_scoped
  on public.participants for update to authenticated
  using (
    public.is_room_manager(room_id)
    or (user_id = auth.uid() and role = 'invited')
  )
  with check (
    public.is_room_manager(room_id)
    or (user_id = auth.uid() and role = 'listener')
  );

create policy participants_delete_scoped
  on public.participants for delete to authenticated
  using (
    user_id = auth.uid()
    or public.is_room_manager(room_id)
  );

commit;
