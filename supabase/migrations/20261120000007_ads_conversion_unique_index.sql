-- A full unique index lets PostgREST infer the upsert conflict target.
begin;

drop index if exists public.ad_conversions_campaign_event_uidx;
create unique index ad_conversions_campaign_event_uidx
  on public.ad_conversions (campaign_id, event_id);

commit;
