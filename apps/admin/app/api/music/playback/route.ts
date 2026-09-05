import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseServer = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { track, userId } = body;

    if (!track || (!track.id && !track.providerTrackId)) {
      return NextResponse.json({ error: 'Faixa inválida' }, { status: 400 });
    }

    const trackId = track.providerTrackId || track.id;
    const title = track.title || 'Louvor';
    const artist = track.artist || 'Artista';
    const cover = track.cover || (track.providerTrackId ? `https://i.ytimg.com/vi/${track.providerTrackId}/hqdefault.jpg` : null);
    const duration = track.duration ? Math.round(track.duration) : null;
    const provider = track.provider || 'youtube';

    let finalUserId: string | null = userId || null;

    // Se não veio userId no body, tenta extrair dos Cookies ou Header
    if (!finalUserId) {
      try {
        const authHeader = request.headers.get('authorization');
        let token: string | null = null;
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.replace('Bearer ', '').trim();
        } else {
          const cookieHeader = request.headers.get('cookie') || '';
          const cookies = Object.fromEntries(
            cookieHeader.split(';').map(c => {
              const [k, ...v] = c.trim().split('=');
              return [k, decodeURIComponent(v.join('='))];
            })
          );
          const tokenCookie = Object.keys(cookies).find(k => 
            k.includes('fc-auth-token') || k.includes('-auth-token') || k === 'sb-access-token' || k === 'supabase-auth-token'
          );
          if (tokenCookie && cookies[tokenCookie]) {
            const parsed = JSON.parse(cookies[tokenCookie]);
            token = Array.isArray(parsed) ? parsed[0] : (parsed.access_token || parsed);
          }
        }
        if (token) {
          const { data: { user } } = await supabaseServer.auth.getUser(token);
          if (user?.id) finalUserId = user.id;
        }
      } catch (_) {}
    }

    // 1. Indexa em music_tracks
    await supabaseServer
      .from('music_tracks')
      .upsert({
        provider,
        provider_track_id: trackId,
        title,
        artist,
        cover,
        duration,
      }, { onConflict: 'provider,provider_track_id' })
      .catch((e) => console.warn('[API Playback] Erro ao indexar music_tracks:', e));

    // 2. Insere no histórico de reprodução em tempo real (music_history)
    const { data: histData, error: histError } = await supabaseServer
      .from('music_history')
      .insert({
        user_id: finalUserId,
        provider,
        provider_track_id: trackId,
        track_title: title,
        track_artist: artist,
        track_cover: cover,
        track_duration: duration,
        started_at: new Date().toISOString(),
        completed: false,
      })
      .select('id, started_at')
      .single();

    if (histError) {
      console.warn('[API Playback] Falha ao inserir em music_history:', histError.message);
      return NextResponse.json({ error: histError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      historyId: histData?.id,
      startedAt: histData?.started_at,
      userId: finalUserId,
    });
  } catch (err: any) {
    console.error('[API Playback] Erro inesperado:', err);
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 });
  }
}
