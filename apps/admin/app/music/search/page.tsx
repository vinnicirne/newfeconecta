'use client';

import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Mic, Filter, PlayCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { YouTubeProvider } from '@/modules/femusic/infrastructure/providers/YouTubeProvider';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { MusicTrack } from '@/modules/femusic/domain/entities/MusicTrack';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const { play } = usePlayerStore();
  
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
        const provider = new YouTubeProvider();
        const data = await provider.search(debouncedQuery);
        setResults(data);
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
              {results.map((track) => (
                <div 
                  key={track.id} 
                  onClick={() => play(track, results)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <div className="w-14 h-14 rounded-lg bg-gray-200 dark:bg-white/10 overflow-hidden shrink-0 relative">
                    <img src={track.cover || ''} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <PlayCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm truncate">{track.title}</h4>
                    <p className="text-xs text-gray-500 truncate">{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-10 text-gray-500 text-sm">
               Nenhuma música encontrada para "{query}".
             </div>
          )}
        </div>
      ) : (
        // Categorias de Contexto Cristão
        <div>
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-whatsapp-teal" />
            Explorar Contextos
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat, i) => (
              <button 
                key={i} 
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
      )}
    </div>
  );
}
