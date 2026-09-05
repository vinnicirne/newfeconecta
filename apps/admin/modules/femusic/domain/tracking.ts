import { supabase } from '@/lib/supabase';
import { MusicTrack } from './entities/MusicTrack';
import { recordTrackPlay } from './ranking';

/**
 * Registra a reprodução da faixa no Supabase (music_history)
 * vinculando imediatamente ao perfil do usuário conectado e atualizando o ranking.
 */
export async function recordUserPlayback(track: MusicTrack): Promise<void> {
  if (!track || (!track.id && !track.providerTrackId)) return;

  const trackId = track.providerTrackId || track.id;
  const title = track.title || 'Louvor';
  const artist = track.artist || 'Artista';
  const cover = track.cover || (track.providerTrackId ? `https://i.ytimg.com/vi/${track.providerTrackId}/hqdefault.jpg` : null);
  const duration = track.duration ? Math.round(track.duration) : null;
  const provider = track.provider || 'youtube';

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Atualiza ranking em system_configs
    recordTrackPlay(track, user?.id || null).catch(() => {});

    // 2. Indexa a faixa em music_tracks para consulta global
    await supabase
      .from('music_tracks')
      .upsert({
        provider,
        provider_track_id: trackId,
        title,
        artist,
        cover,
        duration,
      }, { onConflict: 'provider,provider_track_id' })
      .catch((e: any) => console.warn('[Tracking] Falha ao upsert music_tracks:', e));

    // 3. Registra na tabela music_history se usuário estiver logado
    if (user?.id) {
      const { error: histError } = await supabase
        .from('music_history')
        .insert({
          user_id: user.id,
          provider,
          provider_track_id: trackId,
          track_title: title,
          track_artist: artist,
          track_cover: cover,
          track_duration: duration,
          started_at: new Date().toISOString(),
          completed: false,
        });

      if (histError) {
        console.warn('[Tracking] Erro ao gravar music_history:', histError.message);
      } else {
        console.log(`[Tracking] Reprodução gravada para @${user.id} - ${title}`);
      }
    }
  } catch (err) {
    console.warn('[Tracking] Erro geral ao registrar playback:', err);
  }
}
