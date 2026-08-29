// =============================================================================
// FéConecta — lib/api-error-handler.ts
// Mapeamento centralizado de erros de domínio → respostas HTTP
//
// REGRA: Toda route handler chama handleApiError no catch.
// Nunca retornar 500 genérico para erros de domínio tipados.
// =============================================================================

import { NextResponse } from "next/server";
import {
  InsufficientBalanceError,
  InvalidStatusTransitionError,
  WalletNotFoundError,
  RefundRequestNotFoundError,
} from "@/domain/ads/types";

export function handleApiError(error: unknown, context?: string): NextResponse {
  const prefix = context ? `[${context}]` : "[API]";

  // -------------------------------------------------------------------------
  // Erros de domínio tipados — mapeados para status HTTP semânticos
  // -------------------------------------------------------------------------

  if (error instanceof InsufficientBalanceError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        saldo_disponivel: error.available,
        necessario: error.required,
      },
      { status: 402 } // Payment Required
    );
  }

  if (error instanceof InvalidStatusTransitionError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        from: error.from,
        to: error.to,
      },
      { status: 422 } // Unprocessable Entity
    );
  }

  if (error instanceof WalletNotFoundError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 404 }
    );
  }

  if (error instanceof RefundRequestNotFoundError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 404 }
    );
  }

  // -------------------------------------------------------------------------
  // Erros de RPC do Supabase — mensagens estruturadas das funções PostgreSQL
  // -------------------------------------------------------------------------

  if (error instanceof Error) {
    const msg = error.message;

    // Padrão das exceções lançadas pelos RPCs da Fase 2
    if (msg.includes("saldo_insuficiente")) {
      const parts = msg.match(/saldo_insuficiente:(\d+):(\d+)/);
      const available = parts ? parseInt(parts[1]) : 0;
      const required = parts ? parseInt(parts[2]) : 0;
      return NextResponse.json(
        {
          error: `Saldo insuficiente: disponível R$ ${(available / 100).toFixed(2)}, necessário R$ ${(required / 100).toFixed(2)}`,
          code: "INSUFFICIENT_BALANCE",
          saldo_disponivel: available,
          necessario: required,
        },
        { status: 402 }
      );
    }

    if (msg.includes("transicao_invalida")) {
      const from = msg.match(/transicao_invalida:(\w+)/)?.[1] ?? "desconhecido";
      return NextResponse.json(
        {
          error: `Transição de status inválida a partir de "${from}"`,
          code: "INVALID_STATUS_TRANSITION",
          from,
        },
        { status: 422 }
      );
    }

    if (msg.includes("campanha_nao_encontrada")) {
      return NextResponse.json(
        { error: "Campanha não encontrada", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    if (msg.includes("carteira_nao_encontrada")) {
      return NextResponse.json(
        { error: "Carteira não encontrada para este parceiro", code: "WALLET_NOT_FOUND" },
        { status: 404 }
      );
    }

    // Erro genérico com mensagem
    console.error(`${prefix}`, error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Fallback desconhecido
  console.error(`${prefix} Erro desconhecido:`, error);
  return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
}
