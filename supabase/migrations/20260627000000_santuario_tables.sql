-- Migration: O Santuário (Creator Economy + Devocionais)
-- Tabelas e Políticas RLS

-- 1. Tabela: Jornadas do Santuário (As Trilhas de Estudo/Devocional)
CREATE TABLE IF NOT EXISTS public.sanctuary_journeys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    author_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    is_published BOOLEAN DEFAULT false,
    requires_approval BOOLEAN DEFAULT false, -- Monetização futura requer aprovação da moderação
    price NUMERIC(10,2) DEFAULT 0.00, -- Preparado para futuro (Monetização)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela: Capítulos do Santuário (Os Dias / Módulos)
CREATE TABLE IF NOT EXISTS public.sanctuary_chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID REFERENCES public.sanctuary_journeys(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_blocks JSONB NOT NULL DEFAULT '[]'::jsonb, -- Armazena blocos Notion-like (Texto, Versículo, Áudio)
    audio_url TEXT, -- Opcional áudio narrativo
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela: Progresso e Altar Digital
CREATE TABLE IF NOT EXISTS public.sanctuary_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    chapter_id UUID REFERENCES public.sanctuary_chapters(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    prayer_response TEXT, -- Oração opcional de reflexão (A Chama do Altar)
    UNIQUE(user_id, chapter_id)
);


-- ==========================================================
-- ROW LEVEL SECURITY (RLS) - SECURITY REVIEW
-- ==========================================================

ALTER TABLE public.sanctuary_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanctuary_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanctuary_progress ENABLE ROW LEVEL SECURITY;

-- REGRAS: sanctuary_journeys
-- Leitura Pública: Todos podem ler jornadas publicadas
CREATE POLICY "Public can read published journeys" ON public.sanctuary_journeys
    FOR SELECT USING (is_published = true);

-- Leitura Autoral: O criador pode ler suas próprias jornadas (mesmo rascunhos)
CREATE POLICY "Authors can read own journeys" ON public.sanctuary_journeys
    FOR SELECT USING (auth.uid() = author_id);

-- Escrita/Atualização Autoral (APENAS VERIFICADOS):
-- Impede criação se profile is_verified não for true
CREATE POLICY "Verified users can insert journeys" ON public.sanctuary_journeys
    FOR INSERT WITH CHECK (
        auth.uid() = author_id 
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_verified = true)
    );

CREATE POLICY "Authors can update own journeys" ON public.sanctuary_journeys
    FOR UPDATE USING (
        auth.uid() = author_id
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_verified = true)
    );

CREATE POLICY "Authors can delete own journeys" ON public.sanctuary_journeys
    FOR DELETE USING (auth.uid() = author_id);


-- REGRAS: sanctuary_chapters
-- Leitura Pública: Todos podem ler capítulos de jornadas publicadas
CREATE POLICY "Public can read chapters of published journeys" ON public.sanctuary_chapters
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.sanctuary_journeys j WHERE j.id = journey_id AND j.is_published = true)
    );

-- Leitura Autoral
CREATE POLICY "Authors can read own chapters" ON public.sanctuary_chapters
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.sanctuary_journeys j WHERE j.id = journey_id AND j.author_id = auth.uid())
    );

-- Modificação Autoral (Só o dono da jornada edita os capítulos)
CREATE POLICY "Authors can insert chapters" ON public.sanctuary_chapters
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.sanctuary_journeys j WHERE j.id = journey_id AND j.author_id = auth.uid())
    );
CREATE POLICY "Authors can update chapters" ON public.sanctuary_chapters
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.sanctuary_journeys j WHERE j.id = journey_id AND j.author_id = auth.uid())
    );
CREATE POLICY "Authors can delete chapters" ON public.sanctuary_chapters
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.sanctuary_journeys j WHERE j.id = journey_id AND j.author_id = auth.uid())
    );


-- REGRAS: sanctuary_progress
-- Leitura do Usuário: Somente o próprio usuário vê seu progresso (Altar privado)
CREATE POLICY "Users can read own progress" ON public.sanctuary_progress
    FOR SELECT USING (auth.uid() = user_id);

-- Inserção/Atualização: Somente o próprio usuário atualiza seu progresso
CREATE POLICY "Users can insert own progress" ON public.sanctuary_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.sanctuary_progress
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress" ON public.sanctuary_progress
    FOR DELETE USING (auth.uid() = user_id);
