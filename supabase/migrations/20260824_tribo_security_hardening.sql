-- =========================================================================
-- MIGRAÇÃO DE SEGURANÇA E BLINDAGEM NUCLEAR: SISTEMA DE TRIBOS & SOCIAL
-- Data: 2026-08-24
-- =========================================================================

-- 1. BLINDAGEM DA RPC TOGGLE_LIKE (Anti-IDOR / Anti-Spoofing)
CREATE OR REPLACE FUNCTION public.toggle_like(p_post_id UUID, p_profile_id UUID DEFAULT NULL)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_is_liked BOOLEAN;
BEGIN
  -- Se o chamador for autenticado no Supabase, força o ID real do token JWT
  IF auth.role() = 'authenticated' THEN
    v_caller_id := auth.uid();
  ELSE
    v_caller_id := COALESCE(p_profile_id, auth.uid());
  END IF;

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Ação não permitida: Usuário não autenticado';
  END IF;

  -- 1. Verifica se a curtida já existe
  SELECT EXISTS (
    SELECT 1 FROM public.post_likes 
    WHERE post_id = p_post_id AND profile_id = v_caller_id
  ) INTO v_is_liked;

  -- 2. Se já curtiu, remove (unlike)
  IF v_is_liked THEN
    DELETE FROM public.post_likes 
    WHERE post_id = p_post_id AND profile_id = v_caller_id;
    RETURN FALSE;
  ELSE
    -- 3. Se não curtiu, insere (like)
    INSERT INTO public.post_likes (post_id, profile_id)
    VALUES (p_post_id, v_caller_id)
    ON CONFLICT (post_id, profile_id) DO NOTHING;
    RETURN TRUE;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_like(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_like(UUID, UUID) TO service_role;


-- 2. BLINDAGEM DA RPC TOGGLE_FOLLOW (Anti-IDOR / Anti-Spoofing)
CREATE OR REPLACE FUNCTION public.toggle_follow(p_follower_id UUID, p_following_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_exists BOOLEAN;
BEGIN
    IF auth.role() = 'authenticated' THEN
        v_caller_id := auth.uid();
    ELSE
        v_caller_id := COALESCE(p_follower_id, auth.uid());
    END IF;

    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Ação não permitida: Usuário não autenticado';
    END IF;

    IF v_caller_id = p_following_id THEN
        RAISE EXCEPTION 'Você não pode seguir a si mesmo';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.follows 
        WHERE follower_id = v_caller_id AND following_id = p_following_id
    ) INTO v_exists;

    IF v_exists THEN
        DELETE FROM public.follows 
        WHERE follower_id = v_caller_id AND following_id = p_following_id;
        RETURN FALSE;
    ELSE
        INSERT INTO public.follows (follower_id, following_id)
        VALUES (v_caller_id, p_following_id)
        ON CONFLICT (follower_id, following_id) DO NOTHING;
        RETURN TRUE;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_follow(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_follow(UUID, UUID) TO service_role;


-- 3. EXPURGO E RECRIAÇÃO DE POLÍTICAS RLS: REPOSTS
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reposts' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reposts', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "reposts_select_policy" ON public.reposts 
  FOR SELECT USING (true);

CREATE POLICY "reposts_insert_policy" ON public.reposts 
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "reposts_delete_policy" ON public.reposts 
  FOR DELETE USING (auth.uid() = profile_id);


-- 4. EXPURGO E RECRIAÇÃO DE POLÍTICAS RLS: SAVED_POSTS
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saved_posts' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.saved_posts', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "saved_posts_select_policy" ON public.saved_posts 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "saved_posts_insert_policy" ON public.saved_posts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_posts_delete_policy" ON public.saved_posts 
  FOR DELETE USING (auth.uid() = user_id);


-- 5. EXPURGO E RECRIAÇÃO DE POLÍTICAS RLS: POST_LIKES
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'post_likes' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.post_likes', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "post_likes_select_policy" ON public.post_likes 
  FOR SELECT USING (true);

CREATE POLICY "post_likes_insert_policy" ON public.post_likes 
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "post_likes_delete_policy" ON public.post_likes 
  FOR DELETE USING (auth.uid() = profile_id);


-- 6. EXPURGO E RECRIAÇÃO DE POLÍTICAS RLS: FOLLOWS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'follows' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.follows', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "follows_select_policy" ON public.follows 
  FOR SELECT USING (true);

CREATE POLICY "follows_insert_policy" ON public.follows 
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "follows_delete_policy" ON public.follows 
  FOR DELETE USING (auth.uid() = follower_id);


-- 7. EXPURGO E RECRIAÇÃO DE POLÍTICAS RLS: NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notifications' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.notifications', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "notifications_select_policy" ON public.notifications 
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "notifications_insert_policy" ON public.notifications 
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id 
    OR EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role = 'super_admin' OR profiles.role = 'super_usuario')
    )
  );

CREATE POLICY "notifications_update_policy" ON public.notifications 
  FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "notifications_delete_policy" ON public.notifications 
  FOR DELETE USING (auth.uid() = recipient_id);


-- 8. OTIMIZAÇÃO E BLINDAGEM DA RPC GET_TRIBO_REELS
CREATE OR REPLACE FUNCTION public.get_tribo_reels(
  p_user_id text, 
  p_cursor text DEFAULT NULL::text, 
  p_limit integer DEFAULT 10
)
RETURNS TABLE(
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_cursor_ts timestamp with time zone;
  v_viewer_id text;
BEGIN
  -- Se o usuário estiver autenticado, garante o id real para flags de interação
  IF auth.role() = 'authenticated' THEN
    v_viewer_id := auth.uid()::text;
  ELSE
    v_viewer_id := p_user_id;
  END IF;

  IF p_cursor IS NOT NULL AND p_cursor != '' THEN
    v_cursor_ts := p_cursor::timestamp with time zone;
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.content,
    p.media_url,
    p.media_type,
    p.post_type,
    p.created_at,
    COALESCE(p.likes_count, 0) as likes_count,
    COALESCE(p.comments_count, 0) as comments_count,
    COALESCE(p.reposts_count, 0) as reposts_count,
    COALESCE(p.views_count, 0) as views_count,
    p.author_id,
    pr.username as author_username,
    COALESCE(pr.full_name, pr.username, 'Usuário') as author_name,
    pr.avatar_url as author_avatar,
    EXISTS (
      SELECT 1 FROM public.post_likes l 
      WHERE l.post_id = p.id 
      AND (v_viewer_id IS NOT NULL AND l.profile_id::text = v_viewer_id)
    ) as is_liked,
    EXISTS (
      SELECT 1 FROM public.reposts r 
      WHERE r.post_id = p.id 
      AND (v_viewer_id IS NOT NULL AND r.profile_id::text = v_viewer_id)
    ) as is_reposted,
    EXISTS (
      SELECT 1 FROM public.saved_posts s 
      WHERE s.post_id = p.id 
      AND (v_viewer_id IS NOT NULL AND s.user_id::text = v_viewer_id)
    ) as is_saved
  FROM 
    public.posts p
  INNER JOIN 
    public.profiles pr ON p.author_id = pr.id
  WHERE 
    (p.post_type = 'video' OR (p.post_type = 'external_media' AND (p.media_type = 'video' OR p.media_url IS NOT NULL)))
    AND (v_cursor_ts IS NULL OR p.created_at < v_cursor_ts)
  ORDER BY 
    p.created_at DESC
  LIMIT 
    p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tribo_reels(text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_tribo_reels(text, text, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.get_tribo_reels(text, text, integer) TO service_role;
