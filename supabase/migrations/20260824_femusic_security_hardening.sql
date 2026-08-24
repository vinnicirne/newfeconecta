-- =========================================================================
-- MIGRAÇÃO DE SEGURANÇA E BLINDAGEM NUCLEAR: SISTEMA FÉMUSIC & /MUSIC
-- Data: 2026-08-24
-- =========================================================================

-- 1. TABELA MUSIC_POSTS (Publicações de Música no Feed / FéMusic)
ALTER TABLE public.music_posts ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_posts' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.music_posts', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "music_posts_select_policy" ON public.music_posts 
  FOR SELECT USING (true);

CREATE POLICY "music_posts_insert_policy" ON public.music_posts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_posts_update_policy" ON public.music_posts 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_posts_delete_policy" ON public.music_posts 
  FOR DELETE USING (auth.uid() = user_id);


-- 2. TABELA MUSIC_TRACK_COMMENTS (Comentários nas Faixas do Player)
ALTER TABLE public.music_track_comments ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_track_comments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.music_track_comments', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "music_track_comments_select_policy" ON public.music_track_comments 
  FOR SELECT USING (true);

CREATE POLICY "music_track_comments_insert_policy" ON public.music_track_comments 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_track_comments_update_policy" ON public.music_track_comments 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_track_comments_delete_policy" ON public.music_track_comments 
  FOR DELETE USING (auth.uid() = user_id);


-- 3. TABELA MUSIC_TRACK_COMMENT_LIKES (Curtidas nos Comentários de Faixas)
ALTER TABLE public.music_track_comment_likes ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_track_comment_likes' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.music_track_comment_likes', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "music_track_comment_likes_select_policy" ON public.music_track_comment_likes 
  FOR SELECT USING (true);

CREATE POLICY "music_track_comment_likes_insert_policy" ON public.music_track_comment_likes 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_track_comment_likes_delete_policy" ON public.music_track_comment_likes 
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger Atômico para sincronizar likes_count em music_track_comments
CREATE OR REPLACE FUNCTION public.sync_music_track_comment_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.music_track_comments 
    SET likes_count = COALESCE(likes_count, 0) + 1 
    WHERE id = NEW.comment_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.music_track_comments 
    SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1) 
    WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_music_track_comment_likes_sync ON public.music_track_comment_likes;
CREATE TRIGGER tr_music_track_comment_likes_sync
AFTER INSERT OR DELETE ON public.music_track_comment_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_music_track_comment_likes();


-- 4. TABELA MUSIC_REACTIONS & MUSIC_COMMENTS (Interações do Music Share)
ALTER TABLE public.music_reactions ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_reactions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.music_reactions', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "music_reactions_select_policy" ON public.music_reactions 
  FOR SELECT USING (true);

CREATE POLICY "music_reactions_insert_policy" ON public.music_reactions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_reactions_delete_policy" ON public.music_reactions 
  FOR DELETE USING (auth.uid() = user_id);


ALTER TABLE public.music_comments ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_comments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.music_comments', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "music_comments_select_policy" ON public.music_comments 
  FOR SELECT USING (true);

CREATE POLICY "music_comments_insert_policy" ON public.music_comments 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_comments_update_policy" ON public.music_comments 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_comments_delete_policy" ON public.music_comments 
  FOR DELETE USING (auth.uid() = user_id);


-- 5. TABELA MUSIC_SAVED (Músicas Salvas)
ALTER TABLE public.music_saved ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_saved' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.music_saved', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "music_saved_select_policy" ON public.music_saved 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "music_saved_insert_policy" ON public.music_saved 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_saved_delete_policy" ON public.music_saved 
  FOR DELETE USING (auth.uid() = user_id);


-- 6. TABELAS DE SESSÃO, HISTÓRICO E CONTAS DE PROVEDORES (Privacidade Estrita)
ALTER TABLE public.music_history ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_history' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.music_history', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "music_history_select_policy" ON public.music_history 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "music_history_insert_policy" ON public.music_history 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_history_update_policy" ON public.music_history 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_history_delete_policy" ON public.music_history 
  FOR DELETE USING (auth.uid() = user_id);


ALTER TABLE public.music_sessions ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_sessions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.music_sessions', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "music_sessions_select_policy" ON public.music_sessions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "music_sessions_insert_policy" ON public.music_sessions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_sessions_update_policy" ON public.music_sessions 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_sessions_delete_policy" ON public.music_sessions 
  FOR DELETE USING (auth.uid() = user_id);


ALTER TABLE public.music_provider_accounts ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_provider_accounts' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.music_provider_accounts', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "music_provider_accounts_select_policy" ON public.music_provider_accounts 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "music_provider_accounts_insert_policy" ON public.music_provider_accounts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_provider_accounts_update_policy" ON public.music_provider_accounts 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_provider_accounts_delete_policy" ON public.music_provider_accounts 
  FOR DELETE USING (auth.uid() = user_id);


-- 7. TABELA MUSIC_TRACKS & FEMUSIC_CACHE
ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_tracks' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.music_tracks', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "music_tracks_select_policy" ON public.music_tracks 
  FOR SELECT USING (true);

CREATE POLICY "music_tracks_insert_policy" ON public.music_tracks 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');


ALTER TABLE public.femusic_cache ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'femusic_cache' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.femusic_cache', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "femusic_cache_select_policy" ON public.femusic_cache 
  FOR SELECT USING (true);

CREATE POLICY "femusic_cache_insert_policy" ON public.femusic_cache 
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

CREATE POLICY "femusic_cache_update_policy" ON public.femusic_cache 
  FOR UPDATE USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Concessões de Permissão Limpas
GRANT SELECT ON public.music_tracks TO anon, authenticated;
GRANT INSERT ON public.music_tracks TO authenticated;
GRANT ALL ON public.music_tracks TO service_role;

GRANT SELECT ON public.femusic_cache TO anon, authenticated;
GRANT INSERT, UPDATE ON public.femusic_cache TO authenticated;
GRANT ALL ON public.femusic_cache TO service_role;


-- 8. TABELA MUSIC_LIKES (Sincronização em Nuvem de Favoritos)
CREATE TABLE IF NOT EXISTS public.music_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL,
  track_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_user_track_like UNIQUE(user_id, track_id)
);

ALTER TABLE public.music_likes ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'music_likes' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.music_likes', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "music_likes_select_policy" ON public.music_likes 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "music_likes_insert_policy" ON public.music_likes 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_likes_update_policy" ON public.music_likes 
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "music_likes_delete_policy" ON public.music_likes 
  FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON TABLE public.music_likes TO authenticated, service_role;


-- 9. RPC ATÔMICA PARA CURTIDAS EM COMENTÁRIOS DE MÚSICAS
CREATE OR REPLACE FUNCTION public.toggle_music_track_comment_like(p_comment_id UUID)
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
    SELECT 1 FROM public.music_track_comments 
    WHERE id = p_comment_id AND v_user_id::text = ANY(likes::text[])
  ) INTO v_is_liked;

  IF v_is_liked THEN
    UPDATE public.music_track_comments 
    SET likes = array_remove(likes, v_user_id::text)
    WHERE id = p_comment_id;
    RETURN FALSE;
  ELSE
    UPDATE public.music_track_comments 
    SET likes = array_append(COALESCE(likes, ARRAY[]::text[]), v_user_id::text)
    WHERE id = p_comment_id;
    RETURN TRUE;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_music_track_comment_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_music_track_comment_like(UUID) TO service_role;

