// =============================================================================
// FéConecta — Domínio Ads
// WalletLedgerService — O motor financeiro do sistema
//
// REGRAS ABSOLUTAS:
//  1. Nenhum saldo é alterado sem uma linha em wallet_transactions.
//  2. Toda operação de saldo usa transação de banco (via RPC do Supabase).
//  3. Este serviço não tem acesso HTTP — só é chamado por outros services e API routes.
// =============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  Wallet,
  WalletTransaction,
  WalletTransactionType,
  WalletBalanceDto,
  WalletTransactionDto,
  InsufficientBalanceError,
  WalletNotFoundError,
} from "./types";

// ---------------------------------------------------------------------------
// Supabase admin client (service role para operações transacionais)
// ---------------------------------------------------------------------------

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

// ---------------------------------------------------------------------------
// WalletLedgerService
// ---------------------------------------------------------------------------

export class WalletLedgerService {
  private db: SupabaseClient;

  constructor(db?: SupabaseClient) {
    this.db = db ?? getAdminClient();
  }

  // -------------------------------------------------------------------------
  // Buscar wallet pelo partner_id (cria automaticamente se não existir)
  // -------------------------------------------------------------------------

  async getOrCreateWallet(partnerId: string): Promise<Wallet> {
    // Tenta buscar
    const { data: existing, error: fetchError } = await this.db
      .from("wallets")
      .select("*")
      .eq("partner_id", partnerId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      throw new Error(`[WalletLedger] Erro ao buscar carteira: ${fetchError.message}`);
    }

    if (existing) return existing as Wallet;

    // Cria nova carteira zerада
    const { data: created, error: createError } = await this.db
      .from("wallets")
      .insert({
        partner_id: partnerId,
        saldo_disponivel: 0,
        saldo_investido: 0,
      })
      .select("*")
      .single();

    if (createError || !created) {
      throw new Error(`[WalletLedger] Erro ao criar carteira: ${createError?.message}`);
    }

    return created as Wallet;
  }

  async getWalletById(walletId: string): Promise<Wallet> {
    const { data, error } = await this.db
      .from("wallets")
      .select("*")
      .eq("id", walletId)
      .single();

    if (error || !data) {
      throw new WalletNotFoundError(walletId);
    }

    return data as Wallet;
  }

  // -------------------------------------------------------------------------
  // creditRecarga — Webhook MP confirma pagamento → +disponível
  // -------------------------------------------------------------------------

  async creditRecarga(
    walletId: string,
    valor: number,
    paymentId: string
  ): Promise<WalletTransaction> {
    if (valor <= 0) throw new Error("[WalletLedger] Valor de recarga deve ser > 0");

    // 1. Busca saldo atual com lock (leitura consistente)
    const { data: current, error: fetchErr } = await this.db
      .from("wallets")
      .select("saldo_disponivel")
      .eq("id", walletId)
      .single();

    if (fetchErr || !current) {
      throw new Error(`[WalletLedger] Carteira não encontrada: ${walletId}`);
    }

    const novoSaldo = (current.saldo_disponivel as number) + valor;

    // 2. Atualiza saldo disponível
    const { error: updateErr } = await this.db
      .from("wallets")
      .update({ saldo_disponivel: novoSaldo })
      .eq("id", walletId);

    if (updateErr) {
      throw new Error(`[WalletLedger] Erro ao atualizar saldo: ${updateErr.message}`);
    }

    // 3. Registra transação no ledger
    const { data: tx, error: txErr } = await this.db
      .from("wallet_transactions")
      .insert({
        wallet_id: walletId,
        tipo: "recarga" satisfies WalletTransactionType,
        valor,
        payment_id: paymentId,
      })
      .select("*")
      .single();

    if (txErr || !tx) {
      throw new Error(`[WalletLedger] Erro ao registrar transação: ${txErr?.message}`);
    }

    return tx as WalletTransaction;
  }

  // -------------------------------------------------------------------------
  // debitForCampaignApproval — Admin aprova → -disponível +investido (ATÔMICO)
  // -------------------------------------------------------------------------

  async debitForCampaignApproval(
    walletId: string,
    campaignId: string,
    valor: number
  ): Promise<WalletTransaction> {
    if (valor <= 0) throw new Error("[WalletLedger] Orçamento deve ser > 0");

    // Verifica saldo antes de chamar RPC (early fail para feedback rápido)
    const wallet = await this.getWalletById(walletId);

    if (wallet.saldo_disponivel < valor) {
      throw new InsufficientBalanceError(walletId, valor, wallet.saldo_disponivel);
    }

    // RPC com lock de linha (SELECT FOR UPDATE dentro da função SQL)
    const { data, error } = await this.db.rpc("wallet_debit_campanha", {
      p_wallet_id: walletId,
      p_campaign_id: campaignId,
      p_valor: valor,
    });

    if (error) {
      // Pode ser erro de saldo insuficiente lançado pelo próprio banco
      if (error.message?.includes("saldo insuficiente")) {
        throw new InsufficientBalanceError(walletId, valor, wallet.saldo_disponivel);
      }
      throw new Error(`[WalletLedger] Erro no débito de campanha: ${error.message}`);
    }

    return data as WalletTransaction;
  }

