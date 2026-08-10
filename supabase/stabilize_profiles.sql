-- ====================================================================
-- ESTABILIZAÇÃO NUCLEAR DE PERFIS E INTEGRIDADE REFERENCIAL
-- ====================================================================

-- 1. SINCRONIZAÇÃO EM MASSA (Auth -> Profiles)
-- Garante que cada usuário no Auth tenha uma entrada correspondente no Profiles.
INSERT INTO public.profiles (
    id, 
    full_name, 
    email, 
    username, 
    role, 
    created_at,
    posts_count,
    followers_count,
    following_count
)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', email, 'Usuário FéConecta'),
    email,
    COALESCE(
        raw_user_meta_data->>'username', 
        lower(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9]', '', 'g')),
        'user_' || substr(id::text, 1, 8)
    ),
    'user',
    created_at,
    0, 0, 0
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 2. REPARAÇÃO DE USERNAMES NULOS
-- O sistema de busca (get_profile_with_state) falha se o username for nulo.
UPDATE public.profiles
SET username = lower(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9]', '', 'g'))
WHERE username IS NULL AND email IS NOT NULL;

UPDATE public.profiles
SET username = 'user_' || substr(id::text, 1, 8)
WHERE username IS NULL;

-- 3. REPARAÇÃO DE FOLLOWS ÓRFÃOS
-- Se existem registros em follows apontando para o vácuo, removemos para restaurar a FK.
DELETE FROM public.follows
WHERE follower_id NOT IN (SELECT id FROM public.profiles)
   OR following_id NOT IN (SELECT id FROM public.profiles);

-- 4. TRIGGER DE NOVOS USUÁRIOS (ROBUSTO)
-- Garante que todo novo cadastro já nasça com perfil e username.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_username TEXT;
BEGIN
    v_username := COALESCE(
        NEW.raw_user_meta_data->>'username', 
        lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '', 'g')),
        'user_' || substr(NEW.id::text, 1, 8)
    );

    INSERT INTO public.profiles (id, full_name, email, username, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Usuário FéConecta'),
        NEW.email,
        v_username,
        'user'
    )
    ON CONFLICT (id) DO UPDATE 
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        username = COALESCE(profiles.username, EXCLUDED.username);
        
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-aplicação do Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. AJUSTE DE ROLE ADMIN
UPDATE public.profiles SET role = 'admin' WHERE id = '296f0f37-c8b8-4ad1-855c-4625f3f14731';

-- 6. SINCRONIZAÇÃO DE CONTADORES
UPDATE public.profiles p
SET 
    followers_count = (SELECT count(*) FROM public.follows WHERE following_id = p.id),
    following_count = (SELECT count(*) FROM public.follows WHERE follower_id = p.id),
    posts_count = (SELECT count(*) FROM public.posts WHERE author_id = p.id);
