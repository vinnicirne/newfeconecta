// =============================================================================
// FéConecta — Domínio Ads
// TrackingService — Rastreamento de Impressões, Cliques e Consumo de Orçamento
//
// REGRAS:
//  - Eventos de tracking são append-only (ad_impressions e ad_clicks).
//  - Incremento de gasto da campanha é SEMPRE atômico via RPC PostgreSQL.
//  - Quando gasto >= orcamento, enfileira encerramento automático da campanha.
//  - Proteção contra click fraud básica (rate limiting por IP/User).
// =============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { CampaignClosingService } from "./campaign-closing.service";

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

// Rate limiter in-memory contra fraude de cliques
interface ClickRecord {
  timestamps: number[];
}
const clickRateLimitMap = new Map<string, ClickRecord>();

export class TrackingService {
  private db: SupabaseClient;
  private closingService: CampaignClosingService;

  constructor(db?: SupabaseClient, closingService?: CampaignClosingService) {
    this.db = db ?? getAdminClient();
    this.closingService = closingService ?? new CampaignClosingService(this.db);
  }

  /**
   * Registra uma impressão de anúncio e atualiza o gasto da campanha atomicamente.
   * - Para objetivo "alcance" (CPM): 1 centavo por visualização (R$ 0,01 = CPM R$ 10,00).
   * - Para objetivo "cliques" / "conversoes" (CPC): impressão gratuita (R$ 0,00).
   */
  async trackImpression(params: {
    campaignId: string;
    format: string;
    userId?: string | null;
    costCents?: number;
    metadata?: Record<string, unknown>;
  }): Promise<{ impressionId: string; newGasto: number; budgetReached: boolean }> {
    // 1. Busca objetivo da campanha para definir custo de visualização
    let costCents = params.costCents;
    if (costCents === undefined) {
      const { data: camp } = await this.db
        .from("campaigns")
        .select("objetivo")
        .eq("id", params.campaignId)
        .maybeSingle();

      // Se for cliques ou conversões, impressão é gratuita no modelo CPC
      if (camp?.objetivo === "cliques" || camp?.objetivo === "conversoes") {
        costCents = 0;
      } else {
        costCents = 1; // 1 centavo por visualização padrão (CPM)
      }
    }

    // 2. Inserir no log de impressões (append-only)
    const { data: imp, error: impError } = await this.db
      .from("ad_impressions")
      .insert({
        campaign_id: params.campaignId,
        format: params.format,
        user_id: params.userId ?? null,
        cost_cents: costCents,
        metadata: params.metadata ?? {},
      })
      .select("id")
      .single();

    if (impError || !imp) {
      throw new Error(`Erro ao registrar impressão: ${impError?.message}`);
    }

    let newGasto = 0;
    let budgetReached = false;

    // 3. Incrementar gasto atomicamente via RPC se houver custo
    if (costCents > 0) {
      const { data: rpcRes, error: rpcError } = await this.db.rpc(
        "increment_campaign_gasto_atomic",
        {
          p_campaign_id: params.campaignId,
          p_amount: costCents,
        }
      );

      if (rpcError) {
        throw new Error(`Erro ao atualizar gasto da campanha: ${rpcError.message}`);
      }

      const row = Array.isArray(rpcRes) ? rpcRes[0] : rpcRes;
      newGasto = Number(row?.new_gasto ?? 0);
      budgetReached = Boolean(row?.budget_reached);

      // Se atingiu o orçamento, fecha a campanha automaticamente
      if (budgetReached) {
        try {
          await this.closingService.closeIfEligible(params.campaignId);
        } catch (closeErr) {
          console.error(`[TrackingService] Falha ao encerrar campanha após atingir orçamento:`, closeErr);
        }
      }
    }

    return {
      impressionId: imp.id,
      newGasto,
      budgetReached,
    };
  }

  /**
   * Registra um clique no anúncio com verificação de anti-fraude e débito CPC.
   */
  async trackClick(params: {
    campaignId: string;
    impressionId?: string | null;
    userId?: string | null;
    clientIp?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<{ clickId: string; suspicious: boolean }> {
    const trackerKey = `${params.campaignId}:${params.userId || params.clientIp || "anon"}`;
    const now = Date.now();

    // Verificação de Rate Limit (max 3 cliques a cada 5 minutos por usuário/IP)
    const record = clickRateLimitMap.get(trackerKey) || { timestamps: [] };
    record.timestamps = record.timestamps.filter((t) => now - t < 5 * 60 * 1000);

    const isSuspicious = record.timestamps.length >= 3;
    record.timestamps.push(now);
    clickRateLimitMap.set(trackerKey, record);

    const meta = {
      ...(params.metadata || {}),
      suspicious: isSuspicious,
      client_ip: params.clientIp ?? null,
    };

    // Inserir registro de clique
    const { data, error } = await this.db
      .from("ad_clicks")
      .insert({
        campaign_id: params.campaignId,
        impression_id: params.impressionId ?? null,
        user_id: params.userId ?? null,
        metadata: meta,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Erro ao registrar clique: ${error?.message}`);
    }

    // Se o clique for legítimo e o modelo for CPC, debita o custo por clique
    if (!isSuspicious) {
      const { data: camp } = await this.db
        .from("campaigns")
        .select("objetivo")
        .eq("id", params.campaignId)
        .maybeSingle();

      if (camp?.objetivo === "cliques" || camp?.objetivo === "conversoes") {
        const clickCostCents = camp.objetivo === "conversoes" ? 50 : 25; // R$ 0,25 CPC / R$ 0,50 Conversão
        const { data: rpcRes } = await this.db.rpc("increment_campaign_gasto_atomic", {
          p_campaign_id: params.campaignId,
          p_amount: clickCostCents,
        });

        const row = Array.isArray(rpcRes) ? rpcRes[0] : rpcRes;
        if (row?.budget_reached) {
          try {
            await this.closingService.closeIfEligible(params.campaignId);
          } catch (closeErr) {
            console.error(`[TrackingService] Falha ao encerrar campanha após clique esgotar orçamento:`, closeErr);
          }
        }
      }
    }

    return {
      clickId: data.id,
      suspicious: isSuspicious,
    };
  }

  static clearClickRateLimits(): void {
    clickRateLimitMap.clear();
  }
}
