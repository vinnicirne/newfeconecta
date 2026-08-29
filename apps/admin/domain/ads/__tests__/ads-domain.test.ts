// =============================================================================
// Testes unitários — Domínio Ads / Campanhas + Carteira
//
// ESTRATÉGIA: Os services recebem o db via injeção de dependência.
// Nos testes, passamos um objeto mock — ZERO imports reais do Supabase.
// O Supabase é mocado via vi.mock para garantir que nenhum import real
// tente conectar à rede durante os testes.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mockar o módulo do Supabase antes de qualquer import dos services
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({})),
}));

import {
  canTransition,
  assertTransition,
  getAllowedTransitions,
  isTerminalStatus,
} from "../campaign-state-machine";

import {
  InvalidStatusTransitionError,
  InsufficientBalanceError,
} from "../types";

import { WalletLedgerService } from "../wallet-ledger.service";
import { CampaignService } from "../campaign.service";

// ---------------------------------------------------------------------------
// Helper: mock de SupabaseClient com padrão fluente (method chaining)
// ---------------------------------------------------------------------------
function makeMockChain(resolvedValue: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = [
    "select", "insert", "update", "delete", "eq", "neq",
    "not", "order", "limit", "range", "maybeSingle",
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

// ===========================================================================
// SUITE 1: Máquina de estados
// ===========================================================================
describe("CampaignStateMachine", () => {
  describe("canTransition — transições válidas", () => {
    it("rascunho → pendente ✓", () => expect(canTransition("rascunho", "pendente")).toBe(true));
    it("pendente → ativa ✓", () => expect(canTransition("pendente", "ativa")).toBe(true));
    it("pendente → reprovado ✓", () => expect(canTransition("pendente", "reprovado")).toBe(true));
    it("ativa → pausado ✓", () => expect(canTransition("ativa", "pausado")).toBe(true));
    it("pausado → ativa ✓", () => expect(canTransition("pausado", "ativa")).toBe(true));
    it("ativa → encerrado ✓", () => expect(canTransition("ativa", "encerrado")).toBe(true));
    it("pausado → encerrado ✓", () => expect(canTransition("pausado", "encerrado")).toBe(true));
  });

  describe("canTransition — transições bloqueadas", () => {
    it("rascunho → ativa ✗ (pula etapa)", () => expect(canTransition("rascunho", "ativa")).toBe(false));
    it("encerrado → ativa ✗ (terminal)", () => expect(canTransition("encerrado", "ativa")).toBe(false));
    it("encerrado → pendente ✗ (terminal)", () => expect(canTransition("encerrado", "pendente")).toBe(false));
    it("reprovado → ativa ✗ (terminal)", () => expect(canTransition("reprovado", "ativa")).toBe(false));
    it("reprovado → pendente ✗ (terminal)", () => expect(canTransition("reprovado", "pendente")).toBe(false));
  });

  describe("assertTransition", () => {
    it("lança InvalidStatusTransitionError em transição inválida", () => {
      expect(() => assertTransition("encerrado", "ativa")).toThrow(InvalidStatusTransitionError);
    });

    it("não lança em transição válida", () => {
      expect(() => assertTransition("pendente", "ativa")).not.toThrow();
    });

    it("erro carrega from e to corretos", () => {
      try {
        assertTransition("reprovado", "ativa");
        expect.fail("Deveria ter lançado");
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidStatusTransitionError);
        const err = e as InvalidStatusTransitionError;
        expect(err.from).toBe("reprovado");
        expect(err.to).toBe("ativa");
        expect(err.code).toBe("INVALID_STATUS_TRANSITION");
      }
    });
  });

  describe("helpers", () => {
    it("isTerminalStatus → true para encerrado e reprovado", () => {
      expect(isTerminalStatus("encerrado")).toBe(true);
      expect(isTerminalStatus("reprovado")).toBe(true);
    });

    it("isTerminalStatus → false para estados não-terminais", () => {
      expect(isTerminalStatus("ativa")).toBe(false);
      expect(isTerminalStatus("pendente")).toBe(false);
      expect(isTerminalStatus("pausado")).toBe(false);
    });

    it("getAllowedTransitions(pendente) contém ativa e reprovado", () => {
      const t = getAllowedTransitions("pendente");
      expect(t).toContain("ativa");
      expect(t).toContain("reprovado");
      expect(t).not.toContain("pausado");
    });

    it("getAllowedTransitions(encerrado) é lista vazia", () => {
      expect(getAllowedTransitions("encerrado")).toHaveLength(0);
    });
  });
});

// ===========================================================================
// SUITE 2: WalletLedgerService — lógica de domínio
// ===========================================================================
describe("WalletLedgerService", () => {
  let db: ReturnType<typeof createMockDb>;
  let ledger: WalletLedgerService;

  const walletId = "wallet-abc";
  const campaignId = "camp-xyz";

  beforeEach(() => {
    db = createMockDb();
    ledger = new WalletLedgerService(db);
  });

  // -------------------------------------------------------------------------
  // Teste 1: saldo insuficiente → erro antes de chamar RPC
  // -------------------------------------------------------------------------
  describe("[Teste 1 + 2] debitForCampaignApproval", () => {
    it("lança InsufficientBalanceError quando saldo < orçamento", async () => {
      db.from = vi.fn().mockReturnValue(
        makeMockChain({ data: { id: walletId, saldo_disponivel: 5000, saldo_investido: 0 }, error: null })
      );

      await expect(
        ledger.debitForCampaignApproval(walletId, campaignId, 10000)
      ).rejects.toThrow(InsufficientBalanceError);
    });

    it("NÃO chama RPC quando saldo insuficiente", async () => {
      db.from = vi.fn().mockReturnValue(
        makeMockChain({ data: { id: walletId, saldo_disponivel: 1000, saldo_investido: 0 }, error: null })
      );

      try { await ledger.debitForCampaignApproval(walletId, campaignId, 9999); } catch {}

      expect(db.rpc).not.toHaveBeenCalled();
    });

    it("erro contém required e available corretos", async () => {
      db.from = vi.fn().mockReturnValue(
        makeMockChain({ data: { id: walletId, saldo_disponivel: 3000, saldo_investido: 0 }, error: null })
      );

      try {
        await ledger.debitForCampaignApproval(walletId, campaignId, 8000);
        expect.fail("Deveria ter lançado");
      } catch (e) {
        const err = e as InsufficientBalanceError;
        expect(err).toBeInstanceOf(InsufficientBalanceError);
        expect(err.required).toBe(8000);
        expect(err.available).toBe(3000);
        expect(err.code).toBe("INSUFFICIENT_BALANCE");
      }
    });

    it("[Teste 2] chama RPC wallet_debit_campanha quando saldo suficiente", async () => {
      db.from = vi.fn().mockReturnValue(
        makeMockChain({ data: { id: walletId, saldo_disponivel: 20000, saldo_investido: 0 }, error: null })
      );

      const mockTx = { id: "tx-1", tipo: "debito_campanha", valor: 5000 };
      (db.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockTx, error: null });

      const result = await ledger.debitForCampaignApproval(walletId, campaignId, 5000);

      expect(db.rpc).toHaveBeenCalledWith("wallet_debit_campanha", {
        p_wallet_id: walletId,
        p_campaign_id: campaignId,
        p_valor: 5000,
      });
      expect(result).toEqual(mockTx);
    });
  });

  // -------------------------------------------------------------------------
  // Teste 3: estorno de reprovação — +disponível, SEM chamar MELI
  // -------------------------------------------------------------------------
  describe("[Teste 3] creditEstornoReprovacao", () => {
    it("chama RPC correta com parâmetros corretos", async () => {
      const mockTx = { id: "tx-2", tipo: "estorno_reprovacao", valor: 5000 };
      (db.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockTx, error: null });

      const result = await ledger.creditEstornoReprovacao(walletId, campaignId, 5000);

      expect(db.rpc).toHaveBeenCalledWith("wallet_credit_estorno_reprovacao", {
        p_wallet_id: walletId,
        p_campaign_id: campaignId,
        p_valor: 5000,
      });
      expect(result.tipo).toBe("estorno_reprovacao");
    });

    it("rejeita valor <= 0", async () => {
      await expect(
        ledger.creditEstornoReprovacao(walletId, campaignId, 0)
      ).rejects.toThrow("Valor de estorno deve ser > 0");
    });
  });

  // -------------------------------------------------------------------------
  // Teste 4: reembolso só debita com saldo suficiente via RPC
  // -------------------------------------------------------------------------
  describe("[Teste 4] debitReembolso", () => {
    it("lança InsufficientBalanceError quando saldo < valor de reembolso", async () => {
      db.from = vi.fn().mockReturnValue(
        makeMockChain({ data: { id: walletId, saldo_disponivel: 1000, saldo_investido: 0 }, error: null })
      );

      await expect(
        ledger.debitReembolso(walletId, 5000, "refund-001")
      ).rejects.toThrow(InsufficientBalanceError);

      expect(db.rpc).not.toHaveBeenCalled();
    });

    it("chama RPC wallet_debit_reembolso quando saldo suficiente", async () => {
      db.from = vi.fn().mockReturnValue(
        makeMockChain({ data: { id: walletId, saldo_disponivel: 10000, saldo_investido: 0 }, error: null })
      );

      const mockTx = { id: "tx-3", tipo: "reembolso", valor: 5000 };
      (db.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({ data: mockTx, error: null });

      await ledger.debitReembolso(walletId, 5000, "refund-001");

      expect(db.rpc).toHaveBeenCalledWith("wallet_debit_reembolso", {
        p_wallet_id: walletId,
        p_valor: 5000,
        p_refund_request_id: "refund-001",
      });
    });
  });

  // -------------------------------------------------------------------------
  // Teste 6: recarga cria tx no ledger com payment_id
  // -------------------------------------------------------------------------
  describe("[Teste 6] creditRecarga", () => {
    it("atualiza saldo e registra transação com payment_id", async () => {
      const mockTx = { id: "tx-4", tipo: "recarga", valor: 5000, payment_id: "mp-pay-999" };

      // Sequência de chamadas: select (buscar saldo) → update → insert
      let callCount = 0;
      db.from = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // from("wallets").select("saldo_disponivel").eq("id", ...).single()
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { saldo_disponivel: 0 }, error: null }),
              }),
            }),
          };
        }
        if (callCount === 2) {
          // from("wallets").update({ saldo_disponivel: 5000 }).eq("id", ...)
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        // from("wallet_transactions").insert(...).select("*").single()
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockTx, error: null }),
            }),
          }),
        };
      });

      const result = await ledger.creditRecarga(walletId, 5000, "mp-pay-999");

      expect(db.from).toHaveBeenCalledWith("wallets");
      expect(db.from).toHaveBeenCalledWith("wallet_transactions");
      expect(result.tipo).toBe("recarga");
      expect(result.payment_id).toBe("mp-pay-999");
    });

    it("rejeita valor <= 0 sem chamar banco", async () => {
      await expect(ledger.creditRecarga(walletId, 0, "mp-001")).rejects.toThrow(
        "Valor de recarga deve ser > 0"
      );
      await expect(ledger.creditRecarga(walletId, -50, "mp-002")).rejects.toThrow(
        "Valor de recarga deve ser > 0"
      );
      expect(db.from).not.toHaveBeenCalled();
    });
  });
});

