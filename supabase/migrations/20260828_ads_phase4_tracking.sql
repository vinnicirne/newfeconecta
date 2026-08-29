-- =============================================================================
-- FéConecta — Migration: Fase 4 — Ad-serving, Tracking e Encerramento Automático
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabela: ad_impressions (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ad_impressions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  served_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable (usuários anônimos)
  format        TEXT NOT NULL,
  cost_cents    BIGINT NOT NULL DEFAULT 0,                           -- custo desta impressão em centavos (CPM rate)
  metadata      JSONB DEFAULT '{}'
);

-- ---------------------------------------------------------------------------
-- 2. Tabela: ad_clicks (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ad_clicks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id   UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  impression_id UUID REFERENCES ad_impressions(id) ON DELETE SET NULL,
  clicked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata      JSONB DEFAULT '{}'
);

-- ---------------------------------------------------------------------------
-- Índices para Performance de Serving e Analytics
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_impressions_campaign_date ON ad_impressions(campaign_id, served_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_campaign_date ON ad_clicks(campaign_id, clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_impression_id ON ad_clicks(impression_id) WHERE impression_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaigns_serving_active ON campaigns(status, formato, periodo_inicio, periodo_fim)
  WHERE status = 'ativa';

-- ---------------------------------------------------------------------------
-- 3. RPC: increment_campaign_gasto_atomic
-- Incrementa o gasto da campanha atomicamente sem race conditions
-- e retorna se o orçamento foi atingido.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_campaign_gasto_atomic(
  p_campaign_id UUID,
  p_amount      BIGINT
)
RETURNS TABLE (
  new_gasto      BIGINT,
  orcamento      BIGINT,
  budget_reached BOOLEAN,
  current_status campaign_status
) AS $$
DECLARE
  v_camp campaigns;
BEGIN
  UPDATE campaigns
  SET
    gasto = gasto + p_amount,
    updated_at = NOW()
  WHERE id = p_campaign_id
  RETURNING * INTO v_camp;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campanha_nao_encontrada:%', p_campaign_id;
  END IF;

  RETURN QUERY SELECT
    v_camp.gasto,
    v_camp.orcamento,
    (v_camp.gasto >= v_camp.orcamento),
    v_camp.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 4. RPC: close_campaign_if_eligible_atomic
-- Encerra a campanha de forma idempotente via máquina de estados
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION close_campaign_if_eligible_atomic(
  p_campaign_id UUID
)
RETURNS campaigns AS $$
DECLARE
  v_campaign campaigns;
BEGIN
  SELECT * INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campanha_nao_encontrada:%', p_campaign_id;
  END IF;

  -- Se já estiver encerrada ou reprovada, não faz nada (idempotente)
  IF v_campaign.status IN ('encerrado', 'reprovado') THEN
    RETURN v_campaign;
  END IF;

  -- Só encerra se estiver ativa ou pausada
  IF v_campaign.status IN ('ativa', 'pausado') THEN
    UPDATE campaigns
    SET
      status = 'encerrado',
      updated_at = NOW()
    WHERE id = p_campaign_id
    RETURNING * INTO v_campaign;
  END IF;

  RETURN v_campaign;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 5. RPC: close_expired_campaigns_atomic
-- Encerra todas as campanhas ativas/pausadas cuja data final já passou
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION close_expired_campaigns_atomic()
RETURNS SETOF UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  FOR v_id IN
    SELECT id FROM campaigns
    WHERE status IN ('ativa', 'pausado')
      AND periodo_fim < CURRENT_DATE
    FOR UPDATE
  LOOP
    UPDATE campaigns
    SET status = 'encerrado', updated_at = NOW()
    WHERE id = v_id;

    RETURN NEXT v_id;
  END LOOP;
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- RLS para Tracking
-- ---------------------------------------------------------------------------
ALTER TABLE ad_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_clicks ENABLE ROW LEVEL SECURITY;

-- Leitura e escrita via service role (idempotente)
DROP POLICY IF EXISTS "Service role acesso total impressions" ON ad_impressions;
CREATE POLICY "Service role acesso total impressions"
  ON ad_impressions FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role acesso total clicks" ON ad_clicks;
CREATE POLICY "Service role acesso total clicks"
  ON ad_clicks FOR ALL
  USING (true)
  WITH CHECK (true);

-- Permissões de Acesso (GRANTs)
GRANT ALL ON TABLE ad_impressions TO anon, authenticated, service_role;
GRANT ALL ON TABLE ad_clicks TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
