-- =============================================================================
-- FéConecta — Migration: Fase 2 — RPCs de Aprovação/Reprovação Atômica
--
-- IMPORTANTE: Executar APÓS 20260828_ads_wallet_system.sql
-- Estas funções encapsulam toda a lógica de negócio crítica no banco,
-- garantindo atomicidade real sem round-trips parciais do JavaScript.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RPC 1: approve_campaign_atomic
--
-- Executa em UMA transação:
--   1. Lock da campanha (FOR UPDATE)
--   2. Valida status pendente → ativa
--   3. Lock da wallet (FOR UPDATE)
--   4. Valida saldo_disponivel >= orcamento
--   5. Debita disponivel / credita investido
--   6. Insere linha no ledger (debito_campanha)
--   7. Atualiza status da campanha para 'ativa'
--
-- Exceções lançadas (capturadas pelo JS):
--   'campanha_nao_encontrada'
--   'transicao_invalida:<from>'
--   'carteira_nao_encontrada'
--   'saldo_insuficiente:<disponivel>:<necessario>'
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION approve_campaign_atomic(
  p_campaign_id UUID,
  p_admin_id    UUID
)
RETURNS campaigns AS $$
DECLARE
  v_campaign campaigns;
  v_wallet   wallets;
BEGIN
  -- 1. Busca e bloqueia a campanha (impede aprovação concorrente)
  SELECT * INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campanha_nao_encontrada:%', p_campaign_id;
  END IF;

  -- 2. Valida que está em pendente (única origem válida para ativa)
  IF v_campaign.status != 'pendente' THEN
    RAISE EXCEPTION 'transicao_invalida:%', v_campaign.status::text;
  END IF;

  -- 3. Busca e bloqueia a wallet do parceiro
  SELECT * INTO v_wallet
  FROM wallets
  WHERE partner_id = v_campaign.partner_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'carteira_nao_encontrada:%', v_campaign.partner_id;
  END IF;

  -- 4. Checa saldo (segunda barreira — a primeira é no JS, esta é a garantia real)
  IF v_wallet.saldo_disponivel < v_campaign.orcamento THEN
    RAISE EXCEPTION 'saldo_insuficiente:%:%',
      v_wallet.saldo_disponivel, v_campaign.orcamento;
  END IF;

  -- 5. Debita disponivel e credita investido atomicamente
  UPDATE wallets
  SET
    saldo_disponivel = saldo_disponivel - v_campaign.orcamento,
    saldo_investido  = saldo_investido  + v_campaign.orcamento,
    updated_at       = NOW()
  WHERE id = v_wallet.id;

  -- 6. Ledger — append-only
  INSERT INTO wallet_transactions (wallet_id, tipo, valor, campaign_id)
  VALUES (v_wallet.id, 'debito_campanha', v_campaign.orcamento, p_campaign_id);

  -- 7. Ativa a campanha
  UPDATE campaigns
  SET status = 'ativa', updated_at = NOW()
  WHERE id = p_campaign_id
  RETURNING * INTO v_campaign;

  RETURN v_campaign;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- RPC 2: reject_campaign_atomic
--
-- Executa em UMA transação:
--   1. Lock da campanha
--   2. Valida transição → reprovado
--   3. Busca débito prévio (debito_campanha) para esta campanha
--   4. Se houver: lock da wallet + estorno (credita disponivel) + linha no ledger
--   5. Atualiza status para reprovado + salva motivo
--
-- NÃO chama Mercado Pago em nenhuma hipótese.
CREATE OR REPLACE FUNCTION reject_campaign_atomic(
  p_campaign_id UUID,
  p_admin_id    UUID,
  p_motivo      TEXT DEFAULT NULL
)
RETURNS campaigns AS $$
DECLARE
  v_campaign campaigns;
BEGIN
  -- 1. Busca e bloqueia a campanha
  SELECT * INTO v_campaign
  FROM campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'campanha_nao_encontrada:%', p_campaign_id;
  END IF;

  -- 2. Valida que a transição é estritamente a partir de pendente
  IF v_campaign.status != 'pendente' THEN
    RAISE EXCEPTION 'transicao_invalida:%', v_campaign.status::text;
  END IF;

  -- 3. Reprova a campanha sem movimentação de saldo (saldo nunca foi debitado)
  UPDATE campaigns
  SET
    status            = 'reprovado',
    motivo_reprovacao = p_motivo,
    updated_at        = NOW()
  WHERE id = p_campaign_id
  RETURNING * INTO v_campaign;

  RETURN v_campaign;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- RPC 3: is_user_admin — verifica se usuário é admin (auxiliar das routes)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_user_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = p_user_id AND (role = 'admin' OR role = 'superadmin' OR role = 'moderator')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

