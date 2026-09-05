'use client';

import React, { useEffect, useState } from 'react';
import { Zap, PlayCircle, Music, ListPlus, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MusicTrack } from '../../domain/entities/MusicTrack';
import { usePlayerStore } from '../../infrastructure/state/usePlayerStore';
import AddToPlaylistModal from './AddToPlaylistModal';
import { cn } from '@/lib/utils';

export default function DatabaseCatalogSection() {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<MusicTrack | null>(null);
  const { play, currentTrack, isPlaying } = usePlayerStore();

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      
      // 1. Busca faixas em femusic_cache (que possuem áudio .m4a no Supabase Storage)
      const { data: cacheData, error: cacheErr } = await supabase
        .from('femusic_cache')
        .select('youtube_id, audio_url, title, artist, cover, duration, created_at')
        .not('title', 'is', null)
        .order('created_at', { ascending: false })
        .limit(40);

      // 2. Busca faixas em music_tracks
      const { data: tracksData, error: tracksErr } = await supabase
        .from('music_tracks')
        .select('provider_track_id, title, artist, cover, duration, created_at')
        .order('created_at', { ascending: false })
        .limit(40);

      const itemsMap = new Map<string, MusicTrack>();

      if (!cacheErr && cacheData) {
        for (const item of cacheData) {
          if (!item.youtube_id || !item.title) continue;
          itemsMap.set(item.youtube_id, {
            id: item.youtube_id,
            providerTrackId: item.youtube_id,
            title: item.title,
            artist: item.artist || 'FéConecta Music',
            cover: item.cover || `https://i.ytimg.com/vi/${item.youtube_id}/hqdefault.jpg`,
            duration: item.duration || 260,
            audioUrl: item.audio_url || null,
            provider: 'youtube',
          });
        }
      }

      if (!tracksErr && tracksData) {
        for (const item of tracksData) {
          if (!item.provider_track_id || !item.title) continue;
          if (!itemsMap.has(item.provider_track_id)) {
            itemsMap.set(item.provider_track_id, {
              id: item.provider_track_id,
              providerTrackId: item.provider_track_id,
              title: item.title,
              artist: item.artist || 'FéConecta Music',
              cover: item.cover || `https://i.ytimg.com/vi/${item.provider_track_id}/hqdefault.jpg`,
              duration: item.duration || 260,
              provider: 'youtube',
            });
          }
        }
      }

      setTracks(Array.from(itemsMap.values()));
    } catch (e) {
      console.warn('[DatabaseCatalogSection] Erro ao carregar acervo do banco:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!loading && tracks.length === 0) {
    return null;
  }

  const formatDuration = (seconds?: number | null) => {
    if (!seconds || seconds <= 0) return '';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <section className="mb-8">
      {/* Header da Seção */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-500 fill-emerald-500" />
            Acervo FéConecta • Áudios Rápidos
          </h2>
          <p className="text-xs text-muted-foreground">
            Louvores salvos no banco de dados com reprodução instantânea
          </p>
        </div>
        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
          <Sparkles className="w-3.5 h-3.5" />
          ⚡ Sem Espera
        </span>
      </div>

      {/* Carrossel Horizontal */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 snap-x">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="snap-start shrink-0 w-36 sm:w-40 flex flex-col gap-2 animate-pulse">
              <div className="w-36 sm:w-40 h-28 rounded-2xl bg-muted/60" />
              <div className="h-3.5 w-24 bg-muted/60 rounded" />
              <div className="h-2.5 w-16 bg-muted/40 rounded" />
            </div>
          ))
        ) : (
          tracks.map((track) => {
            const isCurrentPlaying = (currentTrack?.providerTrackId || currentTrack?.id) === (track.providerTrackId || track.id) && isPlaying;

            return (
              <div
                key={track.id}
                className="snap-start shrink-0 w-36 sm:w-40 flex flex-col gap-2 cursor-pointer group"
                onClick={() => play(track, tracks)}
              >
                {/* Capa com overlay e badges */}
                <div className="w-36 sm:w-40 h-28 rounded-2xl overflow-hidden relative shadow-md bg-gray-200 dark:bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-emerald-500/40 transition-all">
                  {track.cover ? (
                    <img
                      src={track.cover}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      alt={track.title}
                    />
                  ) : (
                    <Music className="w-8 h-8 text-gray-400" />
                  )}

                  {/* Badge de Áudio Instantâneo */}
                  {track.audioUrl && (
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-emerald-400 text-[9px] font-bold flex items-center gap-0.5 border border-emerald-500/30">
                      <Zap className="w-2.5 h-2.5 fill-current" />
                      <span>RÁPIDO</span>
                    </div>
                  )}

                  {/* Duração */}
                  {track.duration && (
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] text-white font-mono">
                      {formatDuration(track.duration)}
                    </div>
                  )}

                  {/* Overlay Play */}
                  <div className={cn(
                    "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity",
                    isCurrentPlaying ? "opacity-100 bg-black/60" : "opacity-0 group-hover:opacity-100"
                  )}>
                    <PlayCircle className={cn("w-8 h-8 text-white drop-shadow-md", isCurrentPlaying && "text-emerald-400 animate-pulse")} />
                  </div>

                  {/* Botão Adicionar à Playlist */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTrackForPlaylist(track);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-whatsapp-teal transition-all shadow-md active:scale-90 opacity-90 hover:opacity-100"
                    title="Adicionar à Playlist"
                  >
                    <ListPlus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Metadados */}
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm truncate group-hover:text-emerald-500 transition-colors">
                    {track.title || 'Faixa do Acervo'}
                  </h3>
                  <p className="text-[11px] text-gray-500 truncate">
                    {track.artist || 'FéConecta Music'}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AddToPlaylistModal
        isOpen={!!selectedTrackForPlaylist}
        onClose={() => setSelectedTrackForPlaylist(null)}
        track={selectedTrackForPlaylist}
      />
    </section>
  );
}
