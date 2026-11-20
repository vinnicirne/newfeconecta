-- Complete church and community persistence used by /igreja and group management.
-- Safe to run in Supabase SQL Editor or through `supabase db push`.

begin;

alter table public.churches
  add column if not exists avatar_url text,
  add column if not exists banner_url text,
  add column if not exists description text,
  add column if not exists slogan text,
  add column if not exists pastor_id uuid references public.profiles(id) on delete set null,
  add column if not exists is_verified boolean not null default false,
  add column if not exists member_count integer not null default 0;

alter table public.church_groups
  add column if not exists meeting_day text,
  add column if not exists meeting_time text,
  add column if not exists logo_url text,
  add column if not exists privacy text not null default 'public';

create index if not exists church_members_user_approved_idx
  on public.church_members (user_id, approved);
create index if not exists church_groups_church_type_idx
  on public.church_groups (church_id, type);
create index if not exists church_group_members_user_idx
  on public.church_group_members (user_id, group_id);

alter table public.church_groups enable row level security;
alter table public.church_group_members enable row level security;

-- Replace the permissive policies from the original community migration.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('church_groups', 'church_group_members')
  loop
    execute format('drop policy if exists %I on %I.%I',
      policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end;
$$;

create or replace function public.can_manage_church(lookup_church_id uuid, lookup_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.churches c
    where c.id = lookup_church_id and c.pastor_id = lookup_user_id
  ) or exists (
    select 1
    from public.church_members cm
    where cm.church_id = lookup_church_id
      and cm.user_id = lookup_user_id
      and cm.approved = true
      and cm.role in ('admin', 'pastor')
  ) or exists (
    select 1 from public.profiles p
    where p.id = lookup_user_id and p.role = 'admin'
  );
$$;

revoke all on function public.can_manage_church(uuid, uuid) from public;
grant execute on function public.can_manage_church(uuid, uuid) to authenticated;

create or replace function public.can_manage_church_group(lookup_group_id uuid, lookup_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.church_groups g
    where g.id = lookup_group_id and g.leader_id = lookup_user_id
  ) or exists (
    select 1 from public.church_groups g
    where g.id = lookup_group_id
      and public.can_manage_church(g.church_id, lookup_user_id)
  );
$$;

revoke all on function public.can_manage_church_group(uuid, uuid) from public;
grant execute on function public.can_manage_church_group(uuid, uuid) to authenticated;

drop policy if exists church_groups_select_public on public.church_groups;
drop policy if exists church_groups_insert_leadership on public.church_groups;
drop policy if exists church_groups_update_leadership on public.church_groups;
drop policy if exists church_groups_delete_leadership on public.church_groups;

create policy church_groups_select_public
  on public.church_groups for select to anon, authenticated using (true);
create policy church_groups_insert_leadership
  on public.church_groups for insert to authenticated
  with check (public.can_manage_church(church_id, auth.uid()));
create policy church_groups_update_leadership
  on public.church_groups for update to authenticated
  using (public.can_manage_church(church_id, auth.uid()))
  with check (public.can_manage_church(church_id, auth.uid()));
create policy church_groups_delete_leadership
  on public.church_groups for delete to authenticated
  using (public.can_manage_church(church_id, auth.uid()));

drop policy if exists church_group_members_select_public on public.church_group_members;
drop policy if exists church_group_members_insert_authorized on public.church_group_members;
drop policy if exists church_group_members_update_leadership on public.church_group_members;
drop policy if exists church_group_members_delete_authorized on public.church_group_members;

create policy church_group_members_select_public
  on public.church_group_members for select to anon, authenticated using (true);
create policy church_group_members_insert_authorized
  on public.church_group_members for insert to authenticated
  with check (
    exists (
      select 1 from public.church_groups g
      join public.church_members cm on cm.church_id = g.church_id
      where g.id = public.church_group_members.group_id
        and cm.user_id = public.church_group_members.user_id and cm.approved = true
        and public.can_manage_church_group(g.id, auth.uid())
    )
  );
create policy church_group_members_update_leadership
  on public.church_group_members for update to authenticated
  using (
    exists (select 1 from public.church_groups g
      where g.id = public.church_group_members.group_id
        and public.can_manage_church_group(g.id, auth.uid()))
  )
  with check (
    exists (select 1 from public.church_groups g
      where g.id = public.church_group_members.group_id
        and public.can_manage_church_group(g.id, auth.uid()))
  );
create policy church_group_members_delete_authorized
  on public.church_group_members for delete to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.church_groups g
      where g.id = public.church_group_members.group_id
        and public.can_manage_church_group(g.id, auth.uid()))
  );

-- Keep the group creator's leadership membership in the same transaction as group creation.
create or replace function public.add_church_group_leader()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.leader_id is not null then
    insert into public.church_group_members (group_id, user_id, role)
    select new.id, new.leader_id, 'leader'
    where exists (
      select 1 from public.church_members cm
      where cm.church_id = new.church_id
        and cm.user_id = new.leader_id
        and cm.approved = true
    )
    on conflict (group_id, user_id) do update set role = 'leader';
  end if;
  return new;
end;
$$;

drop trigger if exists church_groups_add_leader on public.church_groups;
create trigger church_groups_add_leader
  after insert or update of leader_id on public.church_groups
  for each row execute function public.add_church_group_leader();

-- Keep the public count consistent with approved membership records.
create or replace function public.refresh_church_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_church_id uuid;
begin
  affected_church_id := coalesce(new.church_id, old.church_id);
  update public.churches c
  set member_count = (
    select count(*)::integer from public.church_members cm
    where cm.church_id = affected_church_id and cm.approved = true
  )
  where c.id = affected_church_id;
  if tg_op = 'UPDATE' and old.church_id is distinct from new.church_id then
    update public.churches c
    set member_count = (
      select count(*)::integer from public.church_members cm
      where cm.church_id = old.church_id and cm.approved = true
    )
    where c.id = old.church_id;
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists church_members_refresh_count on public.church_members;
create trigger church_members_refresh_count
  after insert or update or delete on public.church_members
  for each row execute function public.refresh_church_member_count();

update public.churches c
set member_count = (
  select count(*)::integer from public.church_members cm
  where cm.church_id = c.id and cm.approved = true
);

commit;
