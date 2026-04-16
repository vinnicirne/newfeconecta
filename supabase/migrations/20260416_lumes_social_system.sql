-- Migração para o Sistema Social Lumes (Republicação e Salvamento)
-- Data: 2026-04-16

-- 1. Tabela de Republicações
CREATE TABLE IF NOT EXISTS public.reposts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(post_id, profile_id)
);

-- 2. Tabela de Posts Salvos
CREATE TABLE IF NOT EXISTS public.saved_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(post_id, user_id)
);

-- 3. Adição de contadores na tabela posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS reposts_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS saved_count INTEGER DEFAULT 0;

-- 4. RLS para Segurança
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

-- Políticas de Repost
DROP POLICY IF EXISTS "Leitura pública de reposts" ON public.reposts;
CREATE POLICY "Leitura pública de reposts" ON public.reposts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Inserção por usuários autenticados" ON public.reposts;
CREATE POLICY "Inserção por usuários autenticados" ON public.reposts 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Exclusão pelo proprietário" ON public.reposts;
CREATE POLICY "Exclusão pelo proprietário" ON public.reposts 
    FOR DELETE USING (auth.uid() = profile_id OR profile_id = '296f0f37-c8b8-4ad1-855c-4625f3f14731');

-- Políticas de Saved
DROP POLICY IF EXISTS "Leitura privada de salvos" ON public.saved_posts;
CREATE POLICY "Leitura privada de salvos" ON public.saved_posts FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Salvamento por usuários autenticados" ON public.saved_posts;
CREATE POLICY "Salvamento por usuários autenticados" ON public.saved_posts 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Remoção de salvos pelo proprietário" ON public.saved_posts;
CREATE POLICY "Remoção de salvos pelo proprietário" ON public.saved_posts 
    FOR DELETE USING (auth.uid() = user_id OR user_id = '296f0f37-c8b8-4ad1-855c-4625f3f14731');

-- 5. Automação de Contadores (Triggers)
CREATE OR REPLACE FUNCTION sync_post_social_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_TABLE_NAME = 'reposts') THEN
        IF (TG_OP = 'INSERT') THEN
            UPDATE posts SET reposts_count = COALESCE(reposts_count, 0) + 1 WHERE id = NEW.post_id;
        ELSIF (TG_OP = 'DELETE') THEN
            UPDATE posts SET reposts_count = GREATEST(0, COALESCE(reposts_count, 0) - 1) WHERE id = OLD.post_id;
        END IF;
    ELSIF (TG_TABLE_NAME = 'saved_posts') THEN
        IF (TG_OP = 'INSERT') THEN
            UPDATE posts SET saved_count = COALESCE(saved_count, 0) + 1 WHERE id = NEW.post_id;
        ELSIF (TG_OP = 'DELETE') THEN
            UPDATE posts SET saved_count = GREATEST(0, COALESCE(saved_count, 0) - 1) WHERE id = OLD.post_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_reposts_sync ON public.reposts;
CREATE TRIGGER tr_reposts_sync AFTER INSERT OR DELETE ON public.reposts FOR EACH ROW EXECUTE FUNCTION sync_post_social_stats();

DROP TRIGGER IF EXISTS tr_saved_sync ON public.saved_posts;
CREATE TRIGGER tr_saved_sync AFTER INSERT OR DELETE ON public.saved_posts FOR EACH ROW EXECUTE FUNCTION sync_post_social_stats();
