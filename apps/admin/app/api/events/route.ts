import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function getAdminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Headers CORS para permitir disparos de qualquer site parceiro
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/events
 * Endpoint do FéConecta Pixel & Conversions API (CAPI).
 * Registra eventos como PageView, ViewContent, AddToCart, Lead, Purchase.
 */
export async function POST(request: Request) {
  try {
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    let body: any = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await request.json().catch(() => ({}));
    } else {
      const text = await request.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    const {
      pixel_id,
      campaign_id,
      event_name,
      event_id,
      value,
      currency = "BRL",
      order_id,
      url,
      referrer,
      metadata = {},
    } = body;

    if (!pixel_id || !event_name) {
      return NextResponse.json(
        { error: "pixel_id e event_name são obrigatórios" },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = getAdminDb();
    const valueCents = value ? Math.round(Number(value) * 100) : 0;

    // 1. Tenta identificar a campanha se apenas o pixel_id foi fornecido
    let resolvedCampaignId = campaign_id || null;
    let resolvedPartnerId: string | null = null;

    if (resolvedCampaignId) {
      const { data: camp } = await db
        .from("campaigns")
        .select("id, partner_id")
        .eq("id", resolvedCampaignId)
        .maybeSingle();

      if (camp) {
        resolvedPartnerId = camp.partner_id;
      }
    }

    // 2. Inserir evento no log do Pixel (ad_pixel_events)
    const { data: pixelEvent, error: pixelErr } = await db
      .from("ad_pixel_events")
      .insert({
        pixel_id: String(pixel_id),
        partner_id: resolvedPartnerId,
        campaign_id: resolvedCampaignId,
        event_name: String(event_name),
        event_id: event_id ? String(event_id) : null,
        value_cents: valueCents,
        currency: String(currency),
        order_id: order_id ? String(order_id) : null,
        client_ip: clientIp,
        user_agent: userAgent,
        url: url ? String(url) : null,
        referrer: referrer ? String(referrer) : null,
        metadata: metadata || {},
      })
      .select("id")
      .single();

    if (pixelErr) {
      console.error("[POST /api/events] Erro ao salvar evento de pixel:", pixelErr);
    }

    // 3. Se for uma conversão comercial (Purchase, Lead, SignUp), espelha em ad_conversions
    const conversionTypes = ["Purchase", "Lead", "CompleteRegistration", "AddToCart", "Contact"];
    if (resolvedCampaignId && conversionTypes.includes(event_name)) {
      await db.from("ad_conversions").insert({
        campaign_id: resolvedCampaignId,
        conversion_type: event_name.toLowerCase(),
        revenue_cents: valueCents,
        metadata: {
          pixel_id,
          order_id,
          event_id,
          source: "feconecta_pixel",
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        event_id: pixelEvent?.id || event_id,
        received_at: new Date().toISOString(),
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error("[POST /api/events]", error);
    return NextResponse.json(
      { error: error.message || "Erro interno ao processar evento" },
      { status: 500, headers: corsHeaders }
    );
  }
}
