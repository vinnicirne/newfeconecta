-- ==============================================================================
-- MIGRAÇÃO DE SEGURANÇA NUCLEAR: STORIES, STORY_VIEWS & STORY_LIKES
-- Data: 2026-08-24
-- ==============================================================================

-- 1. STORIES TABLE
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stories_select_policy" ON public.stories;
DROP POLICY IF EXISTS "stories_insert_policy" ON public.stories;
DROP POLICY IF EXISTS "stories_update_policy" ON public.stories;
DROP POLICY IF EXISTS "stories_delete_policy" ON public.stories;

-- Leitura: Stories ativos (24h), destaques ou próprias postagens
CREATE POLICY "stories_select_policy" ON public.stories
FOR SELECT TO public
USING (
    (expires_at > now()) 
    OR (auth.uid() IS NOT NULL AND ((auth.uid() = author_id) OR (auth.uid() = user_id) OR (auth.uid() = profile_id)))
    OR (is_highlight = true)
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR role = 'moderator')
    ))
);

-- Inserção: Estritamente amarrada ao auth.uid()
CREATE POLICY "stories_insert_policy" ON public.stories
FOR INSERT TO authenticated
WITH CHECK (
    (auth.uid() = author_id OR author_id IS NULL)
    AND (auth.uid() = user_id OR user_id IS NULL)
    AND (auth.uid() = profile_id OR profile_id IS NULL)
    AND (author_id IS NOT NULL OR user_id IS NOT NULL OR profile_id IS NOT NULL)
);

-- Atualização: Apenas o autor ou administradores
CREATE POLICY "stories_update_policy" ON public.stories
FOR UPDATE TO authenticated
USING (
    ((auth.uid() = author_id) OR (auth.uid() = user_id) OR (auth.uid() = profile_id))
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR role = 'moderator')
    ))
)
WITH CHECK (
    (auth.uid() = author_id OR author_id IS NULL)
    AND (auth.uid() = user_id OR user_id IS NULL)
    AND (auth.uid() = profile_id OR profile_id IS NULL)
);

-- Exclusão: Apenas o autor ou administradores
CREATE POLICY "stories_delete_policy" ON public.stories
FOR DELETE TO authenticated
USING (
    ((auth.uid() = author_id) OR (auth.uid() = user_id) OR (auth.uid() = profile_id))
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR role = 'moderator')
    ))
);


-- 2. STORY_VIEWS TABLE
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Insercao de views de stories autenticado" ON public.story_views;
DROP POLICY IF EXISTS "Leitura publica de views de stories" ON public.story_views;
DROP POLICY IF EXISTS "story_views_insert_policy" ON public.story_views;
DROP POLICY IF EXISTS "story_views_select_policy" ON public.story_views;
DROP POLICY IF EXISTS "story_views_delete_policy" ON public.story_views;

-- Inserção: viewer_id DEVE bater com o auth.uid() do usuário (Prevenção de Spoofing de Views)
CREATE POLICY "story_views_insert_policy" ON public.story_views
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = viewer_id);

-- Leitura: Apenas o autor do story, o próprio visualizador ou administradores
CREATE POLICY "story_views_select_policy" ON public.story_views
FOR SELECT TO authenticated
USING (
    (auth.uid() = viewer_id)
    OR (EXISTS (
        SELECT 1 FROM public.stories 
        WHERE stories.id = story_views.story_id 
        AND (stories.author_id = auth.uid() OR stories.user_id = auth.uid() OR stories.profile_id = auth.uid())
    ))
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    ))
);

-- Exclusão: Apenas o próprio visualizador ou administradores
CREATE POLICY "story_views_delete_policy" ON public.story_views
FOR DELETE TO authenticated
USING (
    (auth.uid() = viewer_id)
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    ))
);


-- 3. STORY_LIKES TABLE (EXPURGO NUCLEAR DAS 12 POLÍTICAS DUPLICADAS)
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'story_likes') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.story_likes', r.policyname);
    END LOOP;
END $$;

-- Leitura: Pública para renderizar contagem e status
CREATE POLICY "story_likes_select_policy" ON public.story_likes
FOR SELECT TO public
USING (true);

-- Inserção: Estritamente amarrada ao auth.uid()
CREATE POLICY "story_likes_insert_policy" ON public.story_likes
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Exclusão: Apenas o próprio usuário que curtiu ou administradores
CREATE POLICY "story_likes_delete_policy" ON public.story_likes
FOR DELETE TO authenticated
USING (
    (auth.uid() = user_id)
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    ))
);
