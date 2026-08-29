import { NextResponse } from "next/server";
import { CampaignClosingService } from "@/domain/ads/campaign-closing.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/cron/campaign-closing
 * Endpoint protegido para execução de cron job periódico (a cada 5 minutos).
 * Encerra automaticamente todas as campanhas cuja data final (periodo_fim) expirou.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Se houver CRON_SECRET configurado, valida o header de autorização
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const closingService = new CampaignClosingService();
    const closedIds = await closingService.closeExpiredCampaigns();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      closed_count: closedIds.length,
      closed_campaign_ids: closedIds,
    });
  } catch (error: any) {
    console.error("[CRON /api/cron/campaign-closing] Erro:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