  // -------------------------------------------------------------------------
  // creditEstornoReprovacao — Admin reprova → +disponível (SEM chamar MELI)
  // -------------------------------------------------------------------------

  async creditEstornoReprovacao(
    walletId: string,
    campaignId: string,
    valor: number
  ): Promise<WalletTransaction> {
    if (valor <= 0) throw new Error("[WalletLedger] Valor de estorno deve ser > 0");

    const { data, error } = await this.db.rpc("wallet_credit_estorno_reprovacao", {
      p_wallet_id: walletId,
      p_campaign_id: campaignId,
      p_valor: valor,
    });

    if (error) {
      throw new Error(`[WalletLedger] Erro no estorno de reprovação: ${error.message}`);
    }

    return data as WalletTransaction;
  }

  // -------------------------------------------------------------------------
  // debitReembolso — Admin aprova refund request + MELI confirma → -disponível
  // -------------------------------------------------------------------------

  async debitReembolso(
    walletId: string,
    valor: number,
    refundRequestId: string
  ): Promise<WalletTransaction> {
    if (valor <= 0) throw new Error("[WalletLedger] Valor de reembolso deve ser > 0");

    // Verifica saldo disponível
    const wallet = await this.getWalletById(walletId);
    if (wallet.saldo_disponivel < valor) {
      throw new InsufficientBalanceError(walletId, valor, wallet.saldo_disponivel);
    }

    const { data, error } = await this.db.rpc("wallet_debit_reembolso", {
      p_wallet_id: walletId,
      p_valor: valor,
      p_refund_request_id: refundRequestId,
    });

    if (error) {
      throw new Error(`[WalletLedger] Erro no débito de reembolso: ${error.message}`);
    }

    return data as WalletTransaction;
  }

  // -------------------------------------------------------------------------
  // getBalances — Retorna saldo atual e total aportado histórico
  // -------------------------------------------------------------------------

  async getBalances(walletId: string): Promise<WalletBalanceDto> {
    const wallet = await this.getWalletById(walletId);

    // Total aportado = soma de todas as recargas
    const { data: recargas } = await this.db
      .from("wallet_transactions")
      .select("valor")
      .eq("wallet_id", walletId)
      .eq("tipo", "recarga" satisfies WalletTransactionType);

    const total_aportado = (recargas ?? []).reduce(
      (sum, tx) => sum + (tx.valor as number),
      0
    );

    // Últimas 10 transações
    const { data: txRaw } = await this.db
      .from("wallet_transactions")
      .select("id, tipo, valor, campaign_id, created_at")
      .eq("wallet_id", walletId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Buscar nomes de campanhas se houver campaign_id
    const transacoes_recentes: WalletTransactionDto[] = await Promise.all(
      (txRaw ?? []).map(async (tx) => {
        let campaign_nome: string | null = null;
        if (tx.campaign_id) {
          const { data: camp } = await this.db
            .from("campaigns")
            .select("nome")
            .eq("id", tx.campaign_id)
            .single();
          campaign_nome = camp?.nome ?? null;
        }
        return {
          id: tx.id,
          tipo: tx.tipo as WalletTransactionType,
          valor: tx.valor,
          campaign_id: tx.campaign_id,
          campaign_nome,
          created_at: tx.created_at,
        };
      })
    );

    return {
      saldo_disponivel: wallet.saldo_disponivel,
      saldo_investido: wallet.saldo_investido,
      total_aportado,
      transacoes_recentes,
    };
  }

  // -------------------------------------------------------------------------
  // getStatement — Extrato completo paginado
  // -------------------------------------------------------------------------

  async getStatement(
    walletId: string,
    page = 1,
    pageSize = 20
  ): Promise<{ transactions: WalletTransactionDto[]; total: number }> {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await this.db
      .from("wallet_transactions")
      .select("id, tipo, valor, campaign_id, payment_id, created_at", {
        count: "exact",
      })
      .eq("wallet_id", walletId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`[WalletLedger] Erro ao buscar extrato: ${error.message}`);
    }

    const transactions: WalletTransactionDto[] = (data ?? []).map((tx) => ({
      id: tx.id,
      tipo: tx.tipo as WalletTransactionType,
      valor: tx.valor,
      campaign_id: tx.campaign_id,
      campaign_nome: null, // extrato não carrega nome para performance
      created_at: tx.created_at,
    }));

    return { transactions, total: count ?? 0 };
  }
}
