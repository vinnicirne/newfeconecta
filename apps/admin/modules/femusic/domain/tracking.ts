import { supabase } from '@/lib/supabase';
import { getStoredProfile } from '@/lib/profile-cache';
import { MusicTrack } from './entities/MusicTrack';
import { recordTrackPlay } from './ranking';

/**
 * Registra a reprodução da faixa no Supabase (music_history)
 * vinculando imediatamente ao perfil do usuário conectado e atualizando o ranking.
 * Suporta usuários autenticados, perfis em cache e ouvintes anônimos/convidados.
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
    // 1. Obtém o usuário de forma resiliente (cache do perfil ou Supabase Auth)
    let userId: string | null = null;
    try {
      const cachedProfile = getStoredProfile();
      if (cachedProfile?.id) {
        userId = cachedProfile.id;
      }
    } catch (_) {}

    if (!userId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) userId = user.id;
      } catch (_) {}
    }

    // 2. Atualiza ranking em system_configs
    recordTrackPlay(track, userId).catch(() => {});

    // 3. Indexa a faixa em music_tracks para consulta global
    try {
      await supabase
        .from('music_tracks')
        .upsert({
          provider,
          provider_track_id: trackId,
          title,
          artist,
          cover,
          duration,
        }, { onConflict: 'provider,provider_track_id' });
    } catch (e: any) {
      console.warn('[Tracking] Falha ao upsert music_tracks:', e);
    }

    // 4. Registra no histórico de reproduções (music_history)
    const { error: histError } = await supabase
      .from('music_history')
      .insert({
        user_id: userId || null,
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
      console.warn('[Tracking] Direct insert falhou, acionando fallback /api/music/playback:', histError.message);
      // Fallback via endpoint de servidor (executa com service_role)
      if (typeof window !== 'undefined') {
        fetch('/api/music/playback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ track, userId }),
        }).catch((apiErr) => console.warn('[Tracking] Fallback API error:', apiErr));
      }
    } else {
      console.log(`[Tracking] Reprodução gravada para ${userId ? `@${userId}` : 'Convidado'} - ${title}`);
    }
  } catch (err) {
    console.warn('[Tracking] Erro geral ao registrar playback:', err);
    // Tentativa final via API
    if (typeof window !== 'undefined') {
      try {
        fetch('/api/music/playback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ track }),
        }).catch(() => {});
      } catch (_) {}
    }
  }
}

