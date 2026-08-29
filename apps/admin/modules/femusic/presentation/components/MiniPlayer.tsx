'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Music, GripVertical } from 'lucide-react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';

export default function MiniPlayer() {
  const { currentTrack, isPlaying, isFullScreen, setFullScreen, pause, resume, next, previous, progressMs, durationMs } = usePlayerStore();
  
  // Posição arrastável do MiniPlayer
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number; hasMoved: boolean }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    hasMoved: false,
  });
  const playerRef = useRef<HTMLDivElement>(null);

  // Inicializa a posição padrão segura (canto inferior direito ou centralizado no mobile)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateDefaultPos = () => {
      const isMobile = window.innerWidth < 768;
      const playerWidth = isMobile ? Math.min(window.innerWidth - 24, 380) : 380;
      const playerHeight = 68;
      const x = isMobile ? (window.innerWidth - playerWidth) / 2 : window.innerWidth - playerWidth - 20;
      const y = window.innerHeight - playerHeight - 90; // Acima da bottom nav
      setPosition({ x, y });
    };

    if (!position) {
      updateDefaultPos();
    }
  }, [position]);

  // Listener para ajuste em resize da tela
  useEffect(() => {
    const handleResize = () => {
      if (!playerRef.current) return;
      const rect = playerRef.current.getBoundingClientRect();
      const maxX = Math.max(10, window.innerWidth - rect.width - 10);
      const maxY = Math.max(10, window.innerHeight - rect.height - 20);

      setPosition((prev) => {
        if (!prev) return prev;
        return {
          x: Math.min(Math.max(10, prev.x), maxX),
          y: Math.min(Math.max(10, prev.y), maxY),
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handlers de Drag (Pointer Events unificados: Mouse + Touch)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Não inicia drag se clicar nos botões de controle
    if ((e.target as HTMLElement).closest('button')) return;

    if (!playerRef.current) return;
    const rect = playerRef.current.getBoundingClientRect();

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: rect.left,
      initialY: rect.top,
      hasMoved: false,
    };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || !playerRef.current) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    if (Math.hypot(deltaX, deltaY) > 5) {
      dragRef.current.hasMoved = true;
    }

    const rect = playerRef.current.getBoundingClientRect();
    const maxX = Math.max(10, window.innerWidth - rect.width - 10);
    const maxY = Math.max(10, window.innerHeight - rect.height - 20);

    const nextX = Math.min(Math.max(10, dragRef.current.initialX + deltaX), maxX);
    const nextY = Math.min(Math.max(10, dragRef.current.initialY + deltaY), maxY);

    setPosition({ x: nextX, y: nextY });
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
  }, [isDragging]);

  const handleClickPlayer = () => {
    // Só abre fullscreen se não foi um movimento de arrastar
    if (!dragRef.current.hasMoved) {
      setFullScreen(true);
    }
  };

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
      ref={playerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onClick={handleClickPlayer}
      style={{
        position: 'fixed',
        left: position ? `${position.x}px` : '12px',
        top: position ? `${position.y}px` : 'auto',
        bottom: position ? 'auto' : '90px',
        touchAction: 'none',
      }}
      className={`w-[calc(100vw-24px)] max-w-[380px] backdrop-blur-2xl border rounded-2xl p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex items-center gap-2.5 z-[300] select-none bg-[#131313]/95 text-white overflow-hidden group transition-colors ${
        isDragging 
          ? 'cursor-grabbing border-[#3FFF8B]/60 shadow-[0_16px_50px_rgba(63,255,139,0.25)] scale-[1.02]' 
          : 'cursor-grab border-white/10 hover:border-white/20'
      }`}
    >
      {/* Barra de Progresso Fina no Topo do Mini Player */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-white/10 pointer-events-none">
        <div 
          className="h-full bg-[#3FFF8B] shadow-[0_0_6px_#3FFF8B] transition-all duration-300"
          style={{ width: `${currentPct}%` }}
        />
      </div>

      {/* Ícone Indicador de Arraste (Grip) */}
      <div className="text-white/30 group-hover:text-white/70 transition-colors shrink-0 -mr-1 cursor-grab">
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      <div className="relative w-10 h-10 shrink-0 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center border border-white/10 pointer-events-none">
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
      
      <div className="flex-1 min-w-0 pr-1 pointer-events-none">
        <h4 className="font-bold text-xs text-white truncate leading-tight">{currentTrack.title}</h4>
        <p className="text-[11px] text-[#A8A8A8] truncate mt-0.5">{currentTrack.artist || 'FéConecta Music'}</p>
      </div>

      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
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
