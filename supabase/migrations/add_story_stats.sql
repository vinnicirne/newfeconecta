CREATE TABLE IF NOT EXISTS public.story_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
    viewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(story_id, viewer_id)
);

CREATE TABLE IF NOT EXISTS public.story_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    story_id UUID REFERENCES public.stories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(story_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;

-- Políticas de Visualizações (Views)
DROP POLICY IF EXISTS "Leitura publica de views de stories" ON public.story_views;
CREATE POLICY "Leitura publica de views de stories" ON public.story_views 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insercao de views de stories autenticado" ON public.story_views;
CREATE POLICY "Insercao de views de stories autenticado" ON public.story_views 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas de Curtidas (Likes)
DROP POLICY IF EXISTS "Leitura publica de likes de stories" ON public.story_likes;
CREATE POLICY "Leitura publica de likes de stories" ON public.story_likes 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insercao de likes de stories autenticado" ON public.story_likes;
CREATE POLICY "Insercao de likes de stories autenticado" ON public.story_likes 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Remocao de likes pelo proprietario" ON public.story_likes;
CREATE POLICY "Remocao de likes pelo proprietario" ON public.story_likes 
    FOR DELETE USING (auth.uid() = user_id);
