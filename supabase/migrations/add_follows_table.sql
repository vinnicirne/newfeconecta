-- Tabela de follows (quem segue quem)
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(follower_id, following_id)
);

-- RLS
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública de follows" ON public.follows;
CREATE POLICY "Leitura pública de follows" ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON public.follows;
CREATE POLICY "Permitir inserção para usuários autenticados" ON public.follows 
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' OR 
        follower_id = '296f0f37-c8b8-4ad1-855c-4625f3f14731'
    );

DROP POLICY IF EXISTS "Permitir exclusão pelo próprio usuário" ON public.follows;
CREATE POLICY "Permitir exclusão pelo próprio usuário" ON public.follows 
    FOR DELETE USING (
        auth.uid() = follower_id OR 
        follower_id = '296f0f37-c8b8-4ad1-855c-4625f3f14731'
    );

-- Função para manter contadores de followers/following nos profiles
CREATE OR REPLACE FUNCTION sync_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE profiles SET followers_count = COALESCE(followers_count, 0) + 1 WHERE id = NEW.following_id;
        UPDATE profiles SET following_count = COALESCE(following_count, 0) + 1 WHERE id = NEW.follower_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE profiles SET followers_count = GREATEST(0, COALESCE(followers_count, 0) - 1) WHERE id = OLD.following_id;
        UPDATE profiles SET following_count = GREATEST(0, COALESCE(following_count, 0) - 1) WHERE id = OLD.follower_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_follow_counts ON public.follows;
CREATE TRIGGER tr_follow_counts
AFTER INSERT OR DELETE ON public.follows
FOR EACH ROW EXECUTE FUNCTION sync_follow_counts();
