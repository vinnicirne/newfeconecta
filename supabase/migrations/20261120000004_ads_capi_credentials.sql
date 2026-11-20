-- Per-campaign credentials allow server-to-server conversions without trusting
-- public browser pixels with financial attribution.
begin;

create table if not exists public.ad_pixel_credentials (
  campaign_id uuid primary key references public.campaigns(id) on delete cascade,
  partner_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.ad_pixel_credentials enable row level security;
revoke all on public.ad_pixel_credentials from public, anon, authenticated;
grant all on public.ad_pixel_credentials to service_role;

commit;
