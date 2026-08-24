-- ==============================================================================
-- MIGRAÇÃO DE SEGURANÇA NUCLEAR: LUGAR SECRETO / SANTUÁRIO
-- Tabelas: sanctuary_journeys, sanctuary_chapters, sanctuary_progress
-- Data: 2026-08-24
-- ==============================================================================

-- 1. SANCTUARY_JOURNEYS
ALTER TABLE public.sanctuary_journeys ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sanctuary_journeys') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.sanctuary_journeys', r.policyname);
    END LOOP;
END $$;

-- Leitura: Jornadas publicadas, autor ou administradores
CREATE POLICY "sanctuary_journeys_select_policy" ON public.sanctuary_journeys
FOR SELECT TO public
USING (
    (is_published = true)
    OR (auth.uid() IS NOT NULL AND auth.uid() = author_id)
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR role = 'moderator')
    ))
);

-- Inserção: Apenas perfis verificados ou administradores
CREATE POLICY "sanctuary_journeys_insert_policy" ON public.sanctuary_journeys
FOR INSERT TO authenticated
WITH CHECK (
    (auth.uid() = author_id)
    AND (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (is_verified = true OR role = 'admin' OR role = 'superadmin')
        )
    )
);

-- Atualização: Apenas o autor ou administradores
CREATE POLICY "sanctuary_journeys_update_policy" ON public.sanctuary_journeys
FOR UPDATE TO authenticated
USING (
    (auth.uid() = author_id)
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    ))
)
WITH CHECK (
    (auth.uid() = author_id)
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    ))
);

-- Exclusão: Apenas o autor ou administradores
CREATE POLICY "sanctuary_journeys_delete_policy" ON public.sanctuary_journeys
FOR DELETE TO authenticated
USING (
    (auth.uid() = author_id)
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    ))
);


-- 2. SANCTUARY_CHAPTERS
ALTER TABLE public.sanctuary_chapters ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sanctuary_chapters') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.sanctuary_chapters', r.policyname);
    END LOOP;
END $$;

-- Leitura: Capítulos de jornadas publicadas ou do próprio autor
CREATE POLICY "sanctuary_chapters_select_policy" ON public.sanctuary_chapters
FOR SELECT TO public
USING (
    EXISTS (
        SELECT 1 FROM public.sanctuary_journeys j
        WHERE j.id = sanctuary_chapters.journey_id 
        AND (j.is_published = true OR j.author_id = auth.uid())
    )
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR role = 'moderator')
    ))
);

-- Inserção: Apenas o autor da jornada correspondente ou administradores
CREATE POLICY "sanctuary_chapters_insert_policy" ON public.sanctuary_chapters
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sanctuary_journeys j
        WHERE j.id = sanctuary_chapters.journey_id 
        AND (j.author_id = auth.uid())
    )
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    ))
);

-- Atualização: Apenas o autor da jornada ou administradores
CREATE POLICY "sanctuary_chapters_update_policy" ON public.sanctuary_chapters
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sanctuary_journeys j
        WHERE j.id = sanctuary_chapters.journey_id 
        AND (j.author_id = auth.uid())
    )
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    ))
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sanctuary_journeys j
        WHERE j.id = sanctuary_chapters.journey_id 
        AND (j.author_id = auth.uid())
    )
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    ))
);

-- Exclusão: Apenas o autor da jornada ou administradores
CREATE POLICY "sanctuary_chapters_delete_policy" ON public.sanctuary_chapters
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.sanctuary_journeys j
        WHERE j.id = sanctuary_chapters.journey_id 
        AND (j.author_id = auth.uid())
    )
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    ))
);


-- 3. SANCTUARY_PROGRESS (ALTAR DIGITAL)
ALTER TABLE public.sanctuary_progress ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sanctuary_progress') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.sanctuary_progress', r.policyname);
    END LOOP;
END $$;

-- Leitura: Apenas o próprio fiel ou administradores
CREATE POLICY "sanctuary_progress_select_policy" ON public.sanctuary_progress
FOR SELECT TO authenticated
USING (
    (auth.uid() = user_id)
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    ))
);

-- Inserção: Selar leitura no próprio altar
CREATE POLICY "sanctuary_progress_insert_policy" ON public.sanctuary_progress
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Atualização: Apenas o próprio usuário
CREATE POLICY "sanctuary_progress_update_policy" ON public.sanctuary_progress
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Exclusão: Apenas o próprio usuário
CREATE POLICY "sanctuary_progress_delete_policy" ON public.sanctuary_progress
FOR DELETE TO authenticated
USING (
    (auth.uid() = user_id)
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    ))
);
