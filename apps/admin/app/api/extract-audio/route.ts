import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';

export async function POST(request: Request) {
  try {
    // SECURITY: Apenas usuários autenticados podem requisitar extração de áudio.
    try {
      await requireAuth(request);
    } catch (authErr: any) {
      return NextResponse.json({ error: 'Não autorizado', details: authErr?.message || 'Token ausente' }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

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
        .select('audio_url')
        .eq('youtube_id', videoId)
        .limit(1);

      if (cacheRows && cacheRows.length > 0 && cacheRows[0].audio_url) {
        return NextResponse.json({ success: true, url: cacheRows[0].audio_url });
      }
    }

    const audioExtractorUrl = process.env.AUDIO_EXTRACTOR_URL || process.env.EXTRACTOR_URL || 'http://209.50.229.10:8086';
    
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
      
      const { error: insertError } = await supabase
        .from('femusic_cache')
        .upsert([{ youtube_id: videoId, audio_url: data.url }], { onConflict: 'youtube_id' });
        
      if (insertError) {
        console.error('[AudioExtractor] Erro ao salvar cache:', insertError);
      }

      if (body.track) {
        const { error: trackError } = await supabase
          .from('music_tracks')
          .upsert([{
            provider: 'youtube',
            provider_track_id: videoId,
            title: body.track.title || 'Unknown Title',
            artist: body.track.artist || 'Unknown Artist',
            duration: body.track.duration || 0,
            cover: body.track.cover || null
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
