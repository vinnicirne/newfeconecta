import { createHash, randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth-server';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth(request);
    if (!UUID_PATTERN.test(params.id)) {
      return NextResponse.json({ error: 'Campanha inválida' }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json({ error: 'Serviço de chaves indisponível' }, { status: 503 });
    }
    const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: campaign, error: campaignError } = await db
      .from('campaigns')
      .select('id, partner_id')
      .eq('id', params.id)
      .maybeSingle();

    if (campaignError) throw campaignError;
    if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

    let canManage = campaign.partner_id === user.id;
    if (!canManage) {
      const { data: profile, error } = await db.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (error) throw error;
      canManage = profile ? ['admin', 'superadmin'].includes(profile.role) : false;
    }
    if (!canManage) return NextResponse.json({ error: 'Sem permissão para esta campanha' }, { status: 403 });

    const token = randomBytes(32).toString('base64url');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const { error: saveError } = await db.from('ad_pixel_credentials').upsert({
      campaign_id: campaign.id,
      partner_id: campaign.partner_id,
      token_hash: tokenHash,
      created_at: new Date().toISOString(),
    }, { onConflict: 'campaign_id' });

    if (saveError) throw saveError;
    return NextResponse.json({ token }, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    if (message.toLowerCase().includes('autorizado')) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
    console.error('[Pixel Credentials] Não foi possível rotacionar a chave:', message);
    return NextResponse.json({ error: 'Não foi possível gerar a chave' }, { status: 500 });
  }
}
