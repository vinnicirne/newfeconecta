-- =============================================================================
-- FéConecta — Migration: FéConecta Pixel & Conversions API (CAPI)
-- =============================================================================

-- 1. Tabela: ad_pixel_events (Eventos de Pixel e Conversões CAPI)
CREATE TABLE IF NOT EXISTS public.ad_pixel_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pixel_id        TEXT NOT NULL,                      -- Ex: FC-8F72A91 (gerado para o parceiro)
  partner_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id     UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  event_name      TEXT NOT NULL,                      -- 'PageView', 'ViewContent', 'AddToCart', 'Lead', 'Purchase'
  event_id        TEXT,                               -- Identificador único para desduplicação (dedup)
  value_cents     BIGINT DEFAULT 0,                   -- Valor da transação em centavos (ex: 14990 = R$ 149,90)
  currency        TEXT DEFAULT 'BRL',
  order_id        TEXT,                               -- ID do pedido no e-commerce / checkout
  client_ip       TEXT,
  user_agent      TEXT,
  url             TEXT,
  referrer        TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_ad_pixel_events_campaign ON public.ad_pixel_events(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_pixel_events_pixel ON public.ad_pixel_events(pixel_id, event_name);
CREATE INDEX IF NOT EXISTS idx_ad_pixel_events_dedup ON public.ad_pixel_events(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_pixel_events_partner ON public.ad_pixel_events(partner_id);

-- RLS
ALTER TABLE public.ad_pixel_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_pixel_events_select" ON public.ad_pixel_events;
CREATE POLICY "ad_pixel_events_select" ON public.ad_pixel_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "ad_pixel_events_insert" ON public.ad_pixel_events;
CREATE POLICY "ad_pixel_events_insert" ON public.ad_pixel_events FOR INSERT WITH CHECK (true);

-- Permissões
GRANT ALL ON TABLE public.ad_pixel_events TO anon, authenticated, service_role;
