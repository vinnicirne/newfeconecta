-- Pixel events contain partner analytics and request metadata. Keep writes on
-- the server-side service role and expose reads only to the owning partner/admin.
begin;

create table if not exists public.ad_pixel_events (
  id uuid primary key default gen_random_uuid(),
  pixel_id text not null,
  partner_id uuid references auth.users(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  event_name text not null,
  event_id text,
  value_cents bigint not null default 0,
  currency text not null default 'BRL',
  order_id text,
  client_ip text,
  user_agent text,
  url text,
  referrer text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_ad_pixel_events_campaign on public.ad_pixel_events(campaign_id, created_at desc);
create index if not exists idx_ad_pixel_events_pixel on public.ad_pixel_events(pixel_id, event_name);
create index if not exists idx_ad_pixel_events_dedup on public.ad_pixel_events(event_id) where event_id is not null;
create index if not exists idx_ad_pixel_events_partner on public.ad_pixel_events(partner_id);

create table if not exists public.ad_conversions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  conversion_type text not null default 'lead',
  revenue_cents bigint not null default 0,
  converted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_ad_conversions_campaign on public.ad_conversions(campaign_id, converted_at desc);
create index if not exists idx_ad_conversions_user on public.ad_conversions(user_id);

alter table public.ad_pixel_events enable row level security;
alter table public.ad_conversions enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname, tablename
    from pg_policies
    where schemaname = 'public' and tablename in ('ad_pixel_events', 'ad_conversions')
  loop
    execute format('drop policy if exists %I on public.%I', policy_row.policyname, policy_row.tablename);
  end loop;
end;
$$;

revoke all on public.ad_pixel_events from public, anon, authenticated;
revoke all on public.ad_conversions from public, anon, authenticated;
grant select on public.ad_pixel_events to authenticated;
grant select on public.ad_conversions to authenticated;
grant all on public.ad_pixel_events to service_role;
grant all on public.ad_conversions to service_role;

create policy ad_pixel_events_select_owner_or_admin
  on public.ad_pixel_events for select to authenticated
  using (
    partner_id = auth.uid()
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin')
    )
  );

create policy ad_conversions_select_owner_or_admin
  on public.ad_conversions for select to authenticated
  using (
    exists (
      select 1 from public.campaigns c
      where c.id = campaign_id and c.partner_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('admin', 'superadmin')
    )
  );

commit;
