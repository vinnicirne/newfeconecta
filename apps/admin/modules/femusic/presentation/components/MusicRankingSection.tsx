'use client';

import React, { useState, useEffect } from 'react';
import { Trophy, Play, Heart, ListPlus, Flame, Sparkles, TrendingUp, Music } from 'lucide-react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { fetchTopRankedTracks, RankedTrack } from '../../domain/ranking';
import { MusicTrack } from '../../domain/entities/MusicTrack';
import AddToPlaylistModal from './AddToPlaylistModal';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

export default function MusicRankingSection() {
  const [ranking, setRanking] = useState<RankedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<MusicTrack | null>(null);
  const { play, likedTracks, toggleLike } = usePlayerStore();

  useEffect(() => {
    loadRanking();

    // Sincronização em tempo real via WebSocket
    const channel = supabase.channel('femusic-ranking-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_configs' },
        () => loadRanking()
      )
      .subscribe();

    const handleCustomUpdate = () => loadRanking();
    window.addEventListener('femusic-ranking-updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('femusic-ranking-updated', handleCustomUpdate);
      try {
        supabase.removeChannel(channel);
      } catch (_) {}
    };
  }, []);

  const loadRanking = async () => {
    try {
      const topTracks = await fetchTopRankedTracks(10);
      setRanking(topTracks);
    } catch (e) {
      console.warn('[MusicRanking] Erro ao carregar ranking:', e);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 text-black font-black text-xs flex items-center justify-center shadow-md shrink-0">
          🥇 1
        </span>
      );
    }
    if (index === 1) {
      return (
        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-300 to-gray-400 text-black font-black text-xs flex items-center justify-center shadow-md shrink-0">
          🥈 2
        </span>
      );
    }
    if (index === 2) {
      return (
        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 text-white font-black text-xs flex items-center justify-center shadow-md shrink-0">
          🥉 3
        </span>
      );
    }
    return (
      <span className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0">
        #{index + 1}
      </span>
    );
  };

  const convertToMusicTrack = (r: RankedTrack): MusicTrack => ({
    id: r.providerTrackId || r.id,
    providerTrackId: r.providerTrackId || r.id,
    title: r.title,
    artist: r.artist,
    cover: r.cover,
    duration: r.duration || 240,
    provider: 'youtube',
  });

  return (
    <section className="mt-8 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500 fill-amber-500" />
            Top 10 Louvores Mais Tocados
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            O ranking oficial das músicas mais ouvidas pela comunidade FéConecta
          </p>
        </div>

        <span className="text-[11px] font-bold text-whatsapp-teal bg-whatsapp-teal/10 px-2.5 py-1 rounded-full flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
          Ranking Oficial
        </span>
      </div>

      <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-2xl p-3 shadow-sm divide-y divide-gray-100 dark:divide-white/5">
        {ranking.map((item, index) => {
          const track = convertToMusicTrack(item);
          const trackId = track.providerTrackId || track.id;
          const isLiked = likedTracks.some(t => (t.providerTrackId || t.id) === trackId);

          return (
            <div
              key={item.id || index}
              onClick={() => play(track, ranking.map(convertToMusicTrack))}
              className="flex items-center justify-between py-2.5 px-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer group"
            >
              {/* Lado Esquerdo: Posição + Capa + Título + Cantor */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {getRankBadge(index)}

                <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-gray-200 dark:bg-white/10">
                  {item.cover ? (
                    <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Music className="w-5 h-5" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate group-hover:text-whatsapp-teal transition-colors">
                      {item.title}
                    </h3>
                    {index === 0 && (
                      <span className="hidden sm:inline-block text-[9px] font-black uppercase bg-amber-500/20 text-amber-500 px-1.5 py-0.2 rounded">
                        Líder
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 truncate mt-0.5">
                    {item.artist}
                  </p>
                </div>
              </div>

              {/* Lado Direito: Plays + Ações */}
              <div className="flex items-center gap-3 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 font-mono hidden sm:inline-block">
                  {(item.playCount || 0).toLocaleString('pt-BR')} plays
                </span>

                <button
                  onClick={() => toggleLike(track)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors active:scale-90"
                  title="Curtir"
                >
                  <Heart className={cn("w-4 h-4", isLiked && "text-red-500 fill-red-500")} />
                </button>

                <button
                  onClick={() => setSelectedTrackForPlaylist(track)}
                  className="p-1.5 text-gray-400 hover:text-whatsapp-teal transition-colors active:scale-90"
                  title="Adicionar à Playlist"
                >
                  <ListPlus className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AddToPlaylistModal
        isOpen={!!selectedTrackForPlaylist}
        onClose={() => setSelectedTrackForPlaylist(null)}
        track={selectedTrackForPlaylist}
      />
    </section>
  );
}
