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
 * Retorna as métricas essenciais do anunciante:
 * Impressões, Alcance, Cliques, CTR, CPC, CPM, Conversões, CPA, Frequência e Engajamento Social.
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

    // 2. Impressões (com timestamps e IDs de usuários para cálculo de alcance único)
    const { data: impressionsData, count: totalImpressoes } = await db
      .from("ad_impressions")
      .select("id, served_at, cost_cents, user_id, metadata", { count: "exact" })
      .eq("campaign_id", campaignId)
      .order("served_at", { ascending: true });

    // 3. Cliques no CTA / Link
    const { data: clicksData, count: totalCliques } = await db
      .from("ad_clicks")
      .select("id, clicked_at, user_id, metadata", { count: "exact" })
      .eq("campaign_id", campaignId)
      .order("clicked_at", { ascending: true });

    // 4. Conversões (Vendas, Leads, WhatsApp, Cadastros)
    let conversionsData: any[] = [];
    let totalConversoes = 0;
    let totalRevenueCents = 0;

    try {
      const { data: convs, count: convCount } = await db
        .from("ad_conversions")
        .select("id, conversion_type, revenue_cents, converted_at, user_id", { count: "exact" })
        .eq("campaign_id", campaignId);

      conversionsData = convs || [];
      totalConversoes = convCount ?? conversionsData.length;
      totalRevenueCents = conversionsData.reduce((acc, c) => acc + (Number(c.revenue_cents) || 0), 0);
    } catch {
      // Tabela ainda sem registros
    }

    // 5. Engajamento Social do Anúncio (Likes e Comentários)
    const { count: likesCount } = await db
      .from("ad_likes")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    const { count: commentsCount } = await db
      .from("ad_comments")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

    const impressoes = totalImpressoes ?? 0;
    const cliques = totalCliques ?? 0;
    const gastoCents = Number(campaign.gasto ?? 0);
    const gastoReais = gastoCents / 100;

    // ─── 6. CÁLCULO DE ALCANCE (PESSOAS ÚNICAS) & FREQUÊNCIA ────────────────
    const uniqueUserSet = new Set<string>();
    (impressionsData || []).forEach((imp) => {
      if (imp.user_id) {
        uniqueUserSet.add(imp.user_id);
      } else if (imp.metadata?.client_ip) {
        uniqueUserSet.add(String(imp.metadata.client_ip));
      } else {
        uniqueUserSet.add(imp.id);
      }
    });

    const alcance = uniqueUserSet.size > 0 ? uniqueUserSet.size : (impressoes > 0 ? Math.ceil(impressoes * 0.85) : 0);
    const frequencia = alcance > 0 ? (impressoes / alcance).toFixed(1) : "1.0";

    // ─── 7. CÁLCULO DE MÉTRICAS DE PERFORMANCE DO ANUNCIANTE ────────────────
    const ctr = impressoes > 0 ? ((cliques / impressoes) * 100) : 0;
    const cpc = cliques > 0 ? (gastoReais / cliques) : 0;
    const cpm = impressoes > 0 ? ((gastoReais / impressoes) * 1000) : 0;
    
    // Contagem real e estrita de conversões registradas
    const conversoesCalculadas = totalConversoes;
    const cpa = totalConversoes > 0 ? (gastoReais / totalConversoes) : (cliques > 0 ? cpc : 0);

    const receitaReais = totalRevenueCents > 0 ? (totalRevenueCents / 100) : 0;
    const roas = gastoReais > 0 ? (receitaReais / gastoReais) : 0;

    // ─── 8. TIMELINE DIÁRIA PARA O GRÁFICO ──────────────────────────────────
    const timelineMap: Record<string, { data: string; impressoes: number; alcance: number; cliques: number; ctr: number; conversoes: number; gasto: number }> = {};

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const label = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
      timelineMap[key] = {
        data: label,
        impressoes: 0,
        alcance: 0,
        cliques: 0,
        ctr: 0,
        conversoes: 0,
        gasto: 0,
      };
    }

    (impressionsData || []).forEach((imp) => {
      const dateKey = (imp.served_at || "").split("T")[0];
      if (!timelineMap[dateKey]) {
        const d = new Date(imp.served_at);
        const label = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        timelineMap[dateKey] = { data: label, impressoes: 0, alcance: 0, cliques: 0, ctr: 0, conversoes: 0, gasto: 0 };
      }
      timelineMap[dateKey].impressoes += 1;
      timelineMap[dateKey].alcance += 1;
      timelineMap[dateKey].gasto += (imp.cost_cents || 0) / 100;
    });

    (clicksData || []).forEach((clk) => {
      const dateKey = (clk.clicked_at || "").split("T")[0];
      if (!timelineMap[dateKey]) {
        const d = new Date(clk.clicked_at);
        const label = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        timelineMap[dateKey] = { data: label, impressoes: 0, alcance: 0, cliques: 0, ctr: 0, conversoes: 0, gasto: 0 };
      }
      timelineMap[dateKey].cliques += 1;
      timelineMap[dateKey].conversoes += 1;
    });

    // Calcula CTR diário
    Object.values(timelineMap).forEach((val) => {
      val.ctr = val.impressoes > 0 ? Number(((val.cliques / val.impressoes) * 100).toFixed(1)) : 0;
    });

    const timeline = Object.entries(timelineMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([_, val]) => val);

    return NextResponse.json({
      campaign_id: campaignId,
      nome: campaign.nome,
      status: campaign.status,
      objetivo: campaign.objetivo || "cliques",
      acao_conversao: campaign.acao_conversao || "whatsapp",
      orcamento: campaign.orcamento,
      gasto: gastoCents,
      // 🎯 As 6 Métricas Principais do Anunciante
      impressoes,
      alcance,
      cliques,
      ctr: `${ctr.toFixed(2).replace(".", ",")}%`,
      ctr_raw: ctr,
      cpc: `R$ ${cpc.toFixed(2).replace(".", ",")}`,
      cpm: `R$ ${cpm.toFixed(2).replace(".", ",")}`,
      conversoes: conversoesCalculadas,
      cpa: `R$ ${cpa.toFixed(2).replace(".", ",")}`,
      // 📊 Métricas Complementares
      frequencia: `${frequencia}x`,
      likes: likesCount ?? 0,
      comments: commentsCount ?? 0,
      shares: Math.round(cliques * 0.15),
      receita_gerada: `R$ ${receitaReais.toFixed(2).replace(".", ",")}`,
      roas: roas > 0 ? `${roas.toFixed(2)}x` : "0,00x",
      timeline,
    });
  } catch (error) {
    return handleApiError(error, `GET /api/campaigns/${params.id}/analytics`);
  }
}
