-- ==============================================================================
-- 🛡️ MIGRAÇÃO DE SEGURANÇA NUCLEAR: SUBSISTEMA DE IGREJAS & CÉLULAS (FÉCONECTA)
-- ==============================================================================

-- 1. Habilitar RLS em todas as tabelas
ALTER TABLE IF EXISTS churches ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS church_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS church_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS church_groups ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas/permissivas em churches
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'churches'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON churches;', pol.policyname);
    END LOOP;
END $$;

-- Novas Políticas Atômicas em `churches`
CREATE POLICY "churches_select_public_policy"
ON churches
FOR SELECT
TO public
USING (true);

CREATE POLICY "churches_insert_authenticated_policy"
ON churches
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL AND
    (pastor_id = auth.uid() OR pastor_id IS NULL)
);

CREATE POLICY "churches_update_leadership_policy"
ON churches
FOR UPDATE
TO authenticated
USING (
    pastor_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM church_members
        WHERE church_members.church_id = churches.id
          AND church_members.user_id = auth.uid()
          AND church_members.approved = true
          AND church_members.role IN ('admin', 'pastor')
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
)
WITH CHECK (
    pastor_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM church_members
        WHERE church_members.church_id = churches.id
          AND church_members.user_id = auth.uid()
          AND church_members.approved = true
          AND church_members.role IN ('admin', 'pastor')
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
);

CREATE POLICY "churches_delete_admin_policy"
ON churches
FOR DELETE
TO authenticated
USING (
    pastor_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
);

-- 3. Limpar políticas antigas em `church_members`
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'church_members'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON church_members;', pol.policyname);
    END LOOP;
END $$;

-- Novas Políticas Atômicas em `church_members`
CREATE POLICY "church_members_select_policy"
ON church_members
FOR SELECT
TO public
USING (
    approved = true 
    OR user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM churches
        WHERE churches.id = church_members.church_id
          AND churches.pastor_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM church_members cm
        WHERE cm.church_id = church_members.church_id
          AND cm.user_id = auth.uid()
          AND cm.approved = true
          AND cm.role IN ('admin', 'pastor')
    )
);

CREATE POLICY "church_members_insert_policy"
ON church_members
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM churches
        WHERE churches.id = church_members.church_id
          AND churches.pastor_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM church_members cm
        WHERE cm.church_id = church_members.church_id
          AND cm.user_id = auth.uid()
          AND cm.approved = true
          AND cm.role IN ('admin', 'pastor')
    )
);

CREATE POLICY "church_members_update_leadership_policy"
ON church_members
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM churches
        WHERE churches.id = church_members.church_id
          AND churches.pastor_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM church_members cm
        WHERE cm.church_id = church_members.church_id
          AND cm.user_id = auth.uid()
          AND cm.approved = true
          AND cm.role IN ('admin', 'pastor')
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM churches
        WHERE churches.id = church_members.church_id
          AND churches.pastor_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM church_members cm
        WHERE cm.church_id = church_members.church_id
          AND cm.user_id = auth.uid()
          AND cm.approved = true
          AND cm.role IN ('admin', 'pastor')
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
);

CREATE POLICY "church_members_delete_policy"
ON church_members
FOR DELETE
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM churches
        WHERE churches.id = church_members.church_id
          AND churches.pastor_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM church_members cm
        WHERE cm.church_id = church_members.church_id
          AND cm.user_id = auth.uid()
          AND cm.approved = true
          AND cm.role IN ('admin', 'pastor')
    )
    OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
    )
);

-- 4. Limpar políticas antigas em `church_join_requests` se a tabela existir
DO $$
DECLARE
    pol RECORD;
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'church_join_requests') THEN
        ALTER TABLE church_join_requests ENABLE ROW LEVEL SECURITY;
        FOR pol IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = 'church_join_requests'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON church_join_requests;', pol.policyname);
        END LOOP;
        
        EXECUTE '
        CREATE POLICY "church_join_requests_select_policy"
        ON church_join_requests
        FOR SELECT
        TO authenticated
        USING (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM church_members cm
                WHERE cm.church_id = church_join_requests.church_id
                  AND cm.user_id = auth.uid()
                  AND cm.approved = true
                  AND cm.role IN (''admin'', ''pastor'')
            )
            OR EXISTS (
                SELECT 1 FROM churches
                WHERE churches.id = church_join_requests.church_id
                  AND churches.pastor_id = auth.uid()
            )
        );

        CREATE POLICY "church_join_requests_insert_policy"
        ON church_join_requests
        FOR INSERT
        TO authenticated
        WITH CHECK (user_id = auth.uid());

        CREATE POLICY "church_join_requests_update_policy"
        ON church_join_requests
        FOR UPDATE
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM church_members cm
                WHERE cm.church_id = church_join_requests.church_id
                  AND cm.user_id = auth.uid()
                  AND cm.approved = true
                  AND cm.role IN (''admin'', ''pastor'')
            )
            OR EXISTS (
                SELECT 1 FROM churches
                WHERE churches.id = church_join_requests.church_id
                  AND churches.pastor_id = auth.uid()
            )
        );

        CREATE POLICY "church_join_requests_delete_policy"
        ON church_join_requests
        FOR DELETE
        TO authenticated
        USING (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM church_members cm
                WHERE cm.church_id = church_join_requests.church_id
                  AND cm.user_id = auth.uid()
                  AND cm.approved = true
                  AND cm.role IN (''admin'', ''pastor'')
            )
        );';
    END IF;
END $$;
