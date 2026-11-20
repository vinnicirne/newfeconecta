-- Close community visibility leaks and make paid pixel conversions idempotent.
begin;

alter table public.ad_conversions
  add column if not exists event_id text;

create unique index if not exists ad_conversions_campaign_event_uidx
  on public.ad_conversions (campaign_id, event_id);

update public.church_groups
set privacy = 'public'
where privacy is null or privacy not in ('public', 'private', 'invisible');
alter table public.church_groups
  alter column privacy set default 'public',
  alter column privacy set not null;

drop policy if exists church_groups_select_public on public.church_groups;
drop policy if exists church_groups_select_members on public.church_groups;
drop policy if exists "Qualquer um logado pode ver" on public.church_groups;
drop policy if exists "Membros visiveis" on public.church_group_members;
create policy church_groups_select_public
  on public.church_groups for select to anon
  using (privacy = 'public');
create policy church_groups_select_members
  on public.church_groups for select to authenticated
  using (
    privacy = 'public'
    or public.can_manage_church(church_id, auth.uid())
    or (
      privacy = 'private'
      and exists (
        select 1 from public.church_members cm
        where cm.church_id = church_groups.church_id
          and cm.user_id = auth.uid() and cm.approved = true
      )
    )
    or public.can_manage_church_group(id, auth.uid())
    or exists (
      select 1 from public.church_group_members mine
      where mine.group_id = church_groups.id and mine.user_id = auth.uid()
    )
  );

create or replace function public.is_current_user_church_group_member(lookup_group_id uuid, lookup_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lookup_user_id = auth.uid() and exists (
    select 1 from public.church_group_members gm
    where gm.group_id = lookup_group_id and gm.user_id = lookup_user_id
  );
$$;

revoke all on function public.is_current_user_church_group_member(uuid, uuid) from public;
grant execute on function public.is_current_user_church_group_member(uuid, uuid) to authenticated;

drop policy if exists church_group_members_select_public on public.church_group_members;
create policy church_group_members_select_authorized
  on public.church_group_members for select to authenticated
  using (
    user_id = auth.uid()
    or public.can_manage_church_group(group_id, auth.uid())
    or public.is_current_user_church_group_member(group_id, auth.uid())
  );

drop policy if exists church_group_members_insert_authorized on public.church_group_members;
create policy church_group_members_insert_authorized
  on public.church_group_members for insert to authenticated
  with check (
    exists (
      select 1
      from public.church_groups g
      join public.church_members cm on cm.church_id = g.church_id
      where g.id = church_group_members.group_id
        and cm.user_id = church_group_members.user_id and cm.approved = true
        and (
          public.can_manage_church_group(g.id, auth.uid())
          or (
            church_group_members.user_id = auth.uid()
            and g.privacy = 'public'
          )
        )
    )
  );

commit;
