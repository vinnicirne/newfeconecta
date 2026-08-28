'use client';

import React, { useEffect, useState } from 'react';
import { PlayCircle, Plus, Music, Sparkles, Radio, ListPlus, Flame, Loader2 } from 'lucide-react';
import MusicComposerModal from '@/components/feed/MusicComposerModal';
import AddToPlaylistModal from '@/modules/femusic/presentation/components/AddToPlaylistModal';
import { MusicTrack } from '@/modules/femusic/domain/entities/MusicTrack';
import { supabase } from '@/lib/supabase';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { YouTubeService } from '@/modules/femusic/infrastructure/services/YouTubeService';
import ReadySessions from '@/modules/femusic/presentation/components/ReadySessions';
import ContinueListening from '@/modules/femusic/presentation/components/ContinueListening';
import { useWarmCache } from '@/modules/femusic/application/useWarmCache';
import { cn } from '@/lib/utils';
import { READY_SESSIONS } from '@/modules/femusic/domain/sessions';
import { getStoredProfile } from '@/lib/profile-cache';

const INITIAL_TRENDING_SEEDS: MusicTrack[] = [
  {
    id: 'trending-1',
    title: 'Lugar Secreto',
    artist: 'Gabriela Rocha',
    duration: 320,
    cover: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600',
    provider: 'youtube',
    providerTrackId: 'y3x9B92p10w',
  },
  {
    id: 'trending-2',
    title: 'A Casa É Sua',
    artist: 'Casa Worship',
    duration: 480,
    cover: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600',
    provider: 'youtube',
    providerTrackId: 'v4m3X89fL10',
  },
  {
    id: 'trending-3',
    title: 'Bondade de Deus',
    artist: 'Isadora Pompeo',
    duration: 310,
    cover: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600',
    provider: 'youtube',
    providerTrackId: 'i8L3k11w9Mp',
  },
  {
    id: 'trending-4',
    title: 'Pode Morar Aqui',
    artist: 'Theo Rubia',
    duration: 520,
    cover: 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=600',
    provider: 'youtube',
    providerTrackId: 't9K2m10w8Lp',
  },
];

const INITIAL_WORSHIP_SEEDS: MusicTrack[] = [
  {
    id: 'worship-1',
    title: 'Para Que Entre o Rei',
    artist: 'Morada',
    duration: 410,
    cover: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600',
    provider: 'youtube',
    providerTrackId: 'p7k9N21w8L0',
  },
  {
    id: 'worship-2',
    title: 'Raridade',
    artist: 'Anderson Freire',
    duration: 285,
    cover: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600',
    provider: 'youtube',
    providerTrackId: 'a9K1m00w8Ff',
  },
  {
    id: 'worship-3',
    title: 'Em Teus Braços',
    artist: 'Laura Souguellis',
    duration: 430,
    cover: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600',
    provider: 'youtube',
    providerTrackId: 'n4X8p11fL22',
  },
];

