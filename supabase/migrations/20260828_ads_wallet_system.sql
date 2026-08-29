-- =============================================================================
-- FéConecta — Migration: Sistema de Ads / Campanhas + Carteira v2.0
-- 
-- Executar no Supabase SQL Editor ou via psql na VPS
-- ORDEM IMPORTA: wallets → wallet_transactions → refund_requests → campaigns
-- Em seguida: RPCs (funções transacionais)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tabela: wallets
-- Uma carteira por parceiro (partner_id = profiles.id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  saldo_disponivel  BIGINT NOT NULL DEFAULT 0 CHECK (saldo_disponivel >= 0),
  saldo_investido   BIGINT NOT NULL DEFAULT 0 CHECK (saldo_investido >= 0),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para lookup por partner_id (frequente)
CREATE INDEX IF NOT EXISTS idx_wallets_partner_id ON wallets(partner_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wallets_updated_at ON wallets;
CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Tabela: wallet_transactions (ledger append-only)
-- NUNCA fazer DELETE ou UPDATE nesta tabela — somente INSERT
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE wallet_transaction_type AS ENUM (
    'recarga',
    'debito_campanha',
    'estorno_reprovacao',
    'reembolso'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id     UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  tipo          wallet_transaction_type NOT NULL,
  valor         BIGINT NOT NULL CHECK (valor > 0),  -- sempre positivo (centavos)
  campaign_id   UUID,                                               -- FK adicionada abaixo, após criar campaigns
  payment_id    TEXT,                                               -- payment_id MELI
  meta          JSONB,                                              -- dados extras
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- SEM updated_at: append-only, linha nunca é modificada
);

-- Índices para queries de analytics e extrato
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet_created ON wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_payment_id ON wallet_transactions(payment_id) WHERE payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallet_tx_campaign_id ON wallet_transactions(campaign_id) WHERE campaign_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Tabela: refund_requests
-- Solicitações de reembolso do parceiro → aprovação do admin
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE refund_request_status AS ENUM (
    'aguardando',
    'aprovado',
    'rejeitado',
    'falhou'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS refund_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id        UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  valor            BIGINT NOT NULL CHECK (valor > 0),
  status           refund_request_status NOT NULL DEFAULT 'aguardando',
  mp_refund_id     TEXT,
  motivo_rejeicao  TEXT,
  meta             JSONB,
  solicitado_em    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processado_em    TIMESTAMPTZ,
  admin_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_refund_wallet_id ON refund_requests(wallet_id);
CREATE INDEX IF NOT EXISTS idx_refund_status ON refund_requests(status) WHERE status = 'aguardando';

-- ---------------------------------------------------------------------------
-- 4. Tabela: campaigns
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM (
    'rascunho',
    'pendente',
    'ativa',
    'pausado',
    'reprovado',
    'encerrado'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE campaign_format AS ENUM ('feed', 'stories', 'banner');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE campaign_objective AS ENUM ('alcance', 'cliques', 'conversoes');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS campaigns (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  formato           campaign_format NOT NULL,
  objetivo          campaign_objective NOT NULL,
  orcamento         BIGINT NOT NULL CHECK (orcamento > 0),  -- centavos
  gasto             BIGINT NOT NULL DEFAULT 0,               -- centavos
  status            campaign_status NOT NULL DEFAULT 'pendente',
  periodo_inicio    DATE NOT NULL,
  periodo_fim       DATE NOT NULL CHECK (periodo_fim >= periodo_inicio),
  publico           JSONB NOT NULL DEFAULT '{}',
  criativo_url      TEXT,
  criativo_tipo     TEXT CHECK (criativo_tipo IN ('imagem', 'video')),
  call_to_action    TEXT,
  texto             TEXT,
  motivo_reprovacao TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_partner_id ON campaigns(partner_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_serving ON campaigns(status, formato, periodo_fim)
  WHERE status = 'ativa';  -- índice parcial para ad-serving

-- FK de wallet_transactions.campaign_id → campaigns (adicionada de forma idempotente)
DO $$ BEGIN
  ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS fk_wallet_tx_campaign;
  ALTER TABLE wallet_transactions
    ADD CONSTRAINT fk_wallet_tx_campaign
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- 5. RPCs — Funções transacionais (o coração do ledger)
--
-- Cada função executa em uma única transação de banco:
-- UPDATE do saldo + INSERT na wallet_transactions
-- ---------------------------------------------------------------------------

-- 5.1 wallet_credit_recarga
-- Webhook MP aprovado → +disponível
CREATE OR REPLACE FUNCTION wallet_credit_recarga(
  p_wallet_id  UUID,
  p_valor      BIGINT,
  p_payment_id TEXT
)
RETURNS wallet_transactions AS $$
DECLARE
  v_tx wallet_transactions;
BEGIN
  -- Incrementa saldo disponível com lock de linha
  UPDATE wallets
  SET saldo_disponivel = saldo_disponivel + p_valor
  WHERE id = p_wallet_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carteira não encontrada: %', p_wallet_id;
  END IF;

  -- Registra transação no ledger
  INSERT INTO wallet_transactions (wallet_id, tipo, valor, payment_id)
  VALUES (p_wallet_id, 'recarga', p_valor, p_payment_id)
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.2 wallet_debit_campanha
-- Admin aprova campanha → -disponível +investido (com lock)
CREATE OR REPLACE FUNCTION wallet_debit_campanha(
  p_wallet_id   UUID,
  p_campaign_id UUID,
  p_valor       BIGINT
)
RETURNS wallet_transactions AS $$
DECLARE
  v_wallet wallets;
  v_tx     wallet_transactions;
BEGIN
  -- Lock pessimista na linha da wallet
  SELECT * INTO v_wallet
  FROM wallets
  WHERE id = p_wallet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carteira não encontrada: %', p_wallet_id;
  END IF;

  IF v_wallet.saldo_disponivel < p_valor THEN
    RAISE EXCEPTION 'saldo insuficiente: disponível=%, necessário=%',
      v_wallet.saldo_disponivel, p_valor;
  END IF;

  -- Atualiza saldos atomicamente
  UPDATE wallets
  SET
    saldo_disponivel = saldo_disponivel - p_valor,
    saldo_investido  = saldo_investido  + p_valor
  WHERE id = p_wallet_id;

  -- Registra no ledger
  INSERT INTO wallet_transactions (wallet_id, tipo, valor, campaign_id)
  VALUES (p_wallet_id, 'debito_campanha', p_valor, p_campaign_id)
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.3 wallet_credit_estorno_reprovacao
-- Admin reprova campanha → +disponível (SEM chamar MELI)
CREATE OR REPLACE FUNCTION wallet_credit_estorno_reprovacao(
  p_wallet_id   UUID,
  p_campaign_id UUID,
  p_valor       BIGINT
)
RETURNS wallet_transactions AS $$
DECLARE
  v_tx wallet_transactions;
BEGIN
  UPDATE wallets
  SET saldo_disponivel = saldo_disponivel + p_valor
  WHERE id = p_wallet_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carteira não encontrada: %', p_wallet_id;
  END IF;

  INSERT INTO wallet_transactions (wallet_id, tipo, valor, campaign_id)
  VALUES (p_wallet_id, 'estorno_reprovacao', p_valor, p_campaign_id)
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.4 wallet_debit_reembolso
-- Admin aprova refund request + MELI OK → -disponível
CREATE OR REPLACE FUNCTION wallet_debit_reembolso(
  p_wallet_id          UUID,
  p_valor              BIGINT,
  p_refund_request_id  UUID
)
RETURNS wallet_transactions AS $$
DECLARE
  v_wallet wallets;
  v_tx     wallet_transactions;
BEGIN
  SELECT * INTO v_wallet
  FROM wallets
  WHERE id = p_wallet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carteira não encontrada: %', p_wallet_id;
  END IF;

  IF v_wallet.saldo_disponivel < p_valor THEN
    RAISE EXCEPTION 'saldo insuficiente para reembolso: disponível=%, necessário=%',
      v_wallet.saldo_disponivel, p_valor;
  END IF;

  UPDATE wallets
  SET saldo_disponivel = saldo_disponivel - p_valor
  WHERE id = p_wallet_id;

  INSERT INTO wallet_transactions (wallet_id, tipo, valor, meta)
  VALUES (
    p_wallet_id,
    'reembolso',
    p_valor,
    jsonb_build_object('refund_request_id', p_refund_request_id)
  )
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- 6. Row Level Security (RLS)
-- ---------------------------------------------------------------------------

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Parceiro vê apenas sua própria carteira
DROP POLICY IF EXISTS "Parceiro vê própria carteira" ON wallets;
CREATE POLICY "Parceiro vê própria carteira"
  ON wallets FOR SELECT
  USING (partner_id = auth.uid());

-- Parceiro vê transações da própria carteira
DROP POLICY IF EXISTS "Parceiro vê próprias transações" ON wallet_transactions;
CREATE POLICY "Parceiro vê próprias transações"
  ON wallet_transactions FOR SELECT
  USING (
    wallet_id IN (
      SELECT id FROM wallets WHERE partner_id = auth.uid()
    )
  );

-- Parceiro vê próprias solicitações de reembolso
DROP POLICY IF EXISTS "Parceiro vê próprios reembolsos" ON refund_requests;
CREATE POLICY "Parceiro vê próprios reembolsos"
  ON refund_requests FOR SELECT
  USING (
    wallet_id IN (
      SELECT id FROM wallets WHERE partner_id = auth.uid()
    )
  );

-- Parceiro vê próprias campanhas
DROP POLICY IF EXISTS "Parceiro vê próprias campanhas" ON campaigns;
CREATE POLICY "Parceiro vê próprias campanhas"
  ON campaigns FOR SELECT
  USING (partner_id = auth.uid());

-- Parceiro cria próprias campanhas
DROP POLICY IF EXISTS "Parceiro cria campanha" ON campaigns;
CREATE POLICY "Parceiro cria campanha"
  ON campaigns FOR INSERT
  WITH CHECK (partner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 7. Permissões de Acesso (GRANTs para roles do Supabase)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE wallets TO anon, authenticated, service_role;
GRANT ALL ON TABLE wallet_transactions TO anon, authenticated, service_role;
GRANT ALL ON TABLE refund_requests TO anon, authenticated, service_role;
GRANT ALL ON TABLE campaigns TO anon, authenticated, service_role;

GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Rollback (comentado — descomente se precisar reverter)
-- ---------------------------------------------------------------------------
-- DROP TABLE IF EXISTS wallet_transactions CASCADE;
-- DROP TABLE IF EXISTS refund_requests CASCADE;
-- DROP TABLE IF EXISTS campaigns CASCADE;
-- DROP TABLE IF EXISTS wallets CASCADE;
-- DROP TYPE IF EXISTS wallet_transaction_type CASCADE;
-- DROP TYPE IF EXISTS refund_request_status CASCADE;
-- DROP TYPE IF EXISTS campaign_status CASCADE;
-- DROP TYPE IF EXISTS campaign_format CASCADE;
-- DROP TYPE IF EXISTS campaign_objective CASCADE;
-- DROP FUNCTION IF EXISTS wallet_credit_recarga CASCADE;
-- DROP FUNCTION IF EXISTS wallet_debit_campanha CASCADE;
-- DROP FUNCTION IF EXISTS wallet_credit_estorno_reprovacao CASCADE;
-- DROP FUNCTION IF EXISTS wallet_debit_reembolso CASCADE;
