import { NextResponse } from "next/server";
import { TrackingService } from "@/domain/ads/tracking.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/ads/track/impression
 * Registra a impressão e incrementa o gasto da campanha.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);

    const campaignId = body.campaign_id || searchParams.get("id");
    const format = body.format || searchParams.get("format") || "feed";
    const userId = body.user_id || null;

    if (!campaignId) {
      return NextResponse.json({ error: "campaign_id é obrigatório" }, { status: 400 });
    }

    const service = new TrackingService();
    const result = await service.trackImpression({
      campaignId,
      format,
      userId,
      metadata: body.metadata || {},
    });

    return NextResponse.json({
      success: true,
      impression_id: result.impressionId,
      budget_reached: result.budgetReached,
    });
  } catch (error: any) {
    console.error("[POST /api/ads/track/impression]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Suporte a GET para chamadas diretas de URL de tracking
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("id");
  const format = searchParams.get("format") || "feed";

  if (!campaignId) {
    return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
  }

  try {
    const service = new TrackingService();
    await service.trackImpression({ campaignId, format });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
