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

/**
 * GET /api/campaigns/[id]/analytics
 * Retorna contagem de impressões, cliques, CTR, CPC e gasto total.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const db = getAdminDb();
    const campaignId = params.id;

    // 1. Buscar dados da campanha
    const { data: campaign, error: campErr } = await db
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campErr || !campaign) {
      return NextResponse.json({ error: "Campanha não encontrada" }, { status: 404 });
    }

    // 2. Contar impressões
    const { count: totalImpressoes } = await db
      .from("ad_impressions")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    // 3. Contar cliques
    const { count: totalCliques } = await db
      .from("ad_clicks")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    const impressoes = totalImpressoes ?? 0;
    const cliques = totalCliques ?? 0;
    const gasto = Number(campaign.gasto ?? 0);

    const ctr = impressoes > 0 ? Number(((cliques / impressoes) * 100).toFixed(2)) : 0;
    const cpc = cliques > 0 ? Number((gasto / 100 / cliques).toFixed(2)) : 0;
    const cpm = impressoes > 0 ? Number(((gasto / 100 / impressoes) * 1000).toFixed(2)) : 0;

    return NextResponse.json({
      campaign_id: campaignId,
      nome: campaign.nome,
      status: campaign.status,
      orcamento: campaign.orcamento,
      gasto,
      impressoes,
      cliques,
      ctr: `${ctr}%`,
      cpc: `R$ ${cpc.toFixed(2)}`,
      cpm: `R$ ${cpm.toFixed(2)}`,
    });
  } catch (error) {
    return handleApiError(error, `GET /api/campaigns/${params.id}/analytics`);
  }
}
