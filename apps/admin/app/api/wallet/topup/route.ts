import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { WalletLedgerService } from "@/domain/ads/wallet-ledger.service";
import { getMercadoPagoClient } from "@/domain/ads/mercadopago.client";
import { z } from "zod";

export const dynamic = "force-dynamic";

const topupSchema = z.object({
  valor: z
    .number({ required_error: "Valor é obrigatório" })
    .int("Valor deve ser inteiro (em centavos)")
    .min(5000, "Valor mínimo de recarga é R$ 50,00 (5000 centavos)"),
  method: z.enum(["pix", "preference", "sandbox_simulate"]).optional().default("preference"),
});

export async function POST(request: Request) {
  try {
    // 1. Autenticação
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado: faça login novamente" }, { status: 401 });
    }

    // 2. Validação do body
    const body = await request.json().catch(() => ({}));
    const parsed = topupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Dados inválidos", detalhes: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { valor, method } = parsed.data;

    // 3. Buscar/criar carteira do parceiro
    const ledger = new WalletLedgerService();
    const wallet = await ledger.getOrCreateWallet(user.id);

    // 4. Simulação de sandbox (teste interno sem MP)
    if (method === "sandbox_simulate") {
      const paymentId = `sandbox-topup-${Date.now()}`;
      await ledger.creditRecarga(wallet.id, valor, paymentId);
      const updated = await ledger.getWalletById(wallet.id);
      return NextResponse.json({
        success: true,
        method: "sandbox_simulate",
        payment_id: paymentId,
        new_balance: updated.saldo_disponivel,
      });
    }
    const mp = getMercadoPagoClient();

    // 4. Se método for PIX Transparente
    if (method === "pix") {
      try {
        const pixResult = await mp.createPixPayment(
          valor,
          user.id,
          wallet.id,
          user.email || "contato@feconecta.com.br",
          user.user_metadata?.full_name || user.user_metadata?.name || "Parceiro FéConecta"
        );

        return NextResponse.json({
          success: true,
          method: "pix",
          payment_id: pixResult.payment_id,
          status: pixResult.status,
          qr_code: pixResult.qr_code,
          qr_code_base64: pixResult.qr_code_base64,
          ticket_url: pixResult.ticket_url,
        });
      } catch (pixErr: unknown) {
        const message =
          pixErr instanceof Error ? pixErr.message : "Falha ao gerar cobrança Pix no Mercado Pago";
        console.error("[POST /api/wallet/topup] Falha no Pix transparente:", pixErr);
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    // 5. Fallback para Preference (quando method === "preference")
    const preference = await mp.createTopupPreference(
      valor,
      user.id,
      wallet.id,
      user.email || undefined
    );

    return NextResponse.json({
      success: true,
      method: "preference",
      preference_id: preference.preference_id,
      init_point: preference.init_point,
      sandbox_init_point: preference.sandbox_init_point,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[POST /api/wallet/topup]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
