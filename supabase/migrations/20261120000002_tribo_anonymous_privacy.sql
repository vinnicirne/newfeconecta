-- Anonymous callers may read public reels, but cannot select a profile ID and
-- learn that profile's private saved/liked/reposted state from the RPC flags.

create or replace function public.get_tribo_reels(
  p_user_id text,
  p_cursor text default null::text,
  p_limit integer default 10
)
returns table(
  id uuid,
  content text,
  media_url text,
  media_type text,
  post_type text,
  created_at timestamp with time zone,
  likes_count integer,
  comments_count integer,
  reposts_count integer,
  views_count integer,
  author_id uuid,
  author_username text,
  author_name text,
  author_avatar text,
  is_liked boolean,
  is_reposted boolean,
  is_saved boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cursor_ts timestamp with time zone;
  v_viewer_id text;
begin
  -- Ignore caller supplied IDs for anon requests; auth.uid() is the only
  -- trusted identity source for personalized interaction state.
  v_viewer_id := auth.uid()::text;

  if p_cursor is not null and p_cursor <> '' then
    v_cursor_ts := p_cursor::timestamp with time zone;
  end if;

  return query
  select
    p.id,
    p.content,
    p.media_url,
    p.media_type,
    p.post_type,
    p.created_at,
    coalesce(p.likes_count, 0)::integer,
    coalesce(p.comments_count, 0)::integer,
    coalesce(p.reposts_count, 0)::integer,
    coalesce(p.views_count, 0)::integer,
    p.author_id,
    pr.username,
    coalesce(pr.full_name, pr.username, 'Usuário'),
    pr.avatar_url,
    exists (
      select 1 from public.post_likes l
      where l.post_id = p.id and l.profile_id::text = v_viewer_id
    ),
    exists (
      select 1 from public.reposts r
      where r.post_id = p.id and r.profile_id::text = v_viewer_id
    ),
    exists (
      select 1 from public.saved_posts s
      where s.post_id = p.id and s.user_id::text = v_viewer_id
    )
  from public.posts p
  join public.profiles pr on pr.id = p.author_id
  where (
      p.post_type = 'video'
      or (p.post_type = 'external_media' and (p.media_type = 'video' or p.media_url is not null))
    )
    and (v_cursor_ts is null or p.created_at < v_cursor_ts)
  order by p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 10), 50));
end;
$$;

notify pgrst, 'reload schema';
