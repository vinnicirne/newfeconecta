import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash, timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

const ALLOWED_EVENTS = new Set([
  'PageView', 'ViewContent', 'AddToCart', 'Lead', 'Purchase', 'CompleteRegistration', 'Contact',
]);
const PIXEL_ID_PATTERN = /^FC-[A-F0-9]{8}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PixelPayload = {
  pixel_id?: unknown;
  campaign_id?: unknown;
  event_name?: unknown;
  event_id?: unknown;
  value?: unknown;
  currency?: unknown;
  order_id?: unknown;
  url?: unknown;
  referrer?: unknown;
  metadata?: unknown;
};

function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function safeMetadata(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const result: Record<string, string | number | boolean> = {};
  for (const [key, entry] of Object.entries(value).slice(0, 20)) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key) || /(email|phone|name|password|token|secret|address)/i.test(key)) continue;
    if (typeof entry === 'string') result[key] = entry.slice(0, 256);
    else if (typeof entry === 'number' && Number.isFinite(entry)) result[key] = entry;
    else if (typeof entry === 'boolean') result[key] = entry;
  }
  return result;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get('content-length') || 0) > 32_768) {
      return NextResponse.json({ error: 'Solicitação muito grande' }, { status: 413, headers: corsHeaders });
    }

    const payload: PixelPayload = await request.json();
    const pixelId = typeof payload.pixel_id === 'string' ? payload.pixel_id : '';
    const eventName = typeof payload.event_name === 'string' ? payload.event_name : '';
    if (!PIXEL_ID_PATTERN.test(pixelId) || !ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json({ error: 'Pixel ou evento inválido' }, { status: 400, headers: corsHeaders });
    }

    const campaignId = typeof payload.campaign_id === 'string' ? payload.campaign_id : null;
    if (campaignId && !UUID_PATTERN.test(campaignId)) {
      return NextResponse.json({ error: 'Campanha inválida' }, { status: 400, headers: corsHeaders });
    }

    const rawValue = payload.value === undefined || payload.value === null ? 0 : Number(payload.value);
    if (!Number.isFinite(rawValue) || rawValue < 0 || rawValue > 1_000_000_000) {
      return NextResponse.json({ error: 'Valor do evento inválido' }, { status: 400, headers: corsHeaders });
    }
    const currency = typeof payload.currency === 'string' ? payload.currency.toUpperCase() : 'BRL';
    if (!/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json({ error: 'Moeda inválida' }, { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Serviço de eventos indisponível' }, { status: 503, headers: corsHeaders });
    }
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    let campaign: { id: string; partner_id: string } | null = null;
    if (campaignId) {
      const { data, error } = await db
        .from('campaigns')
        .select('id, partner_id')
        .eq('id', campaignId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404, headers: corsHeaders });

      const expectedPixelId = `FC-${data.partner_id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
      if (expectedPixelId !== pixelId) {
        return NextResponse.json({ error: 'Pixel não pertence a esta campanha' }, { status: 403, headers: corsHeaders });
      }
      campaign = data;
    }

    const eventId = typeof payload.event_id === 'string' && payload.event_id.length <= 128
      ? payload.event_id
      : null;
    const orderId = typeof payload.order_id === 'string' && payload.order_id.length <= 128
      ? payload.order_id
      : null;
    const conversionId = eventId || orderId;
    const forwardedIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    const userAgent = request.headers.get('user-agent')?.slice(0, 512) || null;
    const conversionTypes = new Set(['Purchase', 'Lead', 'CompleteRegistration', 'AddToCart', 'Contact']);
    let conversionVerified = false;
    const capiBearer = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (campaign && conversionTypes.has(eventName) && capiBearer) {
      const tokenHash = createHash('sha256').update(capiBearer).digest('hex');
      const { data: credentials, error } = await db
        .from('ad_pixel_credentials')
        .select('token_hash')
        .eq('campaign_id', campaign.id)
        .maybeSingle();
      if (error) throw error;
      if (!credentials || credentials.token_hash.length !== tokenHash.length || !timingSafeEqual(Buffer.from(credentials.token_hash), Buffer.from(tokenHash))) {
        return NextResponse.json({ error: 'Chave de conversão inválida' }, { status: 403, headers: corsHeaders });
      }
      conversionVerified = true;
    }

    if (campaign && conversionVerified && !conversionId) {
      return NextResponse.json({ error: 'Conversão autenticada precisa de event_id ou order_id.' }, { status: 400, headers: corsHeaders });
    }

    const { data: pixelEvent, error: pixelError } = await db
      .from('ad_pixel_events')
      .insert({
        pixel_id: pixelId,
        partner_id: campaign?.partner_id ?? null,
        campaign_id: campaign?.id ?? null,
        event_name: eventName,
        event_id: eventId,
        value_cents: Math.round(rawValue * 100),
        currency,
        order_id: orderId,
        client_ip: forwardedIp?.slice(0, 64) ?? null,
        user_agent: userAgent,
        url: safeUrl(payload.url),
        referrer: safeUrl(payload.referrer),
        metadata: safeMetadata(payload.metadata),
      })
      .select('id')
      .single();

    if (pixelError) throw pixelError;

    if (campaign && conversionTypes.has(eventName) && conversionVerified) {
      const { data: conversion, error } = await db.from('ad_conversions').upsert({
        campaign_id: campaign.id,
        event_id: conversionId,
        conversion_type: eventName.toLowerCase(),
        revenue_cents: Math.round(rawValue * 100),
        metadata: { pixel_id: pixelId, order_id: orderId, event_id: eventId, source: 'feconecta_pixel' },
      }, { onConflict: 'campaign_id,event_id', ignoreDuplicates: true }).select('id').maybeSingle();
      if (error) throw error;
      return NextResponse.json({
        success: true,
        event_id: pixelEvent.id,
        received_at: new Date().toISOString(),
        conversion_verified: conversionVerified,
        conversion_duplicate: !conversion,
      }, { headers: corsHeaders });
    }

    return NextResponse.json({
      success: true,
      event_id: pixelEvent.id,
      received_at: new Date().toISOString(),
      conversion_verified: conversionVerified,
    }, { headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    console.error('[Pixel Events] Falha ao processar evento:', message);
    return NextResponse.json({ error: 'Erro ao processar evento' }, { status: 500, headers: corsHeaders });
  }
}
