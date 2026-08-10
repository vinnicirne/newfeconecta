"use client";

import React, { useEffect, useState } from 'react';
import { PlayCircle, Plus, Music, Sparkles, Radio } from 'lucide-react';
import MusicComposerModal from '@/components/feed/MusicComposerModal';
import { supabase } from '@/lib/supabase';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { YouTubeService } from '@/modules/femusic/infrastructure/services/YouTubeService';
import ReadySessions from '@/modules/femusic/presentation/components/ReadySessions';
import ContinueListening from '@/modules/femusic/presentation/components/ContinueListening';
import { useWarmCache } from '@/modules/femusic/application/useWarmCache';
import { cn } from '@/lib/utils';
import { READY_SESSIONS } from '@/modules/femusic/domain/sessions';

const defaultTrending = [
  ...READY_SESSIONS[0].curatedTracks.slice(0, 4),
  ...READY_SESSIONS[3].curatedTracks.slice(0, 4),
  ...READY_SESSIONS[1].curatedTracks.slice(0, 3)
];

const defaultWorship = [
  ...READY_SESSIONS[2].curatedTracks.slice(0, 4),
  ...READY_SESSIONS[0].curatedTracks.slice(4, 8),
  ...READY_SESSIONS[1].curatedTracks.slice(3, 7)
];

export default function MusicFeedPage() {
  useWarmCache();
  const [history, setHistory] = useState<any[]>([]);
  const [trending, setTrending] = useState<any[]>(defaultTrending);
  const [worship, setWorship] = useState<any[]>(defaultWorship);
  const [loading, setLoading] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const { play } = usePlayerStore();
  
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('fc_profile_cache');
      if (cached) setUser(JSON.parse(cached));
    }
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
      // Fetch trending gospel from YouTube using high-quality keywords
      try {
        const youtubeGospel = await YouTubeService.getTrending(20);
        if (youtubeGospel && youtubeGospel.length > 0) {
          setTrending(youtubeGospel);
        }
      } catch (e) {
        console.error("Falha ao buscar youtube gospel", e);
      }

      // Fetch worship hits for the second carousel
      try {
        const worshipHits = await YouTubeService.search('louvor e adoração gospel ao vivo oficial', 50);
        if (worshipHits && worshipHits.length > 0) {
          setWorship(worshipHits.filter((t: any) => t.duration <= 900).slice(0, 15));
        }
      } catch (e) {
        console.error("Falha ao buscar adoração", e);
      }

      // Carregar histórico real do localStorage
      if (typeof window !== 'undefined') {
        try {
          const historyStr = localStorage.getItem('fc_music_history');
          if (historyStr) {
            const parsed = JSON.parse(historyStr);
            // Filtrar apenas faixas que tenham título válido
            setHistory(parsed.filter((t: any) => t && t.title && t.title.trim() !== ''));
          } else {
            setHistory([]); // Vazio por padrão se não tiver histórico
          }
        } catch (e) {
          console.error("Falha ao ler histórico", e);
        }
      }
      
      setLoading(false);
    }
    
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black/95 text-gray-900 dark:text-gray-100 pb-24">
      {/* New Header */}
      <div className="px-4 py-6 flex items-center justify-between">
        <div>
          <h1 className="font-black text-2xl leading-tight">
            {getGreeting()}, {user?.full_name ? user.full_name.split(' ')[0] : 'irmão(ã)'}!
          </h1>
          <p className="text-sm text-gray-500 font-medium">O que vamos ouvir hoje?</p>
        </div>
        <button
          onClick={() => setIsComposerOpen(true)}
          className="w-12 h-12 rounded-full bg-whatsapp-teal text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Continuar Ouvindo (Sessão salva com progresso) */}
      <div className="px-4">
        <ContinueListening />
      </div>


      {/* Jukebox: Músicas ouvidas recentemente — 2 linhas com scroll horizontal */}
      {history.length > 0 && (
        <div className="px-4 mb-8">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-whatsapp-teal" />
            Músicas ouvidas recentemente
          </h2>
          {/* Grid fixo de 3 colunas × 2 linhas (max 6 músicas) */}
          <div className="grid grid-cols-3 grid-rows-2 gap-3 pb-3">
            {history.slice(0, 6).map((track, i) => (
              <div
                key={i}
                onClick={() => play(track, history)}
                className="relative aspect-square w-full rounded-xl overflow-hidden cursor-pointer group shadow-md bg-gray-200 dark:bg-white/5"
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
                {/* Overlay escuro com ícone de play */}
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity duration-200">
                  <PlayCircle className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
                {/* Gradiente com título na base */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-4">
                  <p className="text-white text-[9px] font-bold leading-tight truncate drop-shadow">
                    {track.title || 'Faixa'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessões Prontas */}
      <div className="px-4">
        <ReadySessions />
      </div>

      {/* Carrossel: Em alta */}
      <div className="px-4 mb-8">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Music className="w-5 h-5 text-whatsapp-teal" />
          Em alta no FéConecta
        </h2>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 snap-x">
          {trending.length > 0 ? trending.map((track, i) => (
            <div key={i} className="snap-start shrink-0 w-40 flex flex-col gap-2 cursor-pointer group" onClick={() => play(track, trending)}>
              <div className="w-40 h-28 rounded-2xl overflow-hidden relative shadow-md bg-gray-200 dark:bg-white/5 flex items-center justify-center">
                {track.cover ? (
                  <img src={track.cover} className="w-full h-full object-cover" />
                ) : (
                  <Music className="w-8 h-8 text-gray-400" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlayCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm truncate">{track.title || 'Faixa Desconhecida'}</h3>
                <p className="text-xs text-gray-500 truncate">{track.artist || 'Sem artista'}</p>
              </div>
            </div>
          )) : (
            <div className="text-gray-500 text-sm">Nenhuma música em alta.</div>
          )}
        </div>
      </div>

      {/* Carrossel: Louvor & Adoração */}
      <div className="px-4 mb-12">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-whatsapp-teal" />
          Louvor & Adoração ao Vivo
        </h2>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 snap-x">
          {worship.length > 0 ? worship.map((track, i) => (
            <div key={i} className="snap-start shrink-0 w-40 flex flex-col gap-2 cursor-pointer group" onClick={() => play(track, worship)}>
              <div className="w-40 h-28 rounded-2xl overflow-hidden relative shadow-md bg-gray-200 dark:bg-white/5 flex items-center justify-center">
                {track.cover ? (
                  <img src={track.cover} className="w-full h-full object-cover" />
                ) : (
                  <Radio className="w-8 h-8 text-gray-400" />
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <PlayCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm truncate">{track.title || 'Faixa Desconhecida'}</h3>
                <p className="text-xs text-gray-500 truncate">{track.artist || 'Sem artista'}</p>
              </div>
            </div>
          )) : (
            <div className="text-gray-500 text-sm">Carregando louvores...</div>
          )}
        </div>
      </div>

      <MusicComposerModal 
        isOpen={isComposerOpen} 
        onClose={() => setIsComposerOpen(false)} 
        onSuccess={() => {
          setIsComposerOpen(false);
        }}
      />
    </div>
  );
}
