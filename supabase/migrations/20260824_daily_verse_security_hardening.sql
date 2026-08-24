-- =========================================================================
-- MIGRAÇÃO DE SEGURANÇA E BLINDAGEM NUCLEAR: CARD DA MENSAGEM DO DIA
-- Data: 2026-08-24
-- =========================================================================

-- 1. RPC ATÔMICA PARA CURTIDAS NA MENSAGEM/VERSÍCULO DO DIA
CREATE OR REPLACE FUNCTION public.toggle_daily_verse_like(p_verse_id UUID)
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
    SELECT 1 FROM public.daily_verses 
    WHERE id = p_verse_id AND v_user_id::text = ANY(likes::text[])
  ) INTO v_is_liked;

  IF v_is_liked THEN
    UPDATE public.daily_verses 
    SET likes = array_remove(likes, v_user_id::text),
        likes_count = GREATEST(0, COALESCE(likes_count, 1) - 1)
    WHERE id = p_verse_id;
    RETURN FALSE;
  ELSE
    UPDATE public.daily_verses 
    SET likes = array_append(COALESCE(likes, ARRAY[]::text[]), v_user_id::text),
        likes_count = COALESCE(likes_count, 0) + 1
    WHERE id = p_verse_id;
    RETURN TRUE;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_daily_verse_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_daily_verse_like(UUID) TO service_role;


-- 2. BLINDAGEM RLS EM DAILY_VERSES (Expurgo de permissão de escrita/modificação pública)
ALTER TABLE public.daily_verses ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'daily_verses' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.daily_verses', pol.policyname);
  END LOOP;
END $$;

-- Leitura pública para todos os versículos
CREATE POLICY "daily_verses_select_policy" ON public.daily_verses 
  FOR SELECT USING (true);

-- Inserção, Atualização e Exclusão ESTRITAMENTE para Administradores ou Service Role
CREATE POLICY "daily_verses_insert_policy" ON public.daily_verses 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
    ) OR auth.role() = 'service_role'
  );

CREATE POLICY "daily_verses_update_policy" ON public.daily_verses 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
    ) OR auth.role() = 'service_role'
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
    ) OR auth.role() = 'service_role'
  );

CREATE POLICY "daily_verses_delete_policy" ON public.daily_verses 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'superadmin')
    ) OR auth.role() = 'service_role'
  );

GRANT SELECT ON TABLE public.daily_verses TO anon, authenticated;
GRANT ALL ON TABLE public.daily_verses TO service_role;

