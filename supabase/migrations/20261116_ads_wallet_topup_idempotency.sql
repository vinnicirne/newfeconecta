-- Prevent a Mercado Pago top-up from being credited more than once, including
-- when its webhook and browser return are processed at the same time.
DO $$
BEGIN
  IF EXISTS (
    SELECT payment_id
    FROM wallet_transactions
    WHERE tipo = 'recarga' AND payment_id IS NOT NULL
    GROUP BY payment_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Duplicate top-up payment_id values exist; reconcile wallet_transactions before applying this migration';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_unique_topup_payment
  ON wallet_transactions (payment_id)
  WHERE tipo = 'recarga' AND payment_id IS NOT NULL;

CREATE OR REPLACE FUNCTION wallet_credit_recarga(
  p_wallet_id UUID,
  p_valor BIGINT,
  p_payment_id TEXT
)
RETURNS wallet_transactions AS $$
DECLARE
  v_tx wallet_transactions;
BEGIN
  IF p_valor <= 0 OR p_payment_id IS NULL OR p_payment_id = '' THEN
    RAISE EXCEPTION 'Recarga inválida';
  END IF;

  -- Serialize duplicate callbacks for the same Mercado Pago payment.
  PERFORM pg_advisory_xact_lock(hashtext(p_payment_id)::BIGINT);

  SELECT * INTO v_tx
  FROM wallet_transactions
  WHERE payment_id = p_payment_id AND tipo = 'recarga';

  IF FOUND THEN
    IF v_tx.wallet_id <> p_wallet_id OR v_tx.valor <> p_valor THEN
      RAISE EXCEPTION 'Pagamento já processado com dados incompatíveis';
    END IF;
    RETURN v_tx;
  END IF;

  UPDATE wallets
  SET saldo_disponivel = saldo_disponivel + p_valor
  WHERE id = p_wallet_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carteira não encontrada: %', p_wallet_id;
  END IF;

  INSERT INTO wallet_transactions (wallet_id, tipo, valor, payment_id)
  VALUES (p_wallet_id, 'recarga', p_valor, p_payment_id)
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
