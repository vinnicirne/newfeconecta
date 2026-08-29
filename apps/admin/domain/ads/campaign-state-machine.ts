// =============================================================================
// FéConecta — Domínio Ads
// Máquina de estados da Campanha
// 
// REGRA: Nenhum status é alterado sem passar por assertTransition().
//        Qualquer código que altere status DEVE chamar esta função primeiro.
// =============================================================================

import { CampaignStatus, InvalidStatusTransitionError } from "./types";

// ---------------------------------------------------------------------------
// Grafo de transições permitidas
// ---------------------------------------------------------------------------
//
//  rascunho ──► pendente ──► ativa ──► pausado
//                    │          │         │
//                    │          └────────►│
//                    │                   │
//                    ▼                   ▼
//               reprovado           encerrado (terminal)
//               (terminal)
//
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  rascunho:  ["pendente"],
  pendente:  ["ativa", "reprovado"],
  ativa:     ["pausado", "encerrado"],
  pausado:   ["ativa", "encerrado"],
  reprovado: [],    // estado terminal
  encerrado: [],    // estado terminal
};

/**
 * Verifica se uma transição de status é permitida.
 * Não lança erro — apenas retorna true/false.
 */
export function canTransition(from: CampaignStatus, to: CampaignStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

/**
 * Valida e lança erro se a transição for inválida.
 * USE ESTA FUNÇÃO em qualquer serviço que altere o status de uma campanha.
 *
 * @throws {InvalidStatusTransitionError} se a transição não for permitida
 */
export function assertTransition(from: CampaignStatus, to: CampaignStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidStatusTransitionError(from, to);
  }
}

/**
 * Retorna as transições permitidas a partir de um status.
 * Útil para renderizar ações disponíveis na UI do admin.
 */
export function getAllowedTransitions(from: CampaignStatus): CampaignStatus[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

/**
 * Verifica se um status é terminal (não permite mais transições).
 */
export function isTerminalStatus(status: CampaignStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}
