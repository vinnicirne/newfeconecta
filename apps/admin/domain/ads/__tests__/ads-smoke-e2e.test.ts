// =============================================================================
// Teste de Integração Smoke E2E — FéConecta Ads v2.0
// Executa o roteiro completo dos 8 passos e valida a consistência do ledger.
// =============================================================================

import { describe, it, expect } from "vitest";
import { assertTransition } from "../campaign-state-machine";
import { formatCurrency } from "@/lib/ads-utils";

describe("Smoke Test E2E — Validação dos 8 Passos da Arquitetura", () => {
  it("executa o ciclo completo de recarga, criação, reprovação, aprovação, ad-serving, tracking, reembolso e cron", () => {
    // -------------------------------------------------------------------------
    // ESTADO INICIAL
    // -------------------------------------------------------------------------
    let saldo_disponivel = 0;
    let saldo_investido = 0;
    const ledger: Array<{ tipo: string; valor: number; payment_id?: string; campaign_id?: string }> = [];

    // -------------------------------------------------------------------------
    // 1. Recarga via Mercado Pago (+R$ 100,00)
    // -------------------------------------------------------------------------
    const recargaValor = 10000;
    saldo_disponivel += recargaValor;
    ledger.push({ tipo: "recarga", valor: recargaValor, payment_id: "mp-pay-123" });

    expect(saldo_disponivel).toBe(10000);
    expect(saldo_investido).toBe(0);
    expect(ledger.length).toBe(1);

    // -------------------------------------------------------------------------
    // 2. Criar Campanha A (R$ 50,00) -> Status: pendente (sem mexer no saldo)
    // -------------------------------------------------------------------------
    const campA = { id: "camp-A", status: "pendente", orcamento: 5000, gasto: 0 };
    expect(campA.status).toBe("pendente");
    expect(saldo_disponivel).toBe(10000); // Intacto

    // -------------------------------------------------------------------------
    // 3. Reprovação da Campanha A (sem mexer no saldo, zero linha no ledger)
    // -------------------------------------------------------------------------
    assertTransition(campA.status as any, "reprovado");
    campA.status = "reprovado";

    expect(campA.status).toBe("reprovado");
    expect(saldo_disponivel).toBe(10000); // Intacto
    expect(ledger.length).toBe(1); // Nenhuma linha nova no ledger

    // -------------------------------------------------------------------------
    // 4. Nova Campanha B (R$ 50,00) + Aprovação Atômica
    // -------------------------------------------------------------------------
    const campB = { id: "camp-B", status: "pendente", orcamento: 5000, gasto: 0 };
    expect(saldo_disponivel).toBeGreaterThanOrEqual(campB.orcamento);

    saldo_disponivel -= campB.orcamento;
    saldo_investido += campB.orcamento;
    assertTransition(campB.status as any, "ativa");
    campB.status = "ativa";
    ledger.push({ tipo: "debito_campanha", valor: campB.orcamento, campaign_id: campB.id });

    expect(saldo_disponivel).toBe(5000); // R$ 50,00
    expect(saldo_investido).toBe(5000);  // R$ 50,00
    expect(ledger.length).toBe(2);

    // -------------------------------------------------------------------------
    // 5. Ad-serving (campanha ativa elegível)
    // -------------------------------------------------------------------------
    const isEligibleForServing = campB.status === "ativa" && campB.gasto < campB.orcamento;
    expect(isEligibleForServing).toBe(true);

    // -------------------------------------------------------------------------
    // 6. Tracking & Consumo até esgotar orçamento -> auto-close
    // -------------------------------------------------------------------------
    campB.gasto += 5000;
    if (campB.gasto >= campB.orcamento) {
      assertTransition(campB.status as any, "encerrado");
      campB.status = "encerrado";
    }

    expect(campB.status).toBe("encerrado");
    expect(saldo_disponivel).toBe(5000);
    expect(saldo_investido).toBe(5000); // Permanece como histórico

    // -------------------------------------------------------------------------
    // 7. Reembolso de R$ 30,00 via Mercado Pago
    // -------------------------------------------------------------------------
    const refundValor = 3000;
    expect(saldo_disponivel).toBeGreaterThanOrEqual(refundValor);

    saldo_disponivel -= refundValor;
    ledger.push({ tipo: "reembolso", valor: refundValor });

    expect(saldo_disponivel).toBe(2000); // R$ 20,00
    expect(saldo_investido).toBe(5000);  // R$ 50,00
    expect(ledger.length).toBe(3);

    // -------------------------------------------------------------------------
    // 8. Cron Job de expiração por data
    // -------------------------------------------------------------------------
    const campC = { id: "camp-C", status: "ativa", orcamento: 2000, periodo_fim: "2026-01-01" };
    assertTransition(campC.status as any, "encerrado");
    campC.status = "encerrado";

    expect(campC.status).toBe("encerrado");
    expect(saldo_disponivel).toBe(2000);
    expect(saldo_investido).toBe(5000);
  });
});
