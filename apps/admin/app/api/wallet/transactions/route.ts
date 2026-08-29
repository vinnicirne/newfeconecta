import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { WalletLedgerService } from "@/domain/ads/wallet-ledger.service";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/**
 * GET /api/wallet/transactions?page=1&pageSize=50&tipo=...
 * Retorna extrato completo paginado das transações do parceiro com nomes de campanhas.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "50")));
    const tipo = searchParams.get("tipo");

    const ledger = new WalletLedgerService();
    const wallet = await ledger.getOrCreateWallet(user.id);

    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = db
      .from("wallet_transactions")
      .select("id, tipo, valor, campaign_id, payment_id, created_at", { count: "exact" })
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (tipo && tipo !== "todos") {
      query = query.eq("tipo", tipo);
    }

    const { data: txRaw, error, count } = await query;

    if (error) {
      throw new Error(`Erro ao buscar extrato: ${error.message}`);
    }

    // Busca nomes de campanhas vinculadas
    const campaignIds = Array.from(new Set((txRaw ?? []).map((t) => t.campaign_id).filter(Boolean)));
    let campMap: Record<string, string> = {};
    if (campaignIds.length > 0) {
      const { data: camps } = await db
        .from("campaigns")
        .select("id, nome")
        .in("id", campaignIds);
      if (camps) {
        campMap = camps.reduce((acc: any, c: any) => ({ ...acc, [c.id]: c.nome }), {});
      }
    }

    const transactions = (txRaw ?? []).map((tx) => ({
      id: tx.id,
      tipo: tx.tipo,
      valor: tx.valor,
      campaign_id: tx.campaign_id,
      campaign_nome: tx.campaign_id ? campMap[tx.campaign_id] || null : null,
      payment_id: tx.payment_id,
      created_at: tx.created_at,
    }));

    return NextResponse.json({
      transactions,
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    console.error("[GET /api/wallet/transactions]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
