-- FIX: Sincronização de Perfis e Reparação de Órfãos
-- Execute este script no SQL Editor do Supabase para resolver erros de FK (23503)

-- 1. Garante que todos os usuários em auth.users tenham um perfil
INSERT INTO public.profiles (id, full_name, email, role, created_at)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'full_name', email, 'Usuário FéConecta'),
    email,
    'user',
    created_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 2. Repara posts órfãos (casos raros onde o autor não está nem no auth.users)
-- Cria um perfil "Sistema" para manter a integridade referencial se necessário
INSERT INTO public.profiles (id, full_name, username, role)
SELECT DISTINCT 
    author_id, 
    'Usuário Antigo', 
    'usuario_' || substr(author_id::text, 1, 8),
    'user'
FROM public.posts
WHERE author_id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 3. Garante que as colunas de notificação existam
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notify_likes') THEN
        ALTER TABLE public.profiles ADD COLUMN notify_likes BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notify_comments') THEN
        ALTER TABLE public.profiles ADD COLUMN notify_comments BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notify_follows') THEN
        ALTER TABLE public.profiles ADD COLUMN notify_follows BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'notify_reposts') THEN
        ALTER TABLE public.profiles ADD COLUMN notify_reposts BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 4. Atualiza o trigger de novos usuários para ser mais resiliente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-aplicar o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Finalizar: Sincronizar contadores básicos
UPDATE public.profiles p
SET posts_count = (SELECT count(*) FROM public.posts WHERE author_id = p.id);