export default function MusicFeedPage() {
  useWarmCache();
  const [history, setHistory] = useState<any[]>([]);
  const [trending, setTrending] = useState<MusicTrack[]>(INITIAL_TRENDING_SEEDS);
  const [worship, setWorship] = useState<MusicTrack[]>(INITIAL_WORSHIP_SEEDS);
  const [loading, setLoading] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<MusicTrack | null>(null);
  const { play } = usePlayerStore();
  
  const [user, setUser] = useState<any>(() => getStoredProfile());

  useEffect(() => {
    const handleHydration = (e: any) => {
      setUser((prev: any) => ({ ...prev, ...e.detail }));
    };
    window.addEventListener('profile-hydrated', handleHydration);
    return () => window.removeEventListener('profile-hydrated', handleHydration);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // 1. Carrega histórico real do localStorage
      if (typeof window !== 'undefined') {
        try {
          const historyStr = localStorage.getItem('fc_music_history');
          if (historyStr) {
            const parsed = JSON.parse(historyStr);
            setHistory(parsed.filter((t: any) => t && t.title && t.title.trim() !== ''));
          } else {
            setHistory([]);
          }
        } catch (e) {
          console.error("Falha ao ler histórico", e);
        }
      }

      // 2. Busca Louvores em Alta do YouTube
      try {
        const youtubeGospel = await YouTubeService.getTrending(20);
        if (youtubeGospel && youtubeGospel.length > 0) {
          setTrending(youtubeGospel);
        }
      } catch (e) {
        console.warn("Usando catálogo semente para Em Alta", e);
      }

      // 3. Busca Louvores & Adoração ao Vivo
      try {
        const worshipHits = await YouTubeService.search('louvor e adoração gospel ao vivo oficial', 30);
        if (worshipHits && worshipHits.length > 0) {
          setWorship(worshipHits.filter((t: any) => t.duration <= 1200).slice(0, 15));
        }
      } catch (e) {
        console.warn("Usando catálogo semente para Adoração", e);
      }

      setLoading(false);
    }
    
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black/95 text-gray-900 dark:text-gray-100 pb-28">
      {/* Header do FéMusic */}
      <div className="px-4 py-6 flex items-center justify-between">
        <div>
          <h1 className="font-black text-2xl leading-tight">
            {getGreeting()}, {user?.full_name ? user.full_name.split(' ')[0] : (user?.username || 'irmão(ã)')}!
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium">O que vamos louvar hoje?</p>
        </div>
        <button
          onClick={() => setIsComposerOpen(true)}
          className="w-11 h-11 rounded-full bg-whatsapp-teal text-white flex items-center justify-center shadow-lg shadow-whatsapp-teal/20 hover:scale-105 active:scale-95 transition-all"
          title="Compartilhar Louvor"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Continuar Ouvindo (Sessão salva com progresso) */}
      <div className="px-4">
        <ContinueListening />
      </div>

      {/* Músicas ouvidas recentemente */}
      {history.length > 0 && (
        <div className="px-4 mb-8">
          <h2 className="font-bold text-base sm:text-lg mb-3 flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-whatsapp-teal" />
            Músicas ouvidas recentemente
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 pb-2">
            {history.slice(0, 6).map((track, i) => (
              <div
                key={i}
                onClick={() => play(track, history)}
                className="relative aspect-square w-full rounded-2xl overflow-hidden cursor-pointer group shadow-md bg-gray-200 dark:bg-white/5 border border-white/5"
              >
                {track.cover ? (
                  <img
                    src={track.cover}
                    alt={track.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity duration-200">
                  <PlayCircle className="w-7 h-7 text-white drop-shadow-lg" />
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-4">
                  <p className="text-white text-[10px] font-bold leading-tight truncate drop-shadow">
                    {track.title || 'Faixa'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessões Prontas Oficiais */}
      <div className="px-4">
        <ReadySessions />
      </div>

      {/* Carrossel: Em alta */}
      <div className="px-4 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
            <Music className="w-5 h-5 text-whatsapp-teal" />
            Em alta no FéConecta
          </h2>
          <span className="text-[11px] font-bold text-whatsapp-teal dark:text-whatsapp-green">
            Top Louvores
          </span>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 snap-x">
          {trending.map((track, i) => (
            <div 
              key={track.id || i} 
              className="snap-start shrink-0 w-36 sm:w-40 flex flex-col gap-2 cursor-pointer group" 
              onClick={() => play(track, trending)}
            >
              <div className="w-36 sm:w-40 h-28 rounded-2xl overflow-hidden relative shadow-md bg-gray-200 dark:bg-white/5 flex items-center justify-center border border-white/5">
                {track.cover ? (
                  <img src={track.cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={track.title} />
                ) : (
                  <Music className="w-8 h-8 text-gray-400" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlayCircle className="w-8 h-8 text-white drop-shadow-md" />
                </div>
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
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-sm truncate group-hover:text-whatsapp-teal transition-colors">{track.title || 'Faixa Desconhecida'}</h3>
                <p className="text-[11px] text-gray-500 truncate">{track.artist || 'FéConecta Music'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Carrossel: Louvor & Adoração */}
      <div className="px-4 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-whatsapp-teal" />
            Louvor & Adoração ao Vivo
          </h2>
          <span className="text-[11px] font-bold text-whatsapp-teal dark:text-whatsapp-green">
            Ao Vivo
          </span>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-3 snap-x">
          {worship.map((track, i) => (
            <div 
              key={track.id || i} 
              className="snap-start shrink-0 w-36 sm:w-40 flex flex-col gap-2 cursor-pointer group" 
              onClick={() => play(track, worship)}
            >
              <div className="w-36 sm:w-40 h-28 rounded-2xl overflow-hidden relative shadow-md bg-gray-200 dark:bg-white/5 flex items-center justify-center border border-white/5">
                {track.cover ? (
                  <img src={track.cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt={track.title} />
                ) : (
                  <Radio className="w-8 h-8 text-gray-400" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlayCircle className="w-8 h-8 text-white drop-shadow-md" />
                </div>
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
              <div className="min-w-0">
                <h3 className="font-bold text-xs sm:text-sm truncate group-hover:text-whatsapp-teal transition-colors">{track.title || 'Faixa Desconhecida'}</h3>
                <p className="text-[11px] text-gray-500 truncate">{track.artist || 'FéConecta Music'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MusicComposerModal 
        isOpen={isComposerOpen} 
        onClose={() => setIsComposerOpen(false)} 
        onSuccess={() => {
          setIsComposerOpen(false);
        }}
      />

      <AddToPlaylistModal
        isOpen={!!selectedTrackForPlaylist}
        onClose={() => setSelectedTrackForPlaylist(null)}
        track={selectedTrackForPlaylist}
      />
    </div>
  );
}
