'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Music, GripVertical, Heart, Volume2 } from 'lucide-react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { cn } from '@/lib/utils';

export default function MiniPlayer() {
  const { 
    currentTrack, isPlaying, isFullScreen, setFullScreen, 
    pause, resume, next, previous, progressMs, durationMs,
    likedTracks, toggleLike 
  } = usePlayerStore();
  
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

  // Inicializa a posição padrão segura
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateDefaultPos = () => {
      const isMobile = window.innerWidth < 768;
      const playerWidth = isMobile ? Math.min(window.innerWidth - 24, 400) : 400;
      const playerHeight = 74;
      const x = isMobile ? (window.innerWidth - playerWidth) / 2 : window.innerWidth - playerWidth - 24;
      const y = window.innerHeight - playerHeight - 96; // Acima da bottom nav
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

  // Handlers de Drag Super Suaves (com tracking global no window)
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Não arrasta se o clique foi em um botão de controle
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

    // Handlers globais no window para não perder o arraste em movimentos rápidos
    const onWindowPointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - dragRef.current.startX;
      const deltaY = moveEvent.clientY - dragRef.current.startY;

      if (Math.hypot(deltaX, deltaY) > 4) {
        dragRef.current.hasMoved = true;
      }

      if (!playerRef.current) return;
      const rect = playerRef.current.getBoundingClientRect();
      const maxX = Math.max(8, window.innerWidth - rect.width - 8);
      const maxY = Math.max(8, window.innerHeight - rect.height - 12);

      const nextX = Math.min(Math.max(8, dragRef.current.initialX + deltaX), maxX);
      const nextY = Math.min(Math.max(8, dragRef.current.initialY + deltaY), maxY);

      setPosition({ x: nextX, y: nextY });
    };

    const onWindowPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
    };

    window.addEventListener('pointermove', onWindowPointerMove, { passive: true });
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);
  }, []);

  const handleClickPlayer = (e: React.MouseEvent) => {
    // Só abre fullscreen se não foi um movimento de arrastar e não foi clique em botão
    if (!dragRef.current.hasMoved && !(e.target as HTMLElement).closest('button')) {
      setFullScreen(true);
    }
  };

  if (!currentTrack || isFullScreen) {
    return null;
  }

  const currentId = currentTrack.providerTrackId || currentTrack.id;
  const isLiked = likedTracks.some(t => (t.providerTrackId || t.id) === currentId);

  // Duração e Progresso
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
        bottom: position ? 'auto' : '96px',
        touchAction: 'none',
      }}
      className={cn(
        "w-[calc(100vw-24px)] max-w-[400px] h-[72px] rounded-2xl p-2 z-[300] select-none text-white overflow-hidden group transition-all duration-200",
        "bg-[#111113]/95 backdrop-blur-2xl border shadow-[0_16px_40px_rgba(0,0,0,0.8)]",
        isDragging 
          ? "cursor-grabbing border-[#3FFF8B] shadow-[0_20px_50px_rgba(63,255,139,0.3)] scale-[1.03] ring-1 ring-[#3FFF8B]/50" 
          : "cursor-grab border-white/10 hover:border-white/20 hover:shadow-[0_20px_45px_rgba(0,0,0,0.9)]"
      )}
    >
      {/* Glow de fundo ambiental baseado na cor */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#3FFF8B]/10 via-transparent to-purple-500/10 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity" />

      {/* Barra de Progresso Fina no Topo do Mini Player com Neon Glow */}
      <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-white/10 pointer-events-none">
        <div 
          className="h-full bg-gradient-to-r from-emerald-400 to-[#3FFF8B] shadow-[0_0_8px_#3FFF8B] transition-all duration-300"
          style={{ width: `${currentPct}%` }}
        />
      </div>

      <div className="relative w-full h-full flex items-center gap-2.5 z-10">
        {/* Grip de Arraste */}
        <div className="text-white/25 group-hover:text-white/70 transition-colors shrink-0 -mr-0.5 cursor-grab">
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        {/* Disco de Capa com Efeito Vinil Giratório quando ativo */}
        <div className="relative w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-black/40 border border-white/10 shadow-md group/cover">
          {currentTrack.cover ? (
            <img 
              src={currentTrack.cover} 
              alt={currentTrack.title} 
              className={cn(
                "w-full h-full object-cover transition-transform duration-500",
                isPlaying ? "animate-[spin_16s_linear_infinite]" : "scale-100"
              )}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
              <Music className="w-5 h-5 text-[#3FFF8B]" />
            </div>
          )}

          {/* Centro do disco com glow de status */}
          <div className="absolute inset-0 m-auto w-3 h-3 rounded-full bg-[#111113] border border-white/20 shadow-inner flex items-center justify-center pointer-events-none">
            <div className={cn("w-1 h-1 rounded-full", isPlaying ? "bg-[#3FFF8B] animate-ping" : "bg-white/40")} />
          </div>
        </div>
        
        {/* Informações da Faixa + Equalizador em Ondas */}
        <div className="flex-1 min-w-0 pr-1 pointer-events-none">
          <div className="flex items-center gap-1.5">
            <h4 className="font-bold text-xs text-white truncate leading-tight tracking-tight">
              {currentTrack.title}
            </h4>
          </div>
          
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[11px] text-zinc-400 truncate max-w-[150px]">
              {currentTrack.artist || 'FéConecta Music'}
            </p>
            
            {/* Equalizador Animado quando tocando */}
            {isPlaying && (
              <div className="flex items-end gap-0.5 h-2.5 shrink-0">
                <span className="w-0.5 h-full bg-[#3FFF8B] rounded-full animate-[pulse_0.6s_ease-in-out_infinite]" />
                <span className="w-0.5 h-2/3 bg-[#3FFF8B] rounded-full animate-[pulse_0.8s_ease-in-out_infinite_0.2s]" />
                <span className="w-0.5 h-4/5 bg-[#3FFF8B] rounded-full animate-[pulse_0.5s_ease-in-out_infinite_0.4s]" />
              </div>
            )}
          </div>
        </div>

        {/* Botões de Ação e Controle */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Botão Curtir Rápido */}
          <button
            onClick={() => toggleLike(currentTrack)}
            aria-label="Curtir faixa"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all"
            title="Curtir"
          >
            <Heart className={cn("w-3.5 h-3.5 transition-colors", isLiked ? "text-[#3FFF8B] fill-[#3FFF8B]" : "text-zinc-400")} />
          </button>

          {/* Faixa Anterior */}
          <button 
            onClick={() => previous(true)}
            aria-label="Faixa anterior"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all active:scale-90"
          >
            <SkipBack className="w-3.5 h-3.5" fill="currentColor" />
          </button>
          
          {/* Play / Pause Principal */}
          <button 
            onClick={() => isPlaying ? pause() : resume()}
            aria-label={isPlaying ? "Pausar" : "Tocar"}
            className="w-9 h-9 flex items-center justify-center bg-white hover:bg-[#3FFF8B] text-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_18px_rgba(63,255,139,0.5)] shrink-0 font-bold"
          >
            {isPlaying ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}
          </button>
          
          {/* Próxima Faixa */}
          <button 
            onClick={() => next(true)}
            aria-label="Próxima faixa"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-all active:scale-90"
          >
            <SkipForward className="w-3.5 h-3.5" fill="currentColor" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-0.5" />

          {/* Fechar Player */}
          <button 
            onClick={async (e) => {
              e.stopPropagation();
              await pause();
              usePlayerStore.setState({ currentTrack: null, queue: [], isPlaying: false, progressMs: 0 });
            }}
            aria-label="Fechar player"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            title="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
