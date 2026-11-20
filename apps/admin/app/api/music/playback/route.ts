import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

const TRACK_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const ALLOWED_PROVIDERS = new Set(['youtube', 'spotify', 'deezer']);

type PlaybackTrack = {
  id?: unknown;
  providerTrackId?: unknown;
  provider?: unknown;
  title?: unknown;
  artist?: unknown;
  cover?: unknown;
  duration?: unknown;
};

function isSafeHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get('content-length') || 0) > 16_384) {
      return NextResponse.json({ error: 'Solicitação muito grande' }, { status: 413 });
    }

    const user = await requireAuth(request);
    const body: unknown = await request.json();
    const track = (body as { track?: PlaybackTrack } | null)?.track;
    if (!track || typeof track !== 'object') {
      return NextResponse.json({ error: 'Faixa inválida' }, { status: 400 });
    }

    const provider = typeof track.provider === 'string' ? track.provider : 'youtube';
    const trackId = typeof track.providerTrackId === 'string'
      ? track.providerTrackId
      : typeof track.id === 'string' ? track.id : '';
    if (!ALLOWED_PROVIDERS.has(provider) || !TRACK_ID_PATTERN.test(trackId)) {
      return NextResponse.json({ error: 'Identificação da faixa inválida' }, { status: 400 });
    }

    const durationValue = typeof track.duration === 'number' ? track.duration : null;
    if (durationValue !== null && (!Number.isFinite(durationValue) || durationValue < 0 || durationValue > 21_600_000)) {
      return NextResponse.json({ error: 'Duração da faixa inválida' }, { status: 400 });
    }

    const title = typeof track.title === 'string' ? track.title.trim().slice(0, 160) : 'Louvor';
    const artist = typeof track.artist === 'string' ? track.artist.trim().slice(0, 160) : 'Artista';
    const cover = isSafeHttpsUrl(track.cover)
      ? track.cover
      : provider === 'youtube' ? `https://i.ytimg.com/vi/${trackId}/hqdefault.jpg` : null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Serviço de histórico indisponível' }, { status: 503 });
    }

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const recentCutoff = new Date(Date.now() - 60_000).toISOString();
    const { data: recent, error: recentError } = await db
      .from('music_history')
      .select('id, started_at')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .eq('provider_track_id', trackId)
      .gte('started_at', recentCutoff)
      .limit(1);

    if (recentError) {
      console.error('[API Playback] Não foi possível verificar duplicatas:', recentError.message);
      return NextResponse.json({ error: 'Não foi possível registrar a reprodução' }, { status: 500 });
    }
    if (recent?.length) {
      return NextResponse.json({ success: true, duplicate: true, startedAt: recent[0].started_at });
    }

    const { data: history, error } = await db
      .from('music_history')
      .insert({
        user_id: user.id,
        provider,
        provider_track_id: trackId,
        track_title: title || 'Louvor',
        track_artist: artist || 'Artista',
        track_cover: cover,
        track_duration: durationValue === null ? null : Math.round(durationValue),
        started_at: new Date().toISOString(),
        completed: false,
      })
      .select('id, started_at')
      .single();

    if (error) {
      console.error('[API Playback] Falha ao registrar reprodução:', error.message);
      return NextResponse.json({ error: 'Não foi possível registrar a reprodução' }, { status: 500 });
    }

    return NextResponse.json({ success: true, historyId: history.id, startedAt: history.started_at });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro interno';
    const unauthorized = message.toLowerCase().includes('autorizado');
    if (unauthorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    console.error('[API Playback] Erro inesperado:', message);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
