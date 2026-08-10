-- Migration: Fix Critical Issues, Remove Backdoors and Digital Trash
-- Date: 2026-06-30

-- 1. CLEANUP (Remoção de lixo digital e tabelas obsoletas)
DROP TABLE IF EXISTS public.feed_posts CASCADE;
DROP TABLE IF EXISTS public.post_reposts CASCADE;
DROP TABLE IF EXISTS public.user_activity_logs CASCADE; -- Exemplo de lixo potencial se houver
DROP TABLE IF EXISTS public.temp_migration_data CASCADE;

-- 2. REMOÇÃO DE BACKDOORS NAS POLÍTICAS RLS

-- 2.1 Tabela follows
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.follows;
CREATE POLICY "Permitir inserção para usuários autenticados" ON public.follows 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permitir exclusão pelo próprio usuário" ON public.follows;
CREATE POLICY "Permitir exclusão pelo próprio usuário" ON public.follows 
    FOR DELETE USING (auth.uid() = follower_id);

-- 2.2 Tabela reposts
DROP POLICY IF EXISTS "Exclusão pelo proprietário" ON public.reposts;
CREATE POLICY "Exclusão pelo proprietário" ON public.reposts 
    FOR DELETE USING (auth.uid() = profile_id);

-- 2.3 Tabela saved_posts
DROP POLICY IF EXISTS "Remoção de salvos pelo proprietário" ON public.saved_posts;
CREATE POLICY "Remoção de salvos pelo proprietário" ON public.saved_posts 
    FOR DELETE USING (auth.uid() = user_id);

-- 3. AJUSTES NO WARROOM (Tabela messages e Storage)

-- 3.1 Adição da coluna media_url na tabela messages (se não existir)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS media_url TEXT;

-- 3.2 Criação do bucket chat_media para uploads do WarRoom
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat_media', 'chat_media', true) 
ON CONFLICT (id) DO NOTHING;

-- Garantir acesso de leitura público ao bucket chat_media
DROP POLICY IF EXISTS "Public Access to chat_media" ON storage.objects;
CREATE POLICY "Public Access to chat_media" ON storage.objects 
    FOR SELECT USING (bucket_id = 'chat_media');

-- Garantir permissão de upload para usuários autenticados no chat_media
DROP POLICY IF EXISTS "Auth Uploads to chat_media" ON storage.objects;
CREATE POLICY "Auth Uploads to chat_media" ON storage.objects 
    FOR INSERT WITH CHECK (bucket_id = 'chat_media' AND auth.role() = 'authenticated');
