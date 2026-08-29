'use client';

import React from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Music } from 'lucide-react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';

export default function MiniPlayer() {
  const { currentTrack, isPlaying, isFullScreen, setFullScreen, pause, resume, next, previous, progressMs, durationMs } = usePlayerStore();
  
  if (!currentTrack || isFullScreen) {
    return null;
  }

  // durationMs da store já está em ms. currentTrack.duration vem em SEGUNDOS — converter.
  const trackDurMs = currentTrack?.duration && currentTrack.duration > 0
    ? (currentTrack.duration > 3600 ? currentTrack.duration : currentTrack.duration * 1000)
    : 0;
  const effectiveDuration = durationMs > 0 ? durationMs : trackDurMs;
  const currentPct = effectiveDuration > 0 ? Math.min(100, Math.max(0, (progressMs / effectiveDuration) * 100)) : 0;


  return (
    <div 
      onClick={() => setFullScreen(true)}
      className="fixed left-3 right-3 md:left-auto md:right-4 md:w-96 backdrop-blur-2xl border border-white/10 rounded-2xl p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.6)] flex items-center gap-3 z-[300] cursor-pointer bg-[#131313]/90 text-white overflow-hidden group hover:border-white/20 transition-all"
      style={{ bottom: '90px' }}
    >
      {/* Barra de Progresso Fina no Topo do Mini Player */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10">
        <div 
          className="h-full bg-[#3FFF8B] shadow-[0_0_6px_#3FFF8B] transition-all duration-300"
          style={{ width: `${currentPct}%` }}
        />
      </div>

      <div className="relative w-11 h-11 shrink-0 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center border border-white/10">
        {currentTrack.cover ? (
          <img 
            src={currentTrack.cover} 
            alt={currentTrack.title} 
            className="w-full h-full object-cover"
          />
        ) : (
          <Music className="w-5 h-5 text-[#3FFF8B]" />
        )}
      </div>
      
      <div className="flex-1 min-w-0 pr-1">
        <h4 className="font-bold text-xs text-white truncate leading-tight">{currentTrack.title}</h4>
        <p className="text-[11px] text-[#A8A8A8] truncate mt-0.5">{currentTrack.artist || 'FéConecta Music'}</p>
      </div>

      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={() => previous(true)}
          aria-label="Faixa anterior"
          className="w-7 h-7 flex items-center justify-center text-[#A8A8A8] hover:text-white transition-colors active:scale-90"
        >
          <SkipBack className="w-3.5 h-3.5" fill="currentColor" />
        </button>
        
        <button 
          onClick={() => isPlaying ? pause() : resume()}
          aria-label={isPlaying ? "Pausar" : "Tocar"}
          className="w-8 h-8 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-md shrink-0"
        >
          {isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
        </button>
        
        <button 
          onClick={() => next(true)}
          aria-label="Próxima faixa"
          className="w-7 h-7 flex items-center justify-center text-[#A8A8A8] hover:text-white transition-colors active:scale-90"
        >
          <SkipForward className="w-3.5 h-3.5" fill="currentColor" />
        </button>

        <div className="w-px h-4 bg-white/10 mx-0.5" />

        <button 
          onClick={async (e) => {
            e.stopPropagation();
            await pause();
            usePlayerStore.setState({ currentTrack: null, queue: [], isPlaying: false, progressMs: 0 });
          }}
          aria-label="Fechar player"
          className="w-7 h-7 flex items-center justify-center text-[#A8A8A8] hover:text-red-400 transition-colors"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
