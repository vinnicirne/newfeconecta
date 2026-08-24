-- =========================================================================
-- MIGRAÇÃO DE SEGURANÇA E BLINDAGEM NUCLEAR: MÓDULO BÍBLIA SAGRADA (/biblia)
-- Data: 2026-08-24
-- =========================================================================

-- 1. BLINDAGEM RLS EM BIBLE_COMMENTS (Comentários de Capítulos e Versículos)
ALTER TABLE public.bible_comments ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bible_comments' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bible_comments', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "bible_comments_select_policy" ON public.bible_comments 
  FOR SELECT USING (true);

CREATE POLICY "bible_comments_insert_policy" ON public.bible_comments 
  FOR INSERT WITH CHECK (
    auth.uid() = profile_id
  );

CREATE POLICY "bible_comments_update_policy" ON public.bible_comments 
  FOR UPDATE USING (
    auth.uid() = profile_id
  ) WITH CHECK (
    auth.uid() = profile_id
  );

CREATE POLICY "bible_comments_delete_policy" ON public.bible_comments 
  FOR DELETE USING (
    auth.uid() = profile_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

GRANT ALL ON TABLE public.bible_comments TO authenticated, service_role;
GRANT SELECT ON TABLE public.bible_comments TO anon;


-- 2. BLINDAGEM RLS EM BIBLE_FAVORITES (Versículos Favoritos)
ALTER TABLE public.bible_favorites ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bible_favorites' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bible_favorites', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "bible_favorites_select_policy" ON public.bible_favorites 
  FOR SELECT USING (
    auth.uid() = profile_id
  );

CREATE POLICY "bible_favorites_insert_policy" ON public.bible_favorites 
  FOR INSERT WITH CHECK (
    auth.uid() = profile_id
  );

CREATE POLICY "bible_favorites_delete_policy" ON public.bible_favorites 
  FOR DELETE USING (
    auth.uid() = profile_id
  );

GRANT ALL ON TABLE public.bible_favorites TO authenticated, service_role;


-- 3. BLINDAGEM RLS EM BIBLE_HIGHLIGHTS (Marca-texto)
ALTER TABLE public.bible_highlights ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bible_highlights' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bible_highlights', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "bible_highlights_select_policy" ON public.bible_highlights 
  FOR SELECT USING (
    auth.uid() = profile_id
  );

CREATE POLICY "bible_highlights_insert_policy" ON public.bible_highlights 
  FOR INSERT WITH CHECK (
    auth.uid() = profile_id
  );

CREATE POLICY "bible_highlights_update_policy" ON public.bible_highlights 
  FOR UPDATE USING (
    auth.uid() = profile_id
  ) WITH CHECK (
    auth.uid() = profile_id
  );

CREATE POLICY "bible_highlights_delete_policy" ON public.bible_highlights 
  FOR DELETE USING (
    auth.uid() = profile_id
  );

GRANT ALL ON TABLE public.bible_highlights TO authenticated, service_role;


-- 4. BLINDAGEM RLS EM BIBLE_INTERACTIONS (Interações Gerais, Destaques e Notas)
ALTER TABLE public.bible_interactions ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bible_interactions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.bible_interactions', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "bible_interactions_select_policy" ON public.bible_interactions 
  FOR SELECT USING (
    auth.uid() = user_id OR auth.uid() = profile_id
  );

CREATE POLICY "bible_interactions_insert_policy" ON public.bible_interactions 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() = profile_id
  );

CREATE POLICY "bible_interactions_update_policy" ON public.bible_interactions 
  FOR UPDATE USING (
    auth.uid() = user_id OR auth.uid() = profile_id
  ) WITH CHECK (
    auth.uid() = user_id OR auth.uid() = profile_id
  );

CREATE POLICY "bible_interactions_delete_policy" ON public.bible_interactions 
  FOR DELETE USING (
    auth.uid() = user_id OR auth.uid() = profile_id
  );

GRANT ALL ON TABLE public.bible_interactions TO authenticated, service_role;


-- 5. BLINDAGEM RLS EM USER_NOTES (Caderno de Anotações Espirituais)
ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_notes' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_notes', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "user_notes_select_policy" ON public.user_notes 
  FOR SELECT USING (
    auth.uid() = user_id OR auth.uid() = profile_id OR is_public = true
  );

CREATE POLICY "user_notes_insert_policy" ON public.user_notes 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR auth.uid() = profile_id
  );

CREATE POLICY "user_notes_update_policy" ON public.user_notes 
  FOR UPDATE USING (
    auth.uid() = user_id OR auth.uid() = profile_id
  ) WITH CHECK (
    auth.uid() = user_id OR auth.uid() = profile_id
  );

CREATE POLICY "user_notes_delete_policy" ON public.user_notes 
  FOR DELETE USING (
    auth.uid() = user_id OR auth.uid() = profile_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

GRANT ALL ON TABLE public.user_notes TO authenticated, service_role;
GRANT SELECT ON TABLE public.user_notes TO anon;

