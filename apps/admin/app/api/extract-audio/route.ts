import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';

export async function POST(request: Request) {
  try {
    // SECURITY: Apenas usuários autenticados podem requisitar extração de áudio.
    let currentUser: any = null;
    try {
      currentUser = await requireAuth(request);
    } catch (authErr: any) {
      return NextResponse.json({ error: 'Não autorizado', details: authErr?.message || 'Token ausente' }, { status: 401 });
    }

    const body = await request.json();
    const { url, track } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Extrai YouTube ID da URL
    const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([^&]+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    if (videoId) {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: cacheRows } = await supabase
        .from('femusic_cache')
        .select('*')
        .eq('youtube_id', videoId)
        .limit(1);

      if (cacheRows && cacheRows.length > 0 && cacheRows[0].audio_url) {
        const trackTitle = track?.title || cacheRows[0].title || 'Louvor';
        const trackArtist = track?.artist || cacheRows[0].artist || 'Artista';
        const trackCover = track?.cover || cacheRows[0].cover || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        const trackDuration = track?.duration || cacheRows[0].duration || null;

        // Atualiza o último usuário que ouviu/baixou caso aplicável
        if (currentUser?.id) {
          try {
            await supabase
              .from('femusic_cache')
              .update({ 
                user_id: currentUser.id,
                title: trackTitle,
                artist: trackArtist,
                cover: trackCover,
                duration: trackDuration
              })
              .eq('youtube_id', videoId);

            // Registra a reprodução no histórico de atividades
            await supabase.from('music_history').insert({
              user_id: currentUser.id,
              provider: 'youtube',
              provider_track_id: videoId,
              track_title: trackTitle,
              track_artist: trackArtist,
              track_cover: trackCover,
              track_duration: trackDuration,
              started_at: new Date().toISOString(),
              completed: false,
            });
          } catch (e) {
            console.warn('[AudioExtractor] Erro ao sincronizar histórico/cache existente:', e);
          }
        }
        return NextResponse.json({ success: true, url: cacheRows[0].audio_url });
      }
    }

    const audioExtractorUrl = process.env.AUDIO_EXTRACTOR_URL || process.env.EXTRACTOR_URL;
    
    if (!audioExtractorUrl) {
      return NextResponse.json({ error: 'Serviço de extração de áudio não configurado' }, { status: 503 });
    }

    const endpoint = audioExtractorUrl.endsWith('/extract-audio') 
      ? audioExtractorUrl 
      : `${audioExtractorUrl.replace(/\/+$/, '')}/extract-audio`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[AudioExtractor] Serviço retornou erro:', response.status, text);
      return NextResponse.json({ error: 'Falha ao extrair áudio' }, { status: response.status });
    }

    const data = await response.json();

    if (data.success && data.url && videoId) {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const trackTitle = track?.title || body?.track?.title || 'Louvor';
      const trackArtist = track?.artist || body?.track?.artist || 'Artista';
      const trackCover = track?.cover || body?.track?.cover || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
      const trackDuration = track?.duration || body?.track?.duration || null;

      const { error: insertError } = await supabase
        .from('femusic_cache')
        .upsert([{ 
          youtube_id: videoId, 
          audio_url: data.url,
          user_id: currentUser?.id || null,
          title: trackTitle,
          artist: trackArtist,
          cover: trackCover,
          duration: trackDuration,
          created_at: new Date().toISOString()
        }], { onConflict: 'youtube_id' });
        
      if (insertError) {
        console.error('[AudioExtractor] Erro ao salvar cache:', insertError);
      }

      // Registra evento de extração/download no histórico do usuário
      if (currentUser?.id) {
        try {
          await supabase.from('music_history').insert({
            user_id: currentUser.id,
            provider: 'youtube',
            provider_track_id: videoId,
            track_title: trackTitle,
            track_artist: trackArtist,
            track_cover: trackCover,
            track_duration: trackDuration,
            started_at: new Date().toISOString(),
            completed: false,
          });
        } catch (hErr) {
          console.warn('[AudioExtractor] Erro ao registrar music_history:', hErr);
        }
      }

      if (body.track || videoId) {
        const { error: trackError } = await supabase
          .from('music_tracks')
          .upsert([{
            provider: 'youtube',
            provider_track_id: videoId,
            title: trackTitle,
            artist: trackArtist,
            duration: trackDuration || 0,
            cover: trackCover
          }], { onConflict: 'provider,provider_track_id' });
          
        if (trackError) {
          console.error('[AudioExtractor] Erro ao salvar track:', trackError);
        }
      }
    }

    return NextResponse.json(data);

  } catch (error: any) {
    console.error('[AudioExtractor] Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno ao processar áudio', details: error.message }, { status: 500 });
  }
}
