-- =========================================================================
-- MIGRAÇÃO DE SEGURANÇA E BLINDAGEM NUCLEAR: MÓDULO DE NOTIFICAÇÕES
-- Data: 2026-08-24
-- =========================================================================

-- 1. BLINDAGEM RLS EM NOTIFICATIONS
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
  FOR SELECT USING (
    auth.uid() = recipient_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

CREATE POLICY "notifications_insert_policy" ON public.notifications 
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')) OR
    (auth.role() = 'service_role')
  );

CREATE POLICY "notifications_update_policy" ON public.notifications 
  FOR UPDATE USING (
    auth.uid() = recipient_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  ) WITH CHECK (
    auth.uid() = recipient_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

CREATE POLICY "notifications_delete_policy" ON public.notifications 
  FOR DELETE USING (
    auth.uid() = recipient_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

GRANT ALL ON TABLE public.notifications TO authenticated, service_role;


-- 2. RPC ATÔMICA: get_my_notifications
CREATE OR REPLACE FUNCTION public.get_my_notifications(
    p_user_id UUID DEFAULT NULL, 
    p_limit INT DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    recipient_id UUID,
    sender_id UUID,
    type text,
    post_id UUID,
    story_id UUID,
    content TEXT,
    title TEXT,
    is_read BOOLEAN,
    created_at TIMESTAMPTZ,
    metadata JSONB,
    sender_name TEXT,
    sender_avatar TEXT,
    sender_username TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_target_user UUID;
BEGIN
    v_target_user := COALESCE(p_user_id, auth.uid());
    
    IF v_target_user IS NULL THEN
        RETURN;
    END IF;

    -- Validação de Segurança: Apenas o próprio usuário ou administradores podem consultar
    IF auth.uid() IS NOT NULL AND auth.uid() <> v_target_user THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
        ) THEN
            RAISE EXCEPTION 'Acesso negado: Você não pode consultar notificações de outro usuário.';
        END IF;
    END IF;

    RETURN QUERY
    SELECT 
        n.id,
        n.recipient_id,
        n.sender_id,
        n.type::text,
        n.post_id,
        n.story_id,
        n.content,
        n.title,
        n.is_read,
        n.created_at,
        n.metadata,
        p.full_name AS sender_name,
        p.avatar_url AS sender_avatar,
        p.username AS sender_username
    FROM public.notifications n
    LEFT JOIN public.profiles p ON p.id = n.sender_id
    WHERE n.recipient_id = v_target_user
    ORDER BY n.created_at DESC
    LIMIT LEAST(p_limit, 100);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_notifications(UUID, INT) TO authenticated, service_role;


-- 3. RPC ATÔMICA: mark_all_notifications_as_read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_as_read()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    UPDATE public.notifications
    SET is_read = true
    WHERE recipient_id = v_user_id AND is_read = false;

    RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_all_notifications_as_read() TO authenticated, service_role;

