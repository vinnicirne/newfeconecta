// =============================================================================
// FéConecta — Domínio Ads
// AdServingService — Seleção e entrega de anúncios elegíveis
//
// REGRAS:
//  - O ad-serving só lê campanhas em status "ativa".
//  - Nunca serve campanhas pausadas, reprovadas, pendentes ou encerradas.
//  - Valida data (periodo_inicio <= hoje <= periodo_fim) e orcamento (gasto < orcamento).
//  - Gera tokens de tracking para impressão e clique.
// =============================================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Campaign, CampaignFormat } from "./types";

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey);
}

export interface AdServingResult {
  campaign_id: string;
  partner_id?: string;
  partner_nome?: string;
  partner_avatar?: string;
  partner_verified?: boolean;
  nome: string;
  formato: CampaignFormat;
  criativo_url: string | null;
  criativo_tipo: "imagem" | "video" | null;
  call_to_action: string | null;
  texto: string | null;
  tracking_url_impression: string;
  tracking_url_click: string;
}

// Cache simples em memória (TTL: 10s)
interface CacheEntry {
  data: Campaign[];
  expiresAt: number;
}
const servingCache = new Map<string, CacheEntry>();

export class AdServingService {
  private db: SupabaseClient;

  constructor(db?: SupabaseClient) {
    this.db = db ?? getAdminClient();
  }

  /**
   * Busca campanhas ativas elegíveis para o formato solicitado.
   */
  async getEligibleCampaigns(format: CampaignFormat): Promise<Campaign[]> {
    const cacheKey = `format:${format}`;
    const now = Date.now();
    const cached = servingCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const { data, error } = await this.db
      .from("campaigns")
      .select("*")
      .eq("status", "ativa");

    if (error || !data) {
      return [];
    }

    // Filtra campanhas que ainda possuem orçamento disponível e formato compatível
    const eligible = (data as Campaign[]).filter((c) => {
      const formatMatch = !c.formato || c.formato.toLowerCase() === format.toLowerCase();
      const budgetOk = Number(c.gasto || 0) < Number(c.orcamento || 1);
      const dateOk = (!c.periodo_inicio || c.periodo_inicio <= todayStr) && (!c.periodo_fim || c.periodo_fim >= todayStr);
      return formatMatch && budgetOk && dateOk;
    });

    // Salva no cache por 10s
    servingCache.set(cacheKey, {
      data: eligible,
      expiresAt: now + 10 * 1000,
    });

    return eligible;
  }

  /**
   * Seleciona o melhor anúncio para exibição (round-robin ponderado por saldo restante).
   * Retorna null se nenhuma campanha estiver disponível (renderiza 204 no controller).
   */
  async serveAd(
    format: CampaignFormat,
    baseUrl = "https://feconecta.com.br"
  ): Promise<AdServingResult | null> {
    const eligible = await this.getEligibleCampaigns(format);

    if (eligible.length === 0) {
      return null;
    }

    // Algoritmo de seleção: roleta ponderada pelo orçamento restante
    const totalRemaining = eligible.reduce(
      (sum, c) => sum + Math.max(1, (c.orcamento || 0) - (c.gasto || 0)),
      0
    );

    let random = Math.random() * totalRemaining;
    let selected: Campaign = eligible[0];

    for (const c of eligible) {
      const weight = Math.max(1, (c.orcamento || 0) - (c.gasto || 0));
      if (random < weight) {
        selected = c;
        break;
      }
      random -= weight;
    }

    // Busca perfil do parceiro
    let partner_nome = "FéConecta Parceiro";
    let partner_avatar: string | undefined;
    let partner_verified = true;

    if (selected.partner_id) {
      const { data: profile } = await this.db
        .from("profiles")
        .select("full_name, avatar_url, is_verified")
        .eq("id", selected.partner_id)
        .single();

      if (profile) {
        partner_nome = profile.full_name || partner_nome;
        partner_avatar = profile.avatar_url;
        partner_verified = profile.is_verified ?? true;
      }
    }

    const tracking_url_impression = `${baseUrl}/api/ads/track/impression?id=${selected.id}&format=${selected.formato || 'feed'}`;
    const tracking_url_click = `${baseUrl}/api/ads/track/click?id=${selected.id}`;

    return {
      campaign_id: selected.id,
      partner_id: selected.partner_id,
      partner_nome,
      partner_avatar,
      partner_verified,
      nome: selected.nome,
      formato: selected.formato || "feed",
      criativo_url: selected.criativo_url,
      criativo_tipo: selected.criativo_tipo,
      call_to_action: selected.call_to_action,
      texto: selected.texto,
      tracking_url_impression,
      tracking_url_click,
    };
  }

  /**
   * Invalida o cache de serving (útil em testes ou quando campanhas são aprovadas/pausadas)
   */
  static clearCache(): void {
    servingCache.clear();
  }
}
