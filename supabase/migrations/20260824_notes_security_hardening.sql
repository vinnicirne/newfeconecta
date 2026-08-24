-- ==============================================================================
-- MIGRAÇÃO DE SEGURANÇA NUCLEAR: NOTAS & DEVOCIONAL (user_notes)
-- Data: 2026-08-24
-- ==============================================================================

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

-- 1. Remoção de políticas antigas
DROP POLICY IF EXISTS "user_notes_select_policy" ON public.user_notes;
DROP POLICY IF EXISTS "user_notes_insert_policy" ON public.user_notes;
DROP POLICY IF EXISTS "user_notes_update_policy" ON public.user_notes;
DROP POLICY IF EXISTS "user_notes_delete_policy" ON public.user_notes;

-- 2. Leitura: Próprias notas (privadas ou públicas) e notas públicas de terceiros
CREATE POLICY "user_notes_select_policy" ON public.user_notes
FOR SELECT TO public
USING (
    (auth.uid() IS NOT NULL AND ((auth.uid() = user_id) OR (auth.uid() = profile_id)))
    OR (is_public = true)
);

-- 3. Inserção: Estritamente amarrada ao auth.uid() do usuário autenticado
CREATE POLICY "user_notes_insert_policy" ON public.user_notes
FOR INSERT TO authenticated
WITH CHECK (
    (auth.uid() = user_id OR user_id IS NULL) 
    AND (auth.uid() = profile_id OR profile_id IS NULL)
    AND (user_id IS NOT NULL OR profile_id IS NOT NULL)
);

-- 4. Atualização: Apenas o proprietário
CREATE POLICY "user_notes_update_policy" ON public.user_notes
FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR (auth.uid() = profile_id))
WITH CHECK (
    (auth.uid() = user_id OR user_id IS NULL) 
    AND (auth.uid() = profile_id OR profile_id IS NULL)
);

-- 5. Exclusão: Proprietário ou Administradores
CREATE POLICY "user_notes_delete_policy" ON public.user_notes
FOR DELETE TO authenticated
USING (
    ((auth.uid() = user_id) OR (auth.uid() = profile_id))
    OR (EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    ))
);
