-- =========================================================================
-- MIGRAÇÃO DE SEGURANÇA E BLINDAGEM NUCLEAR: MÓDULO PERFIL & IDENTIDADE
-- Data: 2026-08-24
-- =========================================================================

-- 1. TRIGGER DE PROTEÇÃO CONTRA ESCALAÇÃO DE PRIVILÉGIOS (PROFILES)
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  v_caller_id := auth.uid();
  
  -- Se chamado pelo service_role ou webhook sem JWT do usuário, permite
  IF current_user = 'service_role' OR auth.role() = 'service_role' OR v_caller_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Verifica se o chamador autenticado é administrador
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = v_caller_id AND (role = 'admin' OR role = 'superadmin' OR role = 'moderator')
  ) INTO v_is_admin;

  -- Se NÃO for admin, impede adulteração de campos sensíveis
  IF NOT v_is_admin THEN
    -- Bloquear alteração de role
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Acesso negado: Você não tem permissão para alterar seu cargo ou nível de acesso.';
    END IF;

    -- Bloquear alteração direta do selo de verificação
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified OR NEW.verification_label IS DISTINCT FROM OLD.verification_label THEN
      RAISE EXCEPTION 'Acesso negado: A verificação de perfil deve ser solicitada e homologada pela administração.';
    END IF;

    -- Bloquear manipulação manual de contadores sociais
    IF NEW.followers_count IS DISTINCT FROM OLD.followers_count OR 
       NEW.following_count IS DISTINCT FROM OLD.following_count OR 
       NEW.posts_count IS DISTINCT FROM OLD.posts_count THEN
      NEW.followers_count := OLD.followers_count;
      NEW.following_count := OLD.following_count;
      NEW.posts_count := OLD.posts_count;
    END IF;
  END IF;

  -- Atualiza o updated_at automaticamente
  NEW.updated_at := NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_protect_profile_privileged_fields ON public.profiles;
CREATE TRIGGER tr_protect_profile_privileged_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();


-- 2. BLINDAGEM RLS EM PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "profiles_select_public" ON public.profiles 
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  ) WITH CHECK (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

CREATE POLICY "profiles_delete_own" ON public.profiles 
  FOR DELETE USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin'))
  );

GRANT ALL ON TABLE public.profiles TO authenticated, service_role;
GRANT SELECT ON TABLE public.profiles TO anon;


-- 3. BLINDAGEM RLS EM VERIFICATION_REQUESTS (Proteção de Documentos & PII)
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'verification_requests' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.verification_requests', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "verification_requests_select_policy" ON public.verification_requests 
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = profile_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR role = 'moderator'))
  );

CREATE POLICY "verification_requests_insert_policy" ON public.verification_requests 
  FOR INSERT WITH CHECK (
    (auth.uid() = user_id OR (user_id IS NULL AND auth.uid() = profile_id))
  );

CREATE POLICY "verification_requests_update_policy" ON public.verification_requests 
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.uid() = profile_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR role = 'moderator'))
  ) WITH CHECK (
    auth.uid() = user_id OR 
    auth.uid() = profile_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR role = 'moderator'))
  );

CREATE POLICY "verification_requests_delete_policy" ON public.verification_requests 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR role = 'moderator'))
  );

GRANT ALL ON TABLE public.verification_requests TO authenticated, service_role;


-- 4. BLINDAGEM RLS EM STORIES (Expurgo de permissões duplicadas/permissivas)
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol RECORD;
BEGIN 
  FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'stories' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.stories', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "stories_select_policy" ON public.stories 
  FOR SELECT USING (
    expires_at > NOW() OR 
    auth.uid() = author_id OR 
    auth.uid() = user_id OR
    is_highlight = true
  );

CREATE POLICY "stories_insert_policy" ON public.stories 
  FOR INSERT WITH CHECK (
    auth.uid() = author_id OR (author_id IS NULL AND auth.uid() = user_id)
  );

CREATE POLICY "stories_update_policy" ON public.stories 
  FOR UPDATE USING (
    auth.uid() = author_id OR auth.uid() = user_id
  ) WITH CHECK (
    auth.uid() = author_id OR auth.uid() = user_id
  );

CREATE POLICY "stories_delete_policy" ON public.stories 
  FOR DELETE USING (
    auth.uid() = author_id OR 
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin' OR role = 'moderator'))
  );

GRANT ALL ON TABLE public.stories TO authenticated, service_role;
GRANT SELECT ON TABLE public.stories TO anon;

