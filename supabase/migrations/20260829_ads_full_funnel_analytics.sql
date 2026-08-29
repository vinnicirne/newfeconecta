-- =============================================================================
-- FéConecta — Migration: Funil Completo de Métricas & Conversões FéAds
-- =============================================================================

-- 1. Tabela: ad_conversions (Conversões, Vendas, Cadastros, Leads, WhatsApp)
CREATE TABLE IF NOT EXISTS public.ad_conversions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  conversion_type TEXT NOT NULL DEFAULT 'lead', -- 'lead', 'cadastro', 'venda', 'whatsapp', 'checkout'
  revenue_cents   BIGINT NOT NULL DEFAULT 0,      -- Receita gerada em centavos (ex: R$ 97,00 = 9700)
  converted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata        JSONB DEFAULT '{}'
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_ad_conversions_campaign ON public.ad_conversions(campaign_id, converted_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_conversions_user ON public.ad_conversions(user_id);

-- RLS
ALTER TABLE public.ad_conversions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_conversions_select" ON public.ad_conversions;
CREATE POLICY "ad_conversions_select" ON public.ad_conversions FOR SELECT USING (true);

DROP POLICY IF EXISTS "ad_conversions_insert" ON public.ad_conversions;
CREATE POLICY "ad_conversions_insert" ON public.ad_conversions FOR INSERT WITH CHECK (true);

-- Permissões
GRANT ALL ON TABLE public.ad_conversions TO anon, authenticated, service_role;
