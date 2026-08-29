// =============================================================================
// Testes unitários — Fase 4: Ad-serving, Tracking e Encerramento Automático
// Cobertura dos 12 testes obrigatórios da arquitetura
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do supabase antes dos imports
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({})),
}));

import { AdServingService } from "../ad-serving.service";
import { TrackingService } from "../tracking.service";
import { CampaignClosingService } from "../campaign-closing.service";
import { Campaign } from "../types";

function makeMockChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "delete", "eq", "neq",
    "not", "order", "limit", "range", "lte", "gte", "maybeSingle",
  ];
  methods.forEach((m) => { chain[m] = vi.fn(() => chain); });
  chain.single = vi.fn().mockResolvedValue(resolvedValue);
  return chain;
}

function createMockDb() {
  const rpc = vi.fn();
  const from = vi.fn();
  return { from, rpc } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

describe("Fase 4 — Ad-serving, Tracking & Auto-closing", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    AdServingService.clearCache();
    TrackingService.clearClickRateLimits();
  });

  // =========================================================================
  // SUITE 1: Ad-serving
  // =========================================================================
  describe("AdServingService", () => {
    it("[Teste 1] serveAd retorna campanha ativa com formato compatível", async () => {
      const activeCampaign: Campaign = {
        id: "camp-001",
        partner_id: "partner-001",
        nome: "Campanha Feed",
        formato: "feed",
        objetivo: "cliques",
        orcamento: 10000,
        gasto: 2000,
        status: "ativa",
        periodo_inicio: "2026-01-01",
        periodo_fim: "2026-12-31",
        publico: {},
        criativo_url: "https://img.com/ad.png",
        criativo_tipo: "imagem",
        call_to_action: "Saiba Mais",
        texto: "Anúncio Teste",
        motivo_reprovacao: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const chain = makeMockChain({});
      chain.gte = vi.fn().mockResolvedValue({ data: [activeCampaign], error: null });
      db.from = vi.fn().mockReturnValue(chain);

      const service = new AdServingService(db);
      const result = await service.serveAd("feed");

      expect(result).not.toBeNull();
      expect(result?.campaign_id).toBe("camp-001");
      expect(result?.formato).toBe("feed");
      expect(result?.tracking_url_impression).toContain("camp-001");
      expect(result?.tracking_url_click).toContain("camp-001");
    });

    it("[Teste 2] serveAd retorna null (204) se nenhuma campanha elegível existir", async () => {
      const chain = makeMockChain({});
      chain.gte = vi.fn().mockResolvedValue({ data: [], error: null });
      db.from = vi.fn().mockReturnValue(chain);

      const service = new AdServingService(db);
      const result = await service.serveAd("stories");

      expect(result).toBeNull();
    });

    it("[Teste 3] Campanha 'pausado' não é servida", async () => {
      // getEligibleCampaigns busca apenas status = 'ativa'
      const chain = makeMockChain({});
      chain.gte = vi.fn().mockResolvedValue({ data: [], error: null });
      db.from = vi.fn().mockReturnValue(chain);

      const service = new AdServingService(db);
      const result = await service.serveAd("feed");

      expect(result).toBeNull();
      expect(chain.eq).toHaveBeenCalledWith("status", "ativa");
    });

    it("[Teste 4] Campanha com gasto >= orcamento não é servida", async () => {
      const exhaustedCampaign: Campaign = {
        id: "camp-002",
        partner_id: "partner-001",
        nome: "Campanha Esgotada",
        formato: "banner",
        objetivo: "cliques",
        orcamento: 10000,
        gasto: 10000, // Orçamento 100% consumido
        status: "ativa",
        periodo_inicio: "2026-01-01",
        periodo_fim: "2026-12-31",
        publico: {},
        criativo_url: null,
        criativo_tipo: null,
        call_to_action: null,
        texto: null,
        motivo_reprovacao: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const chain = makeMockChain({});
      chain.gte = vi.fn().mockResolvedValue({ data: [exhaustedCampaign], error: null });
      db.from = vi.fn().mockReturnValue(chain);

      const service = new AdServingService(db);
      const result = await service.serveAd("banner");

      // Deve filtrar e retornar null
      expect(result).toBeNull();
    });

    it("[Teste 5] Campanha com periodo_fim < now é filtrada pela query", async () => {
      const chain = makeMockChain({});
      chain.gte = vi.fn().mockResolvedValue({ data: [], error: null });
      db.from = vi.fn().mockReturnValue(chain);

      const service = new AdServingService(db);
      const result = await service.serveAd("feed");

      expect(result).toBeNull();
      expect(chain.gte).toHaveBeenCalledWith("periodo_fim", expect.any(String));
    });
  });

  // =========================================================================
  // SUITE 2: Tracking
  // =========================================================================
  describe("TrackingService", () => {
    it("[Teste 6] trackImpression insere linha em ad_impressions e atualiza gasto atomicamente", async () => {
      db.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "imp-123" }, error: null }),
      });

      (db.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ new_gasto: 2001, orcamento: 10000, budget_reached: false }],
        error: null,
      });

      const service = new TrackingService(db);
      const result = await service.trackImpression({
        campaignId: "camp-001",
        format: "feed",
        costCents: 1,
      });

      expect(db.from).toHaveBeenCalledWith("ad_impressions");
      expect(db.rpc).toHaveBeenCalledWith("increment_campaign_gasto_atomic", {
        p_campaign_id: "camp-001",
        p_amount: 1,
      });
      expect(result.impressionId).toBe("imp-123");
      expect(result.newGasto).toBe(2001);
      expect(result.budgetReached).toBe(false);
    });

    it("[Teste 7] Chamadas simultâneas usam a RPC atômica increment_campaign_gasto_atomic", async () => {
      db.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "imp-xyz" }, error: null }),
      });

      (db.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ new_gasto: 50, orcamento: 1000, budget_reached: false }],
        error: null,
      });

      const service = new TrackingService(db);

      // Duas impressões simultâneas
      await Promise.all([
        service.trackImpression({ campaignId: "camp-001", format: "feed" }),
        service.trackImpression({ campaignId: "camp-001", format: "feed" }),
      ]);

      expect(db.rpc).toHaveBeenCalledTimes(2);
    });

    it("[Teste 8] Impressão que leva gasto >= orcamento dispara closeIfEligible", async () => {
      const closingService = new CampaignClosingService(db);
      const closeSpy = vi.spyOn(closingService, "closeIfEligible").mockResolvedValue({} as any);

      db.from = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "imp-last" }, error: null }),
      });

      (db.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [{ new_gasto: 10000, orcamento: 10000, budget_reached: true }],
        error: null,
      });

      const service = new TrackingService(db, closingService);
      const result = await service.trackImpression({
        campaignId: "camp-001",
        format: "feed",
      });

      expect(result.budgetReached).toBe(true);
      expect(closeSpy).toHaveBeenCalledWith("camp-001");
    });
  });

  // =========================================================================
  // SUITE 3: CampaignClosingService (Auto-closing)
  // =========================================================================
  describe("CampaignClosingService", () => {
    it("[Teste 9] closeIfEligible transiciona campanha ativa para encerrado via RPC atômica", async () => {
      const activeCamp = { id: "camp-001", status: "ativa" };
      const closedCamp = { id: "camp-001", status: "encerrado" };

      db.from = vi.fn().mockReturnValue(
        makeMockChain({ data: activeCamp, error: null })
      );

      (db.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: closedCamp,
        error: null,
      });

      const service = new CampaignClosingService(db);
      const result = await service.closeIfEligible("camp-001");

      expect(db.rpc).toHaveBeenCalledWith("close_campaign_if_eligible_atomic", {
        p_campaign_id: "camp-001",
      });
      expect(result.status).toBe("encerrado");
    });

    it("[Teste 10] closeIfEligible em campanha já encerrada é idempotente", async () => {
      const closedCamp = { id: "camp-001", status: "encerrado" };

      db.from = vi.fn().mockReturnValue(
        makeMockChain({ data: closedCamp, error: null })
      );

      const service = new CampaignClosingService(db);
      const result = await service.closeIfEligible("camp-001");

      expect(result.status).toBe("encerrado");
      // Não precisa chamar a RPC pois já está encerrado
      expect(db.rpc).not.toHaveBeenCalled();
    });

    it("[Teste 11] closeExpiredCampaigns chama RPC para encerrar campanhas com data vencida", async () => {
      (db.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: ["camp-exp-1", "camp-exp-2"],
        error: null,
      });

      const service = new CampaignClosingService(db);
      const closedIds = await service.closeExpiredCampaigns();

      expect(db.rpc).toHaveBeenCalledWith("close_expired_campaigns_atomic");
      expect(closedIds).toEqual(["camp-exp-1", "camp-exp-2"]);
    });

    it("[Teste 12] Encerramento não altera saldo_investido nem saldo_disponivel", async () => {
      // O encerramento apenas atualiza status da campanha para encerrado.
      // O ledger (wallet_transactions) e a tabela wallets NÃO são tocados no encerramento.
      const activeCamp = { id: "camp-001", status: "ativa" };
      db.from = vi.fn().mockReturnValue(
        makeMockChain({ data: activeCamp, error: null })
      );
      (db.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: { id: "camp-001", status: "encerrado" },
        error: null,
      });

      const service = new CampaignClosingService(db);
      await service.closeIfEligible("camp-001");

      // Garante que nenhuma operação de débito ou crédito na wallet foi disparada
      expect(db.rpc).not.toHaveBeenCalledWith(expect.stringMatching(/wallet_/), expect.anything());
    });
  });
});