// ===========================================================================
// SUITE 3: CampaignService
// ===========================================================================
describe("CampaignService", () => {
  let db: ReturnType<typeof createMockDb>;
  let service: CampaignService;
  const partnerId = "partner-001";

  beforeEach(() => {
    db = createMockDb();
    service = new CampaignService(db);
  });

  it("createCampaign cria campanha com status pendente e gasto=0", async () => {
    const mockCampaign = {
      id: "camp-001",
      partner_id: partnerId,
      nome: "Campanha Teste",
      status: "pendente",
      gasto: 0,
      orcamento: 10000,
    };

    db.from = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
    });

    const result = await service.createCampaign(partnerId, {
      nome: "Campanha Teste",
      formato: "feed",
      objetivo: "cliques",
      orcamento: 10000,
      periodo_inicio: "2026-09-01",
      periodo_fim: "2026-09-30",
    });

    expect(result.status).toBe("pendente");
    expect(result.gasto).toBe(0);
    expect(result.partner_id).toBe(partnerId);
  });

  it("approveCampaign chama RPC approve_campaign_atomic quando campanha está pendente", async () => {
    const mockPendingCampaign = {
      id: "camp-001",
      partner_id: partnerId,
      status: "pendente",
      orcamento: 10000,
    };
    const mockActiveCampaign = {
      ...mockPendingCampaign,
      status: "ativa",
    };

    db.from = vi.fn().mockReturnValue(
      makeMockChain({ data: mockPendingCampaign, error: null })
    );
    (db.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockActiveCampaign,
      error: null,
    });

    const result = await service.approveCampaign("camp-001", "admin-001");

    expect(db.rpc).toHaveBeenCalledWith("approve_campaign_atomic", {
      p_campaign_id: "camp-001",
      p_admin_id: "admin-001",
    });
    expect(result.status).toBe("ativa");
  });

  it("approveCampaign lança InvalidStatusTransitionError se campanha já estiver ativa ou encerrada", async () => {
    const mockClosedCampaign = {
      id: "camp-001",
      partner_id: partnerId,
      status: "encerrado",
      orcamento: 10000,
    };

    db.from = vi.fn().mockReturnValue(
      makeMockChain({ data: mockClosedCampaign, error: null })
    );

    await expect(
      service.approveCampaign("camp-001", "admin-001")
    ).rejects.toThrow(InvalidStatusTransitionError);

    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("approveCampaign lança InsufficientBalanceError quando RPC retorna erro de saldo", async () => {
    const mockPendingCampaign = {
      id: "camp-001",
      partner_id: partnerId,
      status: "pendente",
      orcamento: 10000,
    };

    db.from = vi.fn().mockReturnValue(
      makeMockChain({ data: mockPendingCampaign, error: null })
    );
    (db.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: "saldo_insuficiente:3000:10000" },
    });

    await expect(
      service.approveCampaign("camp-001", "admin-001")
    ).rejects.toThrow(InsufficientBalanceError);
  });

  it("rejectCampaign chama RPC reject_campaign_atomic", async () => {
    const mockPendingCampaign = {
      id: "camp-001",
      partner_id: partnerId,
      status: "pendente",
      orcamento: 10000,
    };
    const mockRejectedCampaign = {
      ...mockPendingCampaign,
      status: "reprovado",
      motivo_reprovacao: "Criativo fora das diretrizes",
    };

    db.from = vi.fn().mockReturnValue(
      makeMockChain({ data: mockPendingCampaign, error: null })
    );
    (db.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: mockRejectedCampaign,
      error: null,
    });

    const result = await service.rejectCampaign("camp-001", "admin-001", "Criativo fora das diretrizes");

    expect(db.rpc).toHaveBeenCalledWith("reject_campaign_atomic", {
      p_campaign_id: "camp-001",
      p_admin_id: "admin-001",
      p_motivo: "Criativo fora das diretrizes",
    });
    expect(result.status).toBe("reprovado");
    expect(result.motivo_reprovacao).toBe("Criativo fora das diretrizes");
  });

  it("rejectCampaign bloqueia transição inválida se campanha estiver encerrada", async () => {
    const mockClosedCampaign = {
      id: "camp-001",
      partner_id: partnerId,
      status: "encerrado",
      orcamento: 10000,
    };

    db.from = vi.fn().mockReturnValue(
      makeMockChain({ data: mockClosedCampaign, error: null })
    );

    await expect(
      service.rejectCampaign("camp-001", "admin-001")
    ).rejects.toThrow(InvalidStatusTransitionError);

    expect(db.rpc).not.toHaveBeenCalled();
  });

  it("[Teste 5] updateStatus usa assertTransition e bloqueia transição inválida SEM tocar no banco", async () => {
    await expect(
      service.updateStatus("camp-001", "encerrado", "ativa")
    ).rejects.toThrow(InvalidStatusTransitionError);

    // Garante que o banco não foi chamado
    expect(db.from).not.toHaveBeenCalled();
  });

  it("[Teste 5] updateStatus permite transição válida e chama banco", async () => {
    const mockCampaign = { id: "camp-001", status: "ativa" };
    db.from = vi.fn().mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockCampaign, error: null }),
    });

    const result = await service.updateStatus("camp-001", "pendente", "ativa");
    expect(result.status).toBe("ativa");
    expect(db.from).toHaveBeenCalledWith("campaigns");
  });
});
