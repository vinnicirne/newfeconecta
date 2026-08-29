// =============================================================================
// FéConecta — Domínio Ads
// CampaignService — Ciclo de vida das campanhas (Fase 1 + Fase 2)
//
// REGRAS:
//  - Criação: status "pendente", SEM debitar saldo
//  - approveCampaign: delega para RPC approve_campaign_atomic (banco garante atomicidade)
//  - rejectCampaign: delega para RPC reject_campaign_atomic (NÃO chama MELI)
//  - Toda mudança de status passa por assertTransition() antes do banco
// =============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { assertTransition } from "./campaign-state-machine";
import {
  Campaign,
  CampaignStatus,
  CampaignFormat,
  CampaignObjective,
  CreateCampaignDto,
  InsufficientBalanceError,
  InvalidStatusTransitionError,
} from "./types";

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

// ---------------------------------------------------------------------------
// Helpers para parsear erros das RPCs PostgreSQL
// ---------------------------------------------------------------------------

function parseRpcError(message: string, campaignId: string, walletId?: string): never {
  if (message.includes("saldo_insuficiente")) {
    const parts = message.match(/saldo_insuficiente:(\d+):(\d+)/);
    const available = parts ? parseInt(parts[1]) : 0;
    const required = parts ? parseInt(parts[2]) : 0;
    throw new InsufficientBalanceError(walletId ?? "unknown", required, available);
  }

  if (message.includes("transicao_invalida")) {
    const from = (message.match(/transicao_invalida:(\w+)/)?.[1] ?? "desconhecido") as CampaignStatus;
    throw new InvalidStatusTransitionError(from, "ativa");
  }

  if (message.includes("campanha_nao_encontrada")) {
    throw new Error(`Campanha não encontrada: ${campaignId}`);
  }

  throw new Error(message);
}

// ===========================================================================
// CampaignService
// ===========================================================================

export class CampaignService {
  private db: SupabaseClient;

  constructor(db?: SupabaseClient) {
    this.db = db ?? getAdminClient();
  }

  // -------------------------------------------------------------------------
  // FASE 1: Criar campanha em "pendente" — SEM debitar saldo
  // -------------------------------------------------------------------------

  async createCampaign(
    partnerId: string,
    dto: CreateCampaignDto
  ): Promise<Campaign> {
    const { data, error } = await this.db
      .from("campaigns")
      .insert({
        partner_id: partnerId,
        nome: dto.nome,
        formato: dto.formato,
        objetivo: dto.objetivo,
        orcamento: dto.orcamento,
        gasto: 0,
        status: "pendente" satisfies CampaignStatus,
        periodo_inicio: dto.periodo_inicio,
        periodo_fim: dto.periodo_fim,
        publico: dto.publico ?? {},
        criativo_url: dto.criativo_url ?? null,
        criativo_tipo: dto.criativo_tipo ?? null,
        call_to_action: dto.call_to_action ?? null,
        texto: dto.texto ?? null,
        motivo_reprovacao: null,
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`[CampaignService] Erro ao criar campanha: ${error?.message}`);
    }

    return data as Campaign;
  }

  // -------------------------------------------------------------------------
  // FASE 2: Aprovação atômica — delega para RPC do banco
  //
  // O banco executa em uma única transação:
  //   lock(campaign) → valida pendente → lock(wallet) → valida saldo
  //   → debita → insere ledger → status = ativa
  // Se qualquer passo falhar: rollback total automático pelo PostgreSQL.
  // -------------------------------------------------------------------------

  async approveCampaign(
    campaignId: string,
    adminId: string
  ): Promise<Campaign> {
    // Pre-check no JS para early feedback rápido (não substitui a validação do banco)
    const campaign = await this.getCampaignById(campaignId);
    assertTransition(campaign.status, "ativa");

    const { data, error } = await this.db.rpc("approve_campaign_atomic", {
      p_campaign_id: campaignId,
      p_admin_id: adminId,
    });

    if (error) {
      parseRpcError(error.message, campaignId);
    }

    // Invalida o cache de serving imediatamente
    try {
      const { AdServingService } = await import("./ad-serving.service");
      AdServingService.clearCache();
    } catch {}

    return data as Campaign;
  }

