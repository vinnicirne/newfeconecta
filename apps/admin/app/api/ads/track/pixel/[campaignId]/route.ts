import { NextResponse } from "next/server";
import { TrackingService } from "@/domain/ads/tracking.service";

export const dynamic = "force-dynamic";

// GIF transparente de 1x1 pixel em base64
const TRANSPARENT_1X1_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

/**
 * GET /api/ads/track/pixel/[campaignId]
 * Retorna uma imagem 1x1 transparente após registrar a impressão no servidor.
 */
export async function GET(
  request: Request,
  { params }: { params: { campaignId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "feed";

    if (params.campaignId) {
      const service = new TrackingService();
      await service.trackImpression({
        campaignId: params.campaignId,
        format,
      }).catch((err) => console.error("[Tracking Pixel] Falha ao registrar:", err));
    }
  } catch (err) {
    console.error("[Tracking Pixel] Erro:", err);
  }

  return new NextResponse(TRANSPARENT_1X1_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
