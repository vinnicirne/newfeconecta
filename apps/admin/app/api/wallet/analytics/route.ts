import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { handleApiError } from "@/lib/api-error-handler";
import { createClient } from "@supabase/supabase-js";
import { WalletLedgerService } from "@/domain/ads/wallet-ledger.service";

export const dynamic = "force-dynamic";

function getAdminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * GET /api/wallet/analytics
 * Retorna evolução diária de saldo e movimentações dos últimos 30 dias.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const ledger = new WalletLedgerService();
    const wallet = await ledger.getOrCreateWallet(user.id);

    const db = getAdminDb();

    // Buscar transações dos últimos 30 dias
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: txs, error } = await db
      .from("wallet_transactions")
      .select("tipo, valor, created_at")
      .eq("wallet_id", wallet.id)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar histórico: ${error.message}`);
    }

    // Agrupa por dia
    const dailyMap = new Map<string, { data: string; entradas: number; saidas: number }>();

    (txs ?? []).forEach((tx) => {
      const day = new Date(tx.created_at).toISOString().split("T")[0];
      const current = dailyMap.get(day) || { data: day, entradas: 0, saidas: 0 };

      if (tx.tipo === "recarga" || tx.tipo === "estorno_reprovacao") {
        current.entradas += Number(tx.valor);
      } else {
        current.saidas += Number(tx.valor);
      }

      dailyMap.set(day, current);
    });

    const sparklineData = Array.from(dailyMap.values()).map((d) => d.entradas - d.saidas);

    return NextResponse.json({
      saldo_disponivel: wallet.saldo_disponivel,
      saldo_investido: wallet.saldo_investido,
      historico_dias: Array.from(dailyMap.values()),
      sparkline: sparklineData.length > 0 ? sparklineData : [0, 0],
    });
  } catch (error) {
    return handleApiError(error, "GET /api/wallet/analytics");
  }
}
