-- =============================================================================
-- FéConecta — Migration: Interações de Anúncios FéAds (Likes e Comentários)
-- =============================================================================

-- 1. Tabela: ad_likes (Likes de anúncios com ícone Flame)
CREATE TABLE IF NOT EXISTS public.ad_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(campaign_id, user_id)
);

-- 2. Tabela: ad_comments (Comentários nativos em anúncios)
CREATE TABLE IF NOT EXISTS public.ad_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.ad_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_ad_likes_campaign ON public.ad_likes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_comments_campaign ON public.ad_comments(campaign_id, created_at ASC);

-- RLS
ALTER TABLE public.ad_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_likes_select" ON public.ad_likes;
CREATE POLICY "ad_likes_select" ON public.ad_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "ad_likes_insert" ON public.ad_likes;
CREATE POLICY "ad_likes_insert" ON public.ad_likes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ad_likes_delete" ON public.ad_likes;
CREATE POLICY "ad_likes_delete" ON public.ad_likes FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ad_comments_select" ON public.ad_comments;
CREATE POLICY "ad_comments_select" ON public.ad_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "ad_comments_insert" ON public.ad_comments;
CREATE POLICY "ad_comments_insert" ON public.ad_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ad_comments_delete" ON public.ad_comments;
CREATE POLICY "ad_comments_delete" ON public.ad_comments FOR DELETE USING (auth.uid() = user_id);

-- Permissões
GRANT ALL ON TABLE public.ad_likes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.ad_comments TO anon, authenticated, service_role;
