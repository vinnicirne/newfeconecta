import { NextResponse } from "next/server";
import { TrackingService } from "@/domain/ads/tracking.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/ads/track/click
 * Registra o clique com validação anti-fraude.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);

    const campaignId = body.campaign_id || searchParams.get("id");
    const impressionId = body.impression_id || searchParams.get("imp");
    const userId = body.user_id || null;

    if (!campaignId) {
      return NextResponse.json({ error: "campaign_id é obrigatório" }, { status: 400 });
    }

    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    const service = new TrackingService();
    const result = await service.trackClick({
      campaignId,
      impressionId,
      userId,
      clientIp,
      metadata: body.metadata || {},
    });

    return NextResponse.json({
      success: true,
      click_id: result.clickId,
      suspicious: result.suspicious,
    });
  } catch (error: any) {
    console.error("[POST /api/ads/track/click]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * Suporte a GET para links redirecionáveis de clique
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("id");
  const impressionId = searchParams.get("imp");
  const redirectUrl = searchParams.get("url");

  if (!campaignId) {
    return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
  }

  try {
    const service = new TrackingService();
    await service.trackClick({ campaignId, impressionId });

    if (redirectUrl) {
      return NextResponse.redirect(redirectUrl);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
