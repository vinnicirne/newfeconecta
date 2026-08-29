import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { WalletLedgerService } from "@/domain/ads/wallet-ledger.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/wallet
 * Retorna saldo disponível, investido, total aportado e últimas transações.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ledger = new WalletLedgerService();
    const wallet = await ledger.getOrCreateWallet(user.id);
    const balances = await ledger.getBalances(wallet.id);

    return NextResponse.json(balances);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[GET /api/wallet]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
