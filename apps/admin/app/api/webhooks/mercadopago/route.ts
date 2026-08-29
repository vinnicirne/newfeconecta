import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { WalletLedgerService } from "@/domain/ads/wallet-ledger.service";
import { createHmac } from "crypto";

export const dynamic = "force-dynamic";

/**
 * Valida a assinatura do Mercado Pago (x-signature).
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
function validateMPSignature(request: Request, rawBody: string): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  // Se não tiver secret configurado, pula validação (dev local)
  if (!secret) {
    console.warn("[Webhook MP] MERCADOPAGO_WEBHOOK_SECRET não configurado — assinatura ignorada");
    return true;
  }

  const xSignature = request.headers.get("x-signature");
  const xRequestId = request.headers.get("x-request-id");
  const dataId = new URL(request.url).searchParams.get("data.id");

  if (!xSignature) return false;

  // Extrai ts e v1 do header x-signature
  const parts = Object.fromEntries(
    xSignature.split(",").map(p => {
      const [k, v] = p.trim().split("=");
      return [k, v];
    })
  );

  const ts = parts["ts"];
  const v1 = parts["v1"];

  if (!ts || !v1) return false;

  // Monta a string de assinatura
  const manifest = [
    dataId ? `id:${dataId}` : null,
    xRequestId ? `request-id:${xRequestId}` : null,
    `ts:${ts}`,
  ]
    .filter(Boolean)
    .join(";");

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  return expected === v1;
}

/**
 * POST /api/webhooks/mercadopago
 *
 * Recebe notificações do Mercado Pago sobre pagamentos.
 * Quando um pagamento de topup é aprovado, credita o saldo na carteira via ledger.
 */
export async function POST(request: Request) {
  try {
    // Lemos o body como texto para poder validar a assinatura ANTES de parsear
    const rawBody = await request.text().catch(() => "");

    if (!rawBody) {
      return NextResponse.json({ error: "Body inválido" }, { status: 400 });
    }

    // Validação de assinatura do Mercado Pago
    if (!validateMPSignature(request, rawBody)) {
      console.warn("[Webhook MP] Assinatura x-signature inválida — rejeitado");
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    console.log("[Webhook MP] Notificação recebida:", JSON.stringify(body));


    // Mercado Pago envia dois formatos de notificação:
    // 1. IPN clássico: { topic: "payment", resource: "https://.../{id}" }
    // 2. Webhook moderno: { type: "payment", data: { id: "..." } }

    let paymentId: string | null = null;

    if (body.type === "payment" && body.data?.id) {
      paymentId = String(body.data.id);
    } else if (body.topic === "payment" && body.resource) {
      const parts = String(body.resource).split("/");
      paymentId = parts[parts.length - 1];
    }

    if (!paymentId) {
      // Notificação de outro tipo (ex: subscription, merchant_order) — ignorar
      return NextResponse.json({ received: true, processed: false });
    }

    // Buscar detalhes do pagamento na API do MELI
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!mpToken) {
      console.error("[Webhook MP] MERCADOPAGO_ACCESS_TOKEN não configurado");
      return NextResponse.json({ error: "Configuração incompleta" }, { status: 500 });
    }

    const paymentRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: { Authorization: `Bearer ${mpToken}` },
      }
    );

    if (!paymentRes.ok) {
      console.error("[Webhook MP] Falha ao consultar pagamento:", paymentId);
      return NextResponse.json({ error: "Falha ao consultar pagamento" }, { status: 502 });
    }

    const payment = await paymentRes.json();

    // Só processar pagamentos aprovados
    if (payment.status !== "approved") {
      console.log(`[Webhook MP] Pagamento ${paymentId} status=${payment.status} — ignorado`);
      return NextResponse.json({ received: true, processed: false, status: payment.status });
    }

    // Verificar se é uma recarga de carteira
    // external_reference formato: "topup:{walletId}:{partnerId}"
    const externalRef: string = payment.external_reference ?? "";
    if (!externalRef.startsWith("topup:")) {
      console.log("[Webhook MP] Pagamento não é topup:", externalRef);
      return NextResponse.json({ received: true, processed: false });
    }

    const parts = externalRef.split(":");
    const walletId = parts[1];

    if (!walletId) {
      console.error("[Webhook MP] walletId ausente na external_reference:", externalRef);
      return NextResponse.json({ error: "Referência inválida" }, { status: 400 });
    }

    // Verificar se já foi processado (idempotência)
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: existing } = await db
      .from("wallet_transactions")
      .select("id")
      .eq("payment_id", paymentId)
      .eq("tipo", "recarga")
      .maybeSingle();

    if (existing) {
      console.log(`[Webhook MP] Pagamento ${paymentId} já processado — idempotente`);
      return NextResponse.json({ received: true, processed: false, reason: "already_processed" });
    }

    // Converter valor para centavos (MELI retorna em reais)
    const valorCentavos = Math.round(payment.transaction_amount * 100);

    // Creditar saldo via ledger
    const ledger = new WalletLedgerService();
    await ledger.creditRecarga(walletId, valorCentavos, paymentId);

    console.log(
      `[Webhook MP] Recarga processada: wallet=${walletId}, valor=${valorCentavos}c, payment=${paymentId}`
    );

    return NextResponse.json({
      received: true,
      processed: true,
      wallet_id: walletId,
      valor_centavos: valorCentavos,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[Webhook MP] Erro crítico:", error);
    // Retornar 200 para o MELI não retentar (o erro foi nosso, não de comunicação)
    return NextResponse.json({ received: true, processed: false, error: message });
  }
}
