// =============================================================================
// FéConecta — Domínio Ads
// CampaignClosingService — Encerramento automático de campanhas
//
// REGRAS:
//  - Encerramento passa pela máquina de estados (assertTransition).
//  - Saldo investido permanece como histórico — NÃO há devolução no encerramento.
//  - É idempotente (executar duas vezes não gera erro nem duplicação).
// =============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { assertTransition } from "./campaign-state-machine";
import { Campaign, CampaignStatus } from "./types";

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

export class CampaignClosingService {
  private db: SupabaseClient;

  constructor(db?: SupabaseClient) {
    this.db = db ?? getAdminClient();
  }

  /**
   * Encerra uma campanha específica se for elegível (orçamento atingido ou data expirada).
   * Idempotente: se já estiver encerrada, retorna a campanha sem erro.
   */
  async closeIfEligible(campaignId: string): Promise<Campaign> {
    const { data: camp, error: fetchErr } = await this.db
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (fetchErr || !camp) {
      throw new Error(`Campanha não encontrada: ${campaignId}`);
    }

    // Se já estiver encerrada ou reprovada, não faz nada
    if (camp.status === "encerrado" || camp.status === "reprovado") {
      return camp as Campaign;
    }

    // Valida transição via máquina de estados
    assertTransition(camp.status as CampaignStatus, "encerrado");

    const { data, error } = await this.db.rpc("close_campaign_if_eligible_atomic", {
      p_campaign_id: campaignId,
    });

    if (error) {
      throw new Error(`[CampaignClosingService] Erro ao encerrar campanha: ${error.message}`);
    }

    return data as Campaign;
  }

  /**
   * Job executado periodicamente (ex: a cada 5 minutos) para encerrar
   * todas as campanhas cuja data final (periodo_fim) já expirou.
   */
  async closeExpiredCampaigns(): Promise<string[]> {
    const { data, error } = await this.db.rpc("close_expired_campaigns_atomic");

    if (error) {
      throw new Error(`[CampaignClosingService] Erro no job de encerramento por data: ${error.message}`);
    }

    return (data ?? []) as string[];
  }
}
