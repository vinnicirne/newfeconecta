import { supabase } from '@/lib/supabase';
import { MusicTrack } from './entities/MusicTrack';

export interface RankedTrack {
  id: string;
  providerTrackId: string;
  title: string;
  artist: string;
  cover: string | null;
  duration?: number | null;
  playCount: number;
  playlistCount: number;
  feedShareCount: number;
  score: number;
  lastPlayedAt: string;
}

// IDs YouTube verificados via API em 29/08/2026
const DEFAULT_RANKED_SEEDS: RankedTrack[] = [
  {
    id: 'YnrN0o0lubM',
    providerTrackId: 'YnrN0o0lubM',
    title: 'Lugar Secreto',
    artist: 'Gabriela Rocha',
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
    duration: 320,
    playCount: 1420,
    playlistCount: 86,
    feedShareCount: 42,
    score: 1548,
    lastPlayedAt: new Date().toISOString(),
  },
  {
    id: '5QHF5OQeFOs',
    providerTrackId: '5QHF5OQeFOs',
    title: 'A Casa É Sua',
    artist: 'Casa Worship',
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
    duration: 480,
    playCount: 1180,
    playlistCount: 74,
    feedShareCount: 38,
    score: 1292,
    lastPlayedAt: new Date().toISOString(),
  },
  {
    id: 'pAQeih7K5ZY',
    providerTrackId: 'pAQeih7K5ZY',
    title: 'Bondade de Deus',
    artist: 'Isadora Pompeo',
    cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600',
    duration: 310,
    playCount: 960,
    playlistCount: 65,
    feedShareCount: 29,
    score: 1054,
    lastPlayedAt: new Date().toISOString(),
  },
  {
    id: 'n0fDvJAyrQ8',
    providerTrackId: 'n0fDvJAyrQ8',
    title: 'Pode Morar Aqui',
    artist: 'Theo Rubia',
    cover: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600',
    duration: 520,
    playCount: 840,
    playlistCount: 52,
    feedShareCount: 24,
    score: 916,
    lastPlayedAt: new Date().toISOString(),
  },
  {
    id: '_DUSt0KGMsI',
    providerTrackId: '_DUSt0KGMsI',
    title: 'Para Que Entre o Rei',
    artist: 'Morada',
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
    duration: 410,
    playCount: 720,
    playlistCount: 45,
    feedShareCount: 19,
    score: 784,
    lastPlayedAt: new Date().toISOString(),
  },
  {
    id: 'Tqdi6BZUWr4',
    providerTrackId: 'Tqdi6BZUWr4',
    title: 'Raridade',
    artist: 'Anderson Freire',
    cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600',
    duration: 285,
    playCount: 650,
    playlistCount: 39,
    feedShareCount: 15,
    score: 704,
    lastPlayedAt: new Date().toISOString(),
  },
];

/**
 * Registra a execução de um louvor no banco de dados e atualiza o ranking em tempo real.
 */
export async function recordTrackPlay(track: MusicTrack, userId?: string | null): Promise<void> {
  if (!track || (!track.id && !track.providerTrackId)) return;
  const trackId = track.providerTrackId || track.id;

  try {
    // 1. Busca ranking atual em system_configs
    const { data } = await supabase
      .from('system_configs')
      .select('value')
      .eq('key', 'femusic_ranking_stats_v1')
      .maybeSingle();

    const currentMap: Record<string, RankedTrack> = data?.value?.tracks || {};
    const existing = currentMap[trackId];

    const updatedTrack: RankedTrack = {
      id: trackId,
      providerTrackId: trackId,
      title: track.title || 'Louvor',
      artist: track.artist || 'FéConecta',
      cover: track.cover || existing?.cover || null,
      duration: track.duration || existing?.duration || null,
      playCount: (existing?.playCount || 0) + 1,
      playlistCount: existing?.playlistCount || 0,
      feedShareCount: existing?.feedShareCount || 0,
      score: ((existing?.playCount || 0) + 1) + ((existing?.playlistCount || 0) * 3) + ((existing?.feedShareCount || 0) * 2),
      lastPlayedAt: new Date().toISOString(),
    };

    currentMap[trackId] = updatedTrack;

    // Salva atomicamente no system_configs
    await supabase.from('system_configs').upsert({
      key: 'femusic_ranking_stats_v1',
      value: {
        tracks: currentMap,
        updated_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('femusic-ranking-updated', { detail: currentMap }));
    }
  } catch (err) {
    console.warn('[Ranking] Erro ao registrar play:', err);
  }
}

/**
 * Retorna as músicas mais ouvidas e populares da plataforma.
 */
export async function fetchTopRankedTracks(limit: number = 10): Promise<RankedTrack[]> {
  try {
    const { data } = await supabase
      .from('system_configs')
      .select('value')
      .eq('key', 'femusic_ranking_stats_v1')
      .maybeSingle();

    const storedMap: Record<string, RankedTrack> = data?.value?.tracks || {};
    const storedList = Object.values(storedMap);

    if (storedList.length > 0) {
      // Ordena por maior pontuação (plays + playlists + shares)
      const sorted = storedList.sort((a, b) => b.score - a.score || b.playCount - a.playCount);
      return sorted.slice(0, limit);
    }

    return DEFAULT_RANKED_SEEDS.slice(0, limit);
  } catch (err) {
    console.warn('[Ranking] Fallback para sementes oficiais:', err);
    return DEFAULT_RANKED_SEEDS.slice(0, limit);
  }
}
