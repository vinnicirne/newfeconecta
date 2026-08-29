import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { WalletLedgerService } from "@/domain/ads/wallet-ledger.service";
import { getMercadoPagoClient } from "@/domain/ads/mercadopago.client";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/refunds/[id]/approve
 *
 * Admin aprova solicitação de reembolso:
 * 1. Verifica que a solicitação está em "aguardando"
 * 2. Chama API do Mercado Pago para reembolso
 * 3. Em sucesso: debitReembolso no ledger + status "aprovado"
 * 4. Em falha: status "falhou" — saldo NÃO é debitado
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Auth — apenas admin
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // Verificar se é admin (campo role no profile)
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await db
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin" || profile?.role === "superadmin" || profile?.role === "moderator";
    if (!isAdmin) {
      return NextResponse.json({ error: "Acesso negado: requer permissão de admin" }, { status: 403 });
    }

    const refundId = params.id;

    // 2. Buscar a solicitação
    const { data: refundRequest, error: rfError } = await db
      .from("refund_requests")
      .select("*, wallets(id, saldo_disponivel, partner_id)")
      .eq("id", refundId)
      .single();

    if (rfError || !refundRequest) {
      return NextResponse.json({ error: "Solicitação não encontrada" }, { status: 404 });
    }

    if (refundRequest.status !== "aguardando") {
      return NextResponse.json(
        { error: `Solicitação não pode ser aprovada: status atual é "${refundRequest.status}"` },
        { status: 422 }
      );
    }

    // 3. Verificar se há payment_id para reembolso via MELI
    // O payment_id vem da recarga mais recente da wallet
    const { data: ultimaRecarga } = await db
      .from("wallet_transactions")
      .select("payment_id")
      .eq("wallet_id", refundRequest.wallet_id)
      .eq("tipo", "recarga")
      .not("payment_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!ultimaRecarga?.payment_id) {
      return NextResponse.json(
        {
          error:
            "Reembolso não pode ser processado: nenhum payment_id encontrado para esta carteira. " +
            "Entre em contato com o suporte.",
        },
        { status: 422 }
      );
    }

    const paymentId = ultimaRecarga.payment_id;

    // 4. Chamar API do Mercado Pago
    const mp = getMercadoPagoClient();
    let mpRefundId: string | null = null;
    let mpSuccess = false;
    let mpError: string | null = null;

    try {
      const result = await mp.refundPayment(paymentId, refundRequest.valor);
      mpRefundId = result.refund_id;
      mpSuccess = result.status === "approved";

      if (!mpSuccess) {
        mpError = `Reembolso MELI status: ${result.status}`;
      }
    } catch (err: unknown) {
      mpError = err instanceof Error ? err.message : "Erro desconhecido na API MELI";
      console.error("[Admin Refund Approve] Falha na API MELI:", err);
    }

    if (!mpSuccess) {
      // Atualizar status para "falhou" SEM debitar saldo
      await db
        .from("refund_requests")
        .update({
          status: "falhou",
          processado_em: new Date().toISOString(),
          admin_id: user.id,
          meta: { erro_meli: mpError, payment_id_tentado: paymentId },
        })
        .eq("id", refundId);

      return NextResponse.json(
        {
          error: "Falha ao processar reembolso no Mercado Pago",
          detalhes: mpError,
          saldo_preservado: true,
        },
        { status: 502 }
      );
    }

    // 5. MELI confirmou — debitar saldo via ledger
    const ledger = new WalletLedgerService();
    await ledger.debitReembolso(
      refundRequest.wallet_id,
      refundRequest.valor,
      refundId
    );

    // 6. Atualizar solicitação para "aprovado"
    const { data: updated } = await db
      .from("refund_requests")
      .update({
        status: "aprovado",
        mp_refund_id: mpRefundId,
        processado_em: new Date().toISOString(),
        admin_id: user.id,
      })
      .eq("id", refundId)
      .select("id, status, mp_refund_id, processado_em")
      .single();

    console.log(
      `[Admin Refund Approve] Reembolso aprovado: id=${refundId}, mp_refund_id=${mpRefundId}`
    );

    return NextResponse.json({
      id: updated?.id,
      status: updated?.status,
      mp_refund_id: updated?.mp_refund_id,
      processado_em: updated?.processado_em,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[POST /api/admin/refunds/[id]/approve]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
