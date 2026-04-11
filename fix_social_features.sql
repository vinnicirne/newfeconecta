-- 1. Garante que as colunas de contagem existam na tabela posts
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'reposts_count') THEN
        ALTER TABLE posts ADD COLUMN reposts_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'comments_count') THEN
        ALTER TABLE posts ADD COLUMN comments_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'likes_count') THEN
        ALTER TABLE posts ADD COLUMN likes_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'shares_count') THEN
        ALTER TABLE posts ADD COLUMN shares_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Limpeza de dados nulos
UPDATE posts SET reposts_count = 0 WHERE reposts_count IS NULL;
UPDATE posts SET comments_count = 0 WHERE comments_count IS NULL;
UPDATE posts SET likes_count = 0 WHERE likes_count IS NULL;
UPDATE posts SET shares_count = 0 WHERE shares_count IS NULL;

-- 3. Garante que a tabela reposts existe (com profile_id conforme screenshot)
-- Se ela já existir e tiver user_id, vamos tentar lidar com isso
CREATE TABLE IF NOT EXISTS public.reposts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(post_id, profile_id)
);

-- Garantir que a coluna profile_id existe caso a tabela tenha sido criada com outro nome antes
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reposts' AND column_name = 'profile_id') THEN
        ALTER TABLE public.reposts ADD COLUMN profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Função para sincronizar contadores
CREATE OR REPLACE FUNCTION sync_counts() 
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (TG_TABLE_NAME = 'reposts') THEN
            UPDATE posts SET reposts_count = reposts_count + 1 WHERE id = NEW.post_id;
        ELSIF (TG_TABLE_NAME = 'comments') THEN
            UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (TG_TABLE_NAME = 'reposts') THEN
            UPDATE posts SET reposts_count = GREATEST(0, reposts_count - 1) WHERE id = OLD.post_id;
        ELSIF (TG_TABLE_NAME = 'comments') THEN
            UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Gatilhos
DROP TRIGGER IF EXISTS tr_reposts_count ON public.reposts;
CREATE TRIGGER tr_reposts_count
AFTER INSERT OR DELETE ON public.reposts
FOR EACH ROW EXECUTE FUNCTION sync_counts();

-- 6. Cargo admin nos perfis
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
    END IF;
END $$;

UPDATE profiles SET role = 'admin' WHERE id = '296f0f37-c8b8-4ad1-855c-4625f3f14731';

-- 7. Políticas RLS para Reposts
ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública de reposts" ON public.reposts;
CREATE POLICY "Permitir leitura pública de reposts" ON public.reposts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.reposts;
CREATE POLICY "Permitir inserção para usuários autenticados" ON public.reposts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Política de exclusão usando profile_id
DROP POLICY IF EXISTS "Permitir exclusão para o próprio usuário" ON public.reposts;
CREATE POLICY "Permitir exclusão para o próprio usuário" ON public.reposts 
    FOR DELETE USING (auth.uid() = profile_id);

-- 8. Políticas RLS para Posts (Removido user_id para evitar erro de coluna inexistente)
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura pública de posts" ON public.posts;
CREATE POLICY "Permitir leitura pública de posts" ON public.posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados em posts" ON public.posts;
CREATE POLICY "Permitir inserção para usuários autenticados em posts" ON public.posts FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permitir atualização para o dono ou admin" ON public.posts;
CREATE POLICY "Permitir atualização para o dono ou admin" ON public.posts
    FOR UPDATE USING (
        auth.uid() = author_id OR 
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );

DROP POLICY IF EXISTS "Permitir exclusão para o dono ou admin" ON public.posts;
CREATE POLICY "Permitir exclusão para o dono ou admin" ON public.posts
    FOR DELETE USING (
        auth.uid() = author_id OR 
        (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    );