  // -------------------------------------------------------------------------
  // FASE 2: Reprovação — NÃO chama Mercado Pago
  //
  // O banco executa em uma única transação:
  //   lock(campaign) → valida transição → busca débito prévio
  //   → se houver: lock(wallet) + estorno + ledger → status = reprovado
  // -------------------------------------------------------------------------

  async rejectCampaign(
    campaignId: string,
    adminId: string,
    motivo?: string
  ): Promise<Campaign> {
    // Pre-check no JS para early feedback
    const campaign = await this.getCampaignById(campaignId);
    assertTransition(campaign.status, "reprovado");

    const { data, error } = await this.db.rpc("reject_campaign_atomic", {
      p_campaign_id: campaignId,
      p_admin_id: adminId,
      p_motivo: motivo ?? null,
    });

    if (error) {
      parseRpcError(error.message, campaignId);
    }

    // Invalida o cache de serving imediatamente
    try {
      const { AdServingService } = await import("./ad-serving.service");
      AdServingService.clearCache();
    } catch {}

    return data as Campaign;
  }

  // -------------------------------------------------------------------------
  // Buscar campanha por ID
  // -------------------------------------------------------------------------

  async getCampaignById(campaignId: string): Promise<Campaign> {
    const { data, error } = await this.db
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (error || !data) {
      throw new Error(`Campanha não encontrada: ${campaignId}`);
    }

    return data as Campaign;
  }

  // -------------------------------------------------------------------------
  // Listar campanhas do parceiro (com filtros opcionais)
  // -------------------------------------------------------------------------

  async listByPartner(
    partnerId: string,
    filters?: { status?: CampaignStatus }
  ): Promise<Campaign[]> {
    let query = this.db
      .from("campaigns")
      .select("*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`[CampaignService] Erro ao listar campanhas: ${error.message}`);
    }

    return (data ?? []) as Campaign[];
  }

  // -------------------------------------------------------------------------
  // Listar todas as campanhas (admin) com filtros e paginação
  // -------------------------------------------------------------------------

  async listAll(filters?: {
    status?: CampaignStatus;
    partner_id?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ campaigns: Campaign[]; total: number }> {
    const page = filters?.page ?? 1;
    const pageSize = filters?.pageSize ?? 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.db
      .from("campaigns")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.partner_id) query = query.eq("partner_id", filters.partner_id);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`[CampaignService] Erro ao listar campanhas: ${error.message}`);
    }

    return {
      campaigns: (data ?? []) as Campaign[],
      total: count ?? 0,
    };
  }

  async updateCampaign(
    campaignId: string,
    updates: {
      nome?: string;
      formato?: CampaignFormat;
      objetivo?: CampaignObjective;
      periodo_inicio?: string;
      periodo_fim?: string;
      publico?: any;
      criativo_url?: string | null;
      criativo_tipo?: "imagem" | "video" | null;
      call_to_action?: string | null;
      texto?: string | null;
    }
  ): Promise<Campaign> {
    const { data, error } = await this.db
      .from("campaigns")
      .update(updates)
      .eq("id", campaignId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`[CampaignService] Erro ao atualizar campanha: ${error?.message}`);
    }

    return data as Campaign;
  }

  // -------------------------------------------------------------------------
  // updateStatus — Método interno, apenas via assertTransition
  // (Usado por testes e casos não cobertos pelas RPCs atômicas)
  // -------------------------------------------------------------------------

  async updateStatus(
    campaignId: string,
    from: CampaignStatus,
    to: CampaignStatus,
    extra?: { motivo_reprovacao?: string }
  ): Promise<Campaign> {
    assertTransition(from, to);

    const { data, error } = await this.db
      .from("campaigns")
      .update({
        status: to,
        ...(extra?.motivo_reprovacao !== undefined
          ? { motivo_reprovacao: extra.motivo_reprovacao }
          : {}),
      })
      .eq("id", campaignId)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`[CampaignService] Erro ao atualizar status: ${error?.message}`);
    }

    return data as Campaign;
  }
}
