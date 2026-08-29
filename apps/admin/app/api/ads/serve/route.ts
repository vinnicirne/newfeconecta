import { NextResponse } from "next/server";
import { AdServingService } from "@/domain/ads/ad-serving.service";
import { CampaignFormat } from "@/domain/ads/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/ads/serve?format=feed|stories|banner
 * Retorna o próximo anúncio ativo elegível para exibição.
 * Se nenhuma campanha estiver disponível, retorna 204 No Content.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "feed") as CampaignFormat;

    if (!["feed", "stories", "banner"].includes(format)) {
      return NextResponse.json({ error: "Formato inválido. Use 'feed', 'stories' ou 'banner'." }, { status: 400 });
    }

    const host = request.headers.get("host") || "feconecta.com.br";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    const service = new AdServingService();
    const ad = await service.serveAd(format, baseUrl);

    if (!ad) {
      // 204 No Content quando não há campanhas ativas para servir
      return new NextResponse(null, { status: 204 });
    }

    return NextResponse.json(ad, {
      headers: {
        "Cache-Control": "public, max-age=10, stale-while-revalidate=30",
      },
    });
  } catch (error: any) {
    console.error("[GET /api/ads/serve] Erro:", error);
    return new NextResponse(null, { status: 204 });
  }
}
