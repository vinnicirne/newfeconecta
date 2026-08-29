import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { WalletLedgerService } from "@/domain/ads/wallet-ledger.service";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";

const refundSchema = z.object({
  valor: z
    .number({ required_error: "Valor é obrigatório" })
    .int("Valor deve ser inteiro (em centavos)")
    .min(100, "Valor mínimo de reembolso é R$ 1,00"),
  observacao: z.string().max(500).optional(),
});

/**
 * POST /api/wallet/refund-request
 * Parceiro solicita reembolso de parte do saldo disponível.
 * Não chama o Mercado Pago — apenas cria a solicitação para análise do admin.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = refundSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", detalhes: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { valor, observacao } = parsed.data;

    // Verificar saldo disponível
    const ledger = new WalletLedgerService();
    const wallet = await ledger.getOrCreateWallet(user.id);

    if (wallet.saldo_disponivel < valor) {
      return NextResponse.json(
        {
          error: "Saldo insuficiente para reembolso",
          saldo_disponivel: wallet.saldo_disponivel,
          solicitado: valor,
        },
        { status: 422 }
      );
    }

    // Criar solicitação de reembolso
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await db
      .from("refund_requests")
      .insert({
        wallet_id: wallet.id,
        valor,
        status: "aguardando",
        meta: observacao ? { observacao } : null,
      })
      .select("id, status, valor, solicitado_em")
      .single();

    if (error || !data) {
      throw new Error(`Erro ao criar solicitação: ${error?.message}`);
    }

    return NextResponse.json({
      id: data.id,
      status: data.status,
      valor: data.valor,
      solicitado_em: data.solicitado_em,
      mensagem:
        "Solicitação de reembolso enviada com sucesso. O admin analisará em breve.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[POST /api/wallet/refund-request]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/wallet/refund-request
 * Lista solicitações de reembolso do parceiro autenticado.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ledger = new WalletLedgerService();
    const wallet = await ledger.getOrCreateWallet(user.id);

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await db
      .from("refund_requests")
      .select("id, valor, status, solicitado_em, processado_em, motivo_rejeicao")
      .eq("wallet_id", wallet.id)
      .order("solicitado_em", { ascending: false });

    if (error) {
      throw new Error(`Erro ao buscar solicitações: ${error.message}`);
    }

    return NextResponse.json({ refund_requests: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[GET /api/wallet/refund-request]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
