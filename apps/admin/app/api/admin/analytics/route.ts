import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-server";
import { handleApiError } from "@/lib/api-error-handler";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function requireAdmin(request: Request) {
  const user = await requireAuth(request).catch(() => null);
  if (!user) throw Object.assign(new Error("Não autorizado"), { status: 401 });

  const { data: profile } = await getAdminDb()
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin" || profile?.role === "moderator";
  if (!isAdmin) {
    throw Object.assign(new Error("Acesso negado: requer permissão de admin"), { status: 403 });
  }

  return user;
}

/**
 * GET /api/admin/analytics
 * Retorna métricas consolidadas globais de todas as campanhas, impressões e cliques.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const db = getAdminDb();

    // 1. Contagem de campanhas por status
    const { data: campaigns, error: campErr } = await db
      .from("campaigns")
      .select("id, status, orcamento, gasto");

    if (campErr) throw new Error(campErr.message);

    const totalCampanhas = campaigns?.length ?? 0;
    const ativas = campaigns?.filter((c) => c.status === "ativa").length ?? 0;
    const totalInvestido = campaigns?.reduce((sum, c) => sum + (c.status === "ativa" || c.status === "encerrado" ? c.orcamento : 0), 0) ?? 0;
    const totalGasto = campaigns?.reduce((sum, c) => sum + c.gasto, 0) ?? 0;

    // 2. Contagens globais de impressões e cliques
    const { count: totalImpressions } = await db
      .from("ad_impressions")
      .select("*", { count: "exact", head: true });

    const { count: totalClicks } = await db
      .from("ad_clicks")
      .select("*", { count: "exact", head: true });

    const impressoes = totalImpressions ?? 0;
    const cliques = totalClicks ?? 0;

    const ctrGlobal = impressoes > 0 ? Number(((cliques / impressoes) * 100).toFixed(2)) : 0;
    const cpcGlobal = cliques > 0 ? Number((totalGasto / 100 / cliques).toFixed(2)) : 0.18;

    return NextResponse.json({
      total_campanhas: totalCampanhas,
      campanhas_ativas: ativas,
      total_investido: totalInvestido,
      total_gasto: totalGasto,
      total_impressoes: impressoes,
      total_cliques: cliques,
      ctr_global: `${ctrGlobal}%`,
      cpc_global: `R$ ${cpcGlobal.toFixed(2)}`,
    });
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 401) return NextResponse.json({ error: err.message }, { status: 401 });
    if (err.status === 403) return NextResponse.json({ error: err.message }, { status: 403 });
    return handleApiError(error, "GET /api/admin/analytics");
  }
}
