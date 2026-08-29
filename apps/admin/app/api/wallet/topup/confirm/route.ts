import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { WalletLedgerService } from "@/domain/ads/wallet-ledger.service";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";

const confirmSchema = z.object({
  payment_id: z.string().min(1, "Payment ID é obrigatório"),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    const { payment_id } = parsed.data;

    const ledger = new WalletLedgerService();
    const wallet = await ledger.getOrCreateWallet(user.id);

    // 1. Verifica se já foi creditado (idempotência)
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existing } = await db
      .from("wallet_transactions")
      .select("id, valor")
      .eq("payment_id", payment_id)
      .eq("tipo", "recarga")
      .maybeSingle();

    if (existing) {
      const updated = await ledger.getBalances(wallet.id);
      return NextResponse.json({
        success: true,
        already_processed: true,
        balances: updated,
      });
    }

    // 2. Consulta o pagamento na API do Mercado Pago
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!mpToken) {
      return NextResponse.json({ error: "MERCADOPAGO_ACCESS_TOKEN não configurado" }, { status: 500 });
    }

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });

    if (!paymentRes.ok) {
      return NextResponse.json({ error: "Falha ao consultar status do pagamento no Mercado Pago" }, { status: 502 });
    }

    const payment = await paymentRes.json();

    if (payment.status !== "approved") {
      return NextResponse.json({
        success: false,
        status: payment.status,
        message: `Pagamento ainda não aprovado (status: ${payment.status})`,
      });
    }

    const valorCentavos = Math.round(payment.transaction_amount * 100);

    // 3. Credita saldo na carteira
    await ledger.creditRecarga(wallet.id, valorCentavos, payment_id);
    const updated = await ledger.getBalances(wallet.id);

    return NextResponse.json({
      success: true,
      credited_amount: valorCentavos,
      balances: updated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[POST /api/wallet/topup/confirm]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
