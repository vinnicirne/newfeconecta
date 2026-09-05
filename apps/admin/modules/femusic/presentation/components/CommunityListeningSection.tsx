'use client';

import React, { useEffect, useState } from 'react';
import { Headphones, PlayCircle, Music, Radio, User, Flame } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { MusicTrack } from '../../domain/entities/MusicTrack';
import { usePlayerStore } from '../../infrastructure/state/usePlayerStore';
import { cn } from '@/lib/utils';

interface HistoryItem {
  id: string;
  provider_track_id: string;
  track_title: string;
  track_artist: string;
  track_cover: string | null;
  track_duration: number | null;
  started_at: string;
  user?: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export default function CommunityListeningSection() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { play, currentTrack, isPlaying } = usePlayerStore();

  useEffect(() => {
    loadRecentPlays();

    // Inscrição em tempo real para novas reproduções no banco
    const channel = supabase
      .channel('femusic-community-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'music_history' },
        () => loadRecentPlays()
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (_) {}
    };
  }, []);

  const loadRecentPlays = async () => {
    try {
      const { data, error } = await supabase
        .from('music_history')
        .select(`
          id,
          provider_track_id,
          track_title,
          track_artist,
          track_cover,
          track_duration,
          started_at,
          user:profiles (id, full_name, username, avatar_url)
        `)
        .order('started_at', { ascending: false })
        .limit(15);

      if (!error && data && Array.isArray(data)) {
        // Remove duplicatas consecutivas da mesma faixa
        const unique = data.filter((item, index, self) => 
          index === self.findIndex((t) => t.provider_track_id === item.provider_track_id)
        );
        setItems(unique as any);
      }
    } catch (e) {
      console.warn('[CommunityListeningSection] Erro ao carregar reproduções comunitárias:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!loading && items.length === 0) {
    return null;
  }

  const getTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'agora';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m atrás`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h atrás`;
    return 'hoje';
  };

  const convertToTrack = (item: HistoryItem): MusicTrack => ({
    id: item.provider_track_id || item.id,
    providerTrackId: item.provider_track_id || item.id,
    title: item.track_title || 'Louvor',
    artist: item.track_artist || 'FéConecta',
    cover: item.track_cover || `https://i.ytimg.com/vi/${item.provider_track_id}/hqdefault.jpg`,
    duration: item.track_duration || 240,
    provider: 'youtube',
  });

  return (
    <section className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
            <Headphones className="w-5 h-5 text-indigo-500" />
            Ouvidas na Comunidade
          </h2>
          <p className="text-xs text-muted-foreground">
            O que os membros estão ouvindo em tempo real no FéConecta
          </p>
        </div>
        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
          <Radio className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
          Ao Vivo
        </span>
      </div>

      {/* Carrossel de Músicas Ouvidas */}
      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 snap-x">
        {items.map((item) => {
          const track = convertToTrack(item);
          const isCurrentPlaying = (currentTrack?.providerTrackId || currentTrack?.id) === track.providerTrackId && isPlaying;
          const userObj = item.user;

          return (
            <div
              key={item.id}
              className="snap-start shrink-0 w-36 sm:w-40 flex flex-col gap-2 cursor-pointer group"
              onClick={() => play(track, items.map(convertToTrack))}
            >
              {/* Capa */}
              <div className="w-36 sm:w-40 h-28 rounded-2xl overflow-hidden relative shadow-md bg-gray-200 dark:bg-white/5 flex items-center justify-center border border-white/5 group-hover:border-indigo-500/40 transition-all">
                {track.cover ? (
                  <img
                    src={track.cover}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    alt={track.title}
                  />
                ) : (
                  <Music className="w-8 h-8 text-gray-400" />
                )}

                {/* Badge de Usuário que ouviu */}
                {userObj && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-black/75 backdrop-blur-sm text-[9px] text-white font-medium flex items-center gap-1 border border-white/10 max-w-[85%] truncate">
                    {userObj.avatar_url ? (
                      <img src={userObj.avatar_url} className="w-3 h-3 rounded-full object-cover" alt="" />
                    ) : (
                      <User className="w-2.5 h-2.5 text-indigo-400" />
                    )}
                    <span className="truncate">@{userObj.username || 'irmão'}</span>
                  </div>
                )}

                {/* Tempo */}
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white/80 font-mono">
                  {getTimeAgo(item.started_at)}
                </div>

                {/* Overlay Play */}
                <div className={cn(
                  "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity",
                  isCurrentPlaying ? "opacity-100 bg-black/60" : "opacity-0 group-hover:opacity-100"
                )}>
                  <PlayCircle className={cn("w-8 h-8 text-white drop-shadow-md", isCurrentPlaying && "text-indigo-400 animate-pulse")} />
                </div>
              </div>

              {/* Metadados */}
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-sm truncate group-hover:text-indigo-400 transition-colors">
                  {track.title}
                </h3>
                <p className="text-[11px] text-gray-500 truncate">
                  {track.artist}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
