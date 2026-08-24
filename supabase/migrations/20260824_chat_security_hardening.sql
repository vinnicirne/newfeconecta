-- ==============================================================================
-- MIGRAÇÃO DE SEGURANÇA NUCLEAR: CHAT & MENSAGENS DIRETAS (/messages & /chat)
-- Data: 2026-08-24
-- ==============================================================================

-- 1. Hardening RPC get_my_conversations (Prevenção de IDOR e vazamento de histórico)
CREATE OR REPLACE FUNCTION public.get_my_conversations(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    conversations_data json;
    v_caller_id uuid := auth.uid();
BEGIN
    -- Validação Estrita de Identidade (Prevenção de IDOR)
    IF v_caller_id IS NOT NULL AND v_caller_id != p_user_id THEN
        -- Permitir apenas se for admin/superadmin
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = v_caller_id AND (role = 'admin' OR role = 'superadmin')
        ) THEN
            RAISE EXCEPTION 'Acesso negado: Você não tem permissão para visualizar conversas de outro usuário.';
        END IF;
    END IF;

    SELECT json_agg(t) INTO conversations_data FROM (
        WITH ranked_messages AS (
            SELECT 
                *,
                ROW_NUMBER() OVER (
                    PARTITION BY 
                        CASE WHEN sender_id < receiver_id THEN sender_id ELSE receiver_id END,
                        CASE WHEN sender_id < receiver_id THEN receiver_id ELSE sender_id END
                    ORDER BY created_at DESC
                ) as rn
            FROM public.direct_messages
            WHERE sender_id = p_user_id OR receiver_id = p_user_id
        ),
        last_messages AS (
            SELECT * FROM ranked_messages WHERE rn = 1
        ),
        unread_counts AS (
            SELECT 
                sender_id as partner_id,
                COUNT(*) as unread_count
            FROM public.direct_messages
            WHERE receiver_id = p_user_id AND is_read = false
            GROUP BY sender_id
        )
        SELECT 
            p.id as id,
            p.full_name as name,
            p.avatar_url as avatar,
            lm.content as "lastMessage",
            lm.created_at as time,
            COALESCE(uc.unread_count, 0) as unread,
            lm.sender_id as sender_id,
            lm.is_read as is_read,
            CASE WHEN p.last_seen > (now() - interval '5 minutes') THEN true ELSE false END as is_online
        FROM last_messages lm
        JOIN public.profiles p ON p.id = (CASE WHEN lm.sender_id = p_user_id THEN lm.receiver_id ELSE lm.sender_id END)
        LEFT JOIN unread_counts uc ON uc.partner_id = (CASE WHEN lm.sender_id = p_user_id THEN lm.receiver_id ELSE lm.sender_id END)
        ORDER BY lm.created_at DESC
    ) t;

    RETURN COALESCE(conversations_data, '[]'::json);
END;
$$;

-- 2. Hardening RPC get_chat_history (Prevenção de IDOR)
CREATE OR REPLACE FUNCTION public.get_chat_history(
    p_user_id uuid,
    p_other_id uuid,
    p_limit int DEFAULT 50
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    history_data json;
    v_caller_id uuid := auth.uid();
BEGIN
    -- Validação Estrita de Identidade (Prevenção de IDOR)
    IF v_caller_id IS NOT NULL AND v_caller_id != p_user_id AND v_caller_id != p_other_id THEN
        -- Permitir apenas se for admin/superadmin
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = v_caller_id AND (role = 'admin' OR role = 'superadmin')
        ) THEN
            RAISE EXCEPTION 'Acesso negado: Você não tem permissão para visualizar este histórico de conversa.';
        END IF;
    END IF;

    SELECT json_agg(t) INTO history_data FROM (
        SELECT * FROM public.direct_messages
        WHERE (sender_id = p_user_id AND receiver_id = p_other_id)
           OR (sender_id = p_other_id AND receiver_id = p_user_id)
        ORDER BY created_at DESC
        LIMIT p_limit
    ) t;

    RETURN COALESCE(history_data, '[]'::json);
END;
$$;

-- 3. Blindagem RLS na tabela direct_messages
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Privacidade Absoluta: Acesso a conversas próprias" ON public.direct_messages;
DROP POLICY IF EXISTS "Privacidade Absoluta: Acesso a conversas prprias" ON public.direct_messages;
DROP POLICY IF EXISTS "direct_messages_select_policy" ON public.direct_messages;
CREATE POLICY "direct_messages_select_policy" ON public.direct_messages
FOR SELECT TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Privacidade Absoluta: Envio de mensagens próprias" ON public.direct_messages;
DROP POLICY IF EXISTS "Privacidade Absoluta: Envio de mensagens prprias" ON public.direct_messages;
DROP POLICY IF EXISTS "direct_messages_insert_policy" ON public.direct_messages;
CREATE POLICY "direct_messages_insert_policy" ON public.direct_messages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Privacidade Absoluta: Marcar como lido" ON public.direct_messages;
DROP POLICY IF EXISTS "direct_messages_update_policy" ON public.direct_messages;
CREATE POLICY "direct_messages_update_policy" ON public.direct_messages
FOR UPDATE TO authenticated
USING (auth.uid() = receiver_id)
WITH CHECK (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Usuários excluem suas mensagens" ON public.direct_messages;
DROP POLICY IF EXISTS "Usurios excluem suas mensagens" ON public.direct_messages;
DROP POLICY IF EXISTS "direct_messages_delete_policy" ON public.direct_messages;
CREATE POLICY "direct_messages_delete_policy" ON public.direct_messages
FOR DELETE TO authenticated
USING (auth.uid() = sender_id);

-- 4. Blindagem RLS na tabela legada messages (limpeza de políticas abertas SELECT true)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chat visibility" ON public.messages;
DROP POLICY IF EXISTS "Room messages are visible to participants" ON public.messages;
DROP POLICY IF EXISTS "messages_select_public" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_auth" ON public.messages;
DROP POLICY IF EXISTS "Anyone can message" ON public.messages;
DROP POLICY IF EXISTS "Anyone can send messages in a room" ON public.messages;
DROP POLICY IF EXISTS "messages_select_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_policy" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_policy" ON public.messages;

CREATE POLICY "messages_select_policy" ON public.messages
FOR SELECT TO authenticated
USING (
    auth.uid() = user_id 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    )
);

CREATE POLICY "messages_insert_policy" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "messages_delete_policy" ON public.messages
FOR DELETE TO authenticated
USING (
    auth.uid() = user_id 
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    )
);
