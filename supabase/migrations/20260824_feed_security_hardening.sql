-- =========================================================================
-- MIGRAÇÃO DE SEGURANÇA E BLINDAGEM NUCLEAR: MÓDULO FEED, COMENTÁRIOS & REPORTS
-- Data: 2026-08-24
-- =========================================================================

-- 1. RPCs ATÔMICAS PARA CURTIDAS EM COMENTÁRIOS DE POSTS E VERSÍCULOS
CREATE OR REPLACE FUNCTION public.toggle_post_comment_like(p_comment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_liked BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Ação não permitida: Usuário não autenticado';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.comments 
    WHERE id = p_comment_id AND v_user_id::text = ANY(likes::text[])
  ) INTO v_is_liked;

  IF v_is_liked THEN
    UPDATE public.comments 
    SET likes = array_remove(likes, v_user_id::text)
    WHERE id = p_comment_id;
    RETURN FALSE;
  ELSE
    UPDATE public.comments 
    SET likes = array_append(COALESCE(likes, ARRAY[]::text[]), v_user_id::text)
    WHERE id = p_comment_id;
    RETURN TRUE;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_verse_comment_like(p_comment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID;
  v_is_liked BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Ação não permitida: Usuário não autenticado';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.daily_verse_comments 
    WHERE id = p_comment_id AND v_user_id::text = ANY(likes::text[])
  ) INTO v_is_liked;

  IF v_is_liked THEN
    UPDATE public.daily_verse_comments 
    SET likes = array_remove(likes, v_user_id::text)
    WHERE id = p_comment_id;
    RETURN FALSE;
  ELSE
    UPDATE public.daily_verse_comments 
    SET likes = array_append(COALESCE(likes, ARRAY[]::text[]), v_user_id::text)
    WHERE id = p_comment_id;
    RETURN TRUE;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_post_comment_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_post_comment_like(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.toggle_verse_comment_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_verse_comment_like(UUID) TO service_role;


-- 2. BLINDAGEM RLS EM COMMENTS (Expurgo de política ALL irrestrita)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'comments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.comments', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "comments_select_policy" ON public.comments 
  FOR SELECT USING (true);

CREATE POLICY "comments_insert_policy" ON public.comments 
  FOR INSERT WITH CHECK (
    auth.uid() = profile_id OR (profile_id IS NULL AND auth.uid() = user_id)
  );

CREATE POLICY "comments_update_policy" ON public.comments 
  FOR UPDATE USING (
    auth.uid() = profile_id OR auth.uid() = user_id
  ) WITH CHECK (
    auth.uid() = profile_id OR auth.uid() = user_id
  );

CREATE POLICY "comments_delete_policy" ON public.comments 
  FOR DELETE USING (
    auth.uid() = profile_id OR 
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.posts 
      WHERE posts.id = comments.post_id AND (posts.author_id = auth.uid() OR posts.user_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'superadmin' OR profiles.role = 'moderator')
    )
  );

GRANT ALL ON TABLE public.comments TO authenticated, service_role;
GRANT SELECT ON TABLE public.comments TO anon;


-- 3. BLINDAGEM RLS EM DAILY_VERSE_COMMENTS
ALTER TABLE public.daily_verse_comments ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_verse_comments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.daily_verse_comments', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "daily_verse_comments_select_policy" ON public.daily_verse_comments 
  FOR SELECT USING (true);

CREATE POLICY "daily_verse_comments_insert_policy" ON public.daily_verse_comments 
  FOR INSERT WITH CHECK (
    auth.uid() = profile_id
  );

CREATE POLICY "daily_verse_comments_update_policy" ON public.daily_verse_comments 
  FOR UPDATE USING (
    auth.uid() = profile_id
  ) WITH CHECK (
    auth.uid() = profile_id
  );

CREATE POLICY "daily_verse_comments_delete_policy" ON public.daily_verse_comments 
  FOR DELETE USING (
    auth.uid() = profile_id OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'superadmin' OR profiles.role = 'moderator')
    )
  );

GRANT ALL ON TABLE public.daily_verse_comments TO authenticated, service_role;
GRANT SELECT ON TABLE public.daily_verse_comments TO anon;


-- 4. BLINDAGEM RLS EM REPORTS (Moderação & Admin)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'reports' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reports', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "reports_select_policy" ON public.reports 
  FOR SELECT USING (
    auth.uid() = reporter_id OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'superadmin' OR profiles.role = 'moderator')
    )
  );

CREATE POLICY "reports_insert_policy" ON public.reports 
  FOR INSERT WITH CHECK (
    auth.uid() = reporter_id
  );

CREATE POLICY "reports_update_policy" ON public.reports 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'superadmin' OR profiles.role = 'moderator')
    )
  );

GRANT ALL ON TABLE public.reports TO authenticated, service_role;

