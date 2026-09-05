'use client';

import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Mic, Filter, PlayCircle, Loader2, ListPlus, Heart, Zap, Music, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { YouTubeProvider } from '@/modules/femusic/infrastructure/providers/YouTubeProvider';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { MusicTrack } from '@/modules/femusic/domain/entities/MusicTrack';
import AddToPlaylistModal from '@/modules/femusic/presentation/components/AddToPlaylistModal';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<MusicTrack | null>(null);
  const [catalogHighlights, setCatalogHighlights] = useState<MusicTrack[]>([]);

  // Carrega faixas em destaque do acervo
  useEffect(() => {
    async function loadHighlights() {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase
          .from('femusic_cache')
          .select('youtube_id, audio_url, title, artist, cover, duration')
          .not('title', 'is', null)
          .order('created_at', { ascending: false })
          .limit(12);

        if (data) {
          setCatalogHighlights(data.map((t: any) => ({
            id: t.youtube_id,
            providerTrackId: t.youtube_id,
            title: t.title,
            artist: t.artist || 'FéConecta',
            cover: t.cover || `https://i.ytimg.com/vi/${t.youtube_id}/hqdefault.jpg`,
            duration: t.duration || 260,
            audioUrl: t.audio_url || null,
            provider: 'youtube',
          })));
        }
      } catch (e) {
        console.warn('Falha ao carregar destaques na busca:', e);
      }
    }
    loadHighlights();
  }, []);
  const { play, likedTracks, toggleLike } = usePlayerStore();
  
  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Search
  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      try {
        const { supabase } = await import('@/lib/supabase');
        
        // 1. Busca imediata no acervo local do banco de dados (femusic_cache)
        const { data: dbTracks } = await supabase
          .from('femusic_cache')
          .select('youtube_id, audio_url, title, artist, cover, duration')
          .or(`title.ilike.%${debouncedQuery}%,artist.ilike.%${debouncedQuery}%`)
          .limit(10);

        const localMatches: MusicTrack[] = (dbTracks || []).map((t: any) => ({
          id: t.youtube_id,
          providerTrackId: t.youtube_id,
          title: t.title,
          artist: t.artist || 'FéConecta',
          cover: t.cover || `https://i.ytimg.com/vi/${t.youtube_id}/hqdefault.jpg`,
          duration: t.duration || 260,
          audioUrl: t.audio_url || null,
          provider: 'youtube',
        }));

        // 2. Busca online complementar no YouTube
        const provider = new YouTubeProvider();
        const ytData = await provider.search(debouncedQuery).catch(() => []);

        // Prioriza as músicas que já estão no acervo local
        const mergedMap = new Map<string, MusicTrack>();
        localMatches.forEach(t => mergedMap.set(t.providerTrackId || t.id, t));
        ytData.forEach(t => {
          const id = t.providerTrackId || t.id;
          if (!mergedMap.has(id)) mergedMap.set(id, t);
        });

        setResults(Array.from(mergedMap.values()));
      } catch (e: any) {
        console.error('Busca falhou', e);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery]);
  
  const categories = [
    { name: 'Oração', color: 'bg-blue-500' },
    { name: 'Devocional', color: 'bg-green-500' },
    { name: 'Culto de Domingo', color: 'bg-whatsapp-teal' },
    { name: 'Louvor & Adoração', color: 'bg-purple-500' },
    { name: 'Para a Família', color: 'bg-pink-500' },
    { name: 'Lançamentos', color: 'bg-orange-500' },
  ];

  return (
    <div className="px-4 py-6 pb-24">
      <h1 className="font-black text-2xl leading-tight mb-6">Pesquisar</h1>

      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="block w-full pl-11 pr-12 py-3.5 bg-white dark:bg-[#1a1b1e] border-none rounded-2xl text-sm shadow-sm focus:ring-2 focus:ring-whatsapp-teal dark:text-white placeholder-gray-400"
          placeholder="Músicas, artistas, álbuns..."
        />
        <button type="button" className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-whatsapp-teal transition-colors">
          <Mic className="h-5 w-5" />
        </button>
      </div>

      {query ? (
        <div>
          <h2 className="font-bold text-lg mb-4">Melhores Resultados</h2>
          
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-whatsapp-teal" />
            </div>
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-3">
              {results.map((track) => {
                const trackId = track.providerTrackId || track.id;
                const isLiked = likedTracks.some(t => (t.providerTrackId || t.id) === trackId);
                return (
                  <div 
                    key={track.id} 
                    onClick={() => play(track, results)}
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-14 h-14 rounded-lg bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0 relative">
                        <img src={track.cover || ''} className="w-full h-full object-cover" />
                        {track.audioUrl && (
                          <div className="absolute top-1 left-1 px-1 py-0.2 rounded bg-black/80 text-[8px] font-bold text-emerald-400 flex items-center">
                            ⚡
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <PlayCircle className="w-6 h-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm truncate group-hover:text-whatsapp-teal transition-colors">{track.title}</h4>
                        <p className="text-xs text-gray-500 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleLike(track)}
                        className="p-2 transition-transform active:scale-90 text-gray-400 hover:text-red-500"
                        title="Curtir"
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'text-red-500 fill-red-500' : ''}`} />
                      </button>
                      <button
                        onClick={() => setSelectedTrackForPlaylist(track)}
                        className="p-2 transition-transform active:scale-90 text-gray-400 hover:text-whatsapp-teal"
                        title="Adicionar à Playlist"
                      >
                        <ListPlus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
             <div className="text-center py-10 text-gray-500 text-sm">
               Nenhuma música encontrada para "{query}".
             </div>
          )}
        </div>
      ) : (
        // Categorias e Destaques do Acervo
        <div className="space-y-8">
          {/* Destaques do Acervo FéConecta */}
          {catalogHighlights.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-500 fill-emerald-500" />
                  Destaques do Acervo FéConecta
                </h2>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  ⚡ Áudio Rápido
                </span>
              </div>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x">
                {catalogHighlights.map((track) => (
                  <div
                    key={track.id}
                    onClick={() => play(track, catalogHighlights)}
                    className="snap-start shrink-0 w-32 sm:w-36 flex flex-col gap-1.5 cursor-pointer group"
                  >
                    <div className="w-32 sm:w-36 h-24 rounded-xl overflow-hidden relative shadow-sm bg-gray-200 dark:bg-white/5 border border-white/5 group-hover:border-emerald-500/40 transition-all">
                      {track.cover ? (
                        <img src={track.cover} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt="" />
                      ) : (
                        <Music className="w-6 h-6 text-gray-400 m-auto mt-9" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircle className="w-7 h-7 text-white" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs truncate group-hover:text-emerald-500 transition-colors">{track.title}</p>
                      <p className="text-[10px] text-gray-500 truncate">{track.artist}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Filter className="w-5 h-5 text-whatsapp-teal" />
              Explorar Contextos
            </h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat, i) => (
              <button 
                key={i} 
                onClick={() => setQuery(cat.name + ' gospel')}
                className={cn(
                  "relative overflow-hidden h-24 rounded-2xl p-4 flex items-end shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-transform text-left",
                  cat.color
                )}
              >
                {/* Elementos decorativos de fundo */}
                <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-white/20 rounded-full blur-xl" />
                <div className="absolute -top-4 -left-4 w-12 h-12 bg-black/10 rounded-full blur-md" />
                
                <span className="relative z-10 text-white font-bold text-sm leading-tight">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </div>
        </div>
      )}

      {/* Modal de Adicionar à Playlist */}
      <AddToPlaylistModal
        isOpen={!!selectedTrackForPlaylist}
        onClose={() => setSelectedTrackForPlaylist(null)}
        track={selectedTrackForPlaylist}
      />
    </div>
  );
}
