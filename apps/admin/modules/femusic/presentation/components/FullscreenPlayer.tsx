'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, Play, Pause, SkipBack, SkipForward,
  Heart, MessageCircle, Share2,
  Shuffle, Repeat, Repeat1, Music2, Video,
  MoreVertical, ListMusic, Loader2, Plus
} from 'lucide-react';
import MusicShareModal from './MusicShareModal';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { cn } from '@/lib/utils';
import MusicComposerModal from '@/components/feed/MusicComposerModal';
import TrackCommentsModal from './TrackCommentsModal';
import AddToPlaylistModal from './AddToPlaylistModal';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/lib/supabase';

export default function FullscreenPlayer() {
  const { 
    currentTrack, isPlaying, isFullScreen, setFullScreen, 
    pause, resume, next, previous, 
    progressMs, durationMs, seek, 
    setVideoVisible, 
    likedTracks, toggleLike, loadLikes,
    isShuffled, toggleShuffle,
    repeatMode, cycleRepeat,
    isLoading,
  } = usePlayerStore();

  const [isComposerOpen, setIsComposerOpen] = React.useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = React.useState(false);
  const [isShareOpen, setIsShareOpen] = React.useState(false);
  const [isAddToPlaylistOpen, setIsAddToPlaylistOpen] = React.useState(false);
  const [lyricsOpen, setLyricsOpen] = React.useState(false);
  const [commentsCount, setCommentsCount] = React.useState(0);

  // Estados e Refs para arrasto / scrubbing contínuo da barra de progresso
  const timelineRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragProgressMs, setDragProgressMs] = React.useState<number | null>(null);

  React.useEffect(() => { loadLikes(); }, [loadLikes]);

  const ytId = currentTrack ? (currentTrack.providerTrackId || currentTrack.id) : null;

  React.useEffect(() => {
    if (!ytId) return;

    let isMounted = true;
    async function loadCommentsCount() {
      try {
        const { count } = await supabase
          .from('music_comments')
          .select('*', { count: 'exact', head: true })
          .eq('track_id', ytId);

        if (isMounted) {
          setCommentsCount(count || 0);
        }
      } catch {
        if (isMounted) {
          setCommentsCount(0);
        }
      }
    }

    loadCommentsCount();

    return () => {
      isMounted = false;
    };
  }, [ytId]);

  // durationMs da store já está em ms. currentTrack.duration vem em SEGUNDOS — converter.
  const trackDurMs = currentTrack?.duration && currentTrack.duration > 0
    ? (currentTrack.duration > 3600 ? currentTrack.duration : currentTrack.duration * 1000)
    : 0;
  const effectiveDuration = durationMs > 0 ? durationMs : trackDurMs;


  const calculateProgressFromPointer = (clientX: number): number => {
    if (!timelineRef.current || effectiveDuration <= 0) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * effectiveDuration;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (effectiveDuration <= 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDragging(true);
    const newMs = calculateProgressFromPointer(e.clientX);
    setDragProgressMs(newMs);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || effectiveDuration <= 0) return;
    const newMs = calculateProgressFromPointer(e.clientX);
    setDragProgressMs(newMs);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch (_) {}
    setIsDragging(false);
    const finalMs = calculateProgressFromPointer(e.clientX);
    setDragProgressMs(null);
    seek(finalMs);
  };

  // Intercepta o botão "Voltar" do celular Android/iOS para fechar o player
  React.useEffect(() => {
    if (isFullScreen) {
      const isNative = typeof window !== 'undefined' && Capacitor.getPlatform() !== 'web';

      if (isNative) {
        let backListener: any;
        CapApp.addListener('backButton', () => {
          setFullScreen(false);
        }).then(listener => {
          backListener = listener;
        });

        return () => {
          if (backListener) backListener.remove();
        };
      } else {
        window.history.pushState({ playerOpen: true }, '', window.location.href);
        
        const handlePopState = () => {
          setFullScreen(false);
        };

        window.addEventListener('popstate', handlePopState);
        return () => {
          window.removeEventListener('popstate', handlePopState);
          if (window.history.state?.playerOpen) {
            window.history.back();
          }
        };
      }
    }
  }, [isFullScreen, setFullScreen]);

  if (!currentTrack) return null;

  const currentId = currentTrack.providerTrackId || currentTrack.id;
  const isLiked = likedTracks.some(t => (t.providerTrackId || t.id) === currentId);

  const fmt = (ms: number) => {
    if (!ms || isNaN(ms) || ms < 0) return '0:00';
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const displayedProgress = isDragging && dragProgressMs !== null ? dragProgressMs : progressMs;
  const currentPct = effectiveDuration > 0 ? Math.min(100, Math.max(0, (displayedProgress / effectiveDuration) * 100)) : 0;

  return (
    <AnimatePresence>
      {isFullScreen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 240 }}
          className="fixed inset-0 z-[9999] text-white bg-black flex flex-col justify-between overflow-hidden antialiased select-none"
          style={{ height: '100dvh' }}
        >
          {/* Fundo dinâmico com blur suave */}
          <div className="absolute inset-0 bg-[#0e0e0e]" />
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `url(${currentTrack.cover || ''})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(70px)',
              transform: 'scale(1.4)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-black/80 pointer-events-none" />

          {/* ─── HEADER ─── */}
          <header className="relative z-20 flex items-center justify-between px-4 pt-6 pb-2 shrink-0">
            <button
              onClick={() => setFullScreen(false)}
              aria-label="Minimizar player"
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all text-white/90"
            >
              <ChevronDown className="w-7 h-7" />
            </button>

            <div className="text-center flex-1 px-2">
              <h1 className="text-[10px] uppercase tracking-[0.2em] text-[#A8A8A8] font-bold">
                Tocando agora
              </h1>
              <p className="text-xs font-semibold text-gray-200 truncate max-w-[220px] mx-auto mt-0.5">
                {currentTrack.artist || 'FéConecta Music'}
              </p>
            </div>

            <button
              onClick={() => setVideoVisible(true)}
              aria-label="Assistir clipe"
              title="Assistir clipe / Mais opções"
              className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-95 transition-all text-white/90"
            >
              <MoreVertical className="w-5 h-5 text-white/80" />
            </button>
          </header>

          {/* ─── MAIN CONTENT ─── */}
          <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 min-h-0 py-2">
            {/* Capa do Álbum com Proporção 1:1 e Efeito Glow */}
            <div className="w-full flex-1 min-h-0 flex flex-col justify-center items-center relative max-h-[380px]">
              <motion.div
                key={currentTrack.id}
                animate={{ scale: isPlaying ? 1 : 0.92 }}
                transition={{ type: 'spring', stiffness: 200, damping: 24 }}
                onClick={() => setVideoVisible(true)}
                className="relative w-full max-w-[320px] aspect-square rounded-2xl overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.65)] bg-surface-container-high transition-transform duration-500 ease-out hover:scale-[1.02] cursor-pointer group"
              >
                <img
                  src={currentTrack.cover || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=800&q=80'}
                  alt={currentTrack.title}
                  className={cn("w-full h-full object-cover transition-all duration-300", isLoading && "opacity-40 blur-sm")}
                />

                {isLoading ? (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-[#3FFF8B] animate-spin mb-2" />
                    <p className="text-xs font-bold text-white tracking-wide">CARREGANDO ÁUDIO...</p>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Video className="w-10 h-10 text-white drop-shadow-md" />
                    <p className="text-[10px] font-bold mt-1.5 tracking-widest uppercase text-white">Assistir Clipe</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
              </motion.div>
            </div>
          </main>

          {/* ─── FOOTER CONTROLS ─── */}
          <footer 
            className="relative z-10 shrink-0 px-6 pt-2 pb-6 space-y-4 max-w-xl mx-auto w-full"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
          >
            {/* Informações da Faixa + Ações */}
            <div className="flex items-center justify-between gap-3 px-1">
              <div className="flex-1 min-w-0 pr-2">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white truncate tracking-tight leading-tight">
                  {currentTrack.title}
                </h2>
                <p className="text-sm sm:text-base font-medium text-[#A8A8A8] truncate mt-0.5">
                  {currentTrack.artist || 'FéConecta Music'}
                </p>
              </div>

              {/* Ações em Linha */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Botão Curtir */}
                <button
                  onClick={() => toggleLike(currentTrack)}
                  aria-label="Curtir música"
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 transition-all text-white/90"
                >
                  <Heart className={cn("w-6 h-6 transition-colors", isLiked ? "text-[#0095F6] fill-[#0095F6]" : "text-white/80")} />
                </button>

                {/* Botão Adicionar à Playlist */}
                <button
                  onClick={() => setIsAddToPlaylistOpen(true)}
                  aria-label="Adicionar à playlist"
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 transition-all text-white/80 hover:text-white"
                >
                  <ListMusic className="w-6 h-6" />
                </button>

                {/* Botão Comentários */}
                <button
                  onClick={() => setIsCommentsOpen(true)}
                  aria-label="Ver comentários"
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 transition-all text-white/80 hover:text-white relative"
                >
                  <MessageCircle className="w-5 h-5" />
                  {commentsCount > 0 && (
                    <span className="absolute top-1 right-0.5 min-w-[16px] h-4 px-1 bg-[#3FFF8B] text-black text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                      {commentsCount > 99 ? '99+' : commentsCount}
                    </span>
                  )}
                </button>

                {/* Botão Compartilhar */}
                <button
                  onClick={() => setIsShareOpen(true)}
                  aria-label="Compartilhar música"
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 active:scale-90 transition-all text-white/80 hover:text-white"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Barra de Progresso com Neon Glow e Scrubbing */}
            <div className="px-1 group">
              <div
                ref={timelineRef}
                className="relative w-full h-3 flex items-center cursor-pointer select-none touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <div className="w-full h-1 group-hover:h-2 bg-[#353535] rounded-full overflow-hidden transition-all duration-200">
                  <div
                    className="h-full bg-[#3FFF8B] rounded-full shadow-[0_0_10px_#3FFF8B]"
                    style={{ width: `${currentPct}%` }}
                  />
                </div>
                <div
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full pointer-events-none transition-all duration-100",
                    isDragging ? "w-4 h-4 bg-white shadow-[0_0_12px_#3FFF8B]" : "w-3 h-3 bg-white group-hover:scale-125 opacity-0 group-hover:opacity-100"
                  )}
                  style={{ left: `${currentPct}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-[#A8A8A8] font-mono mt-0.5">
                <span>{fmt(displayedProgress)}</span>
                <span>{fmt(effectiveDuration)}</span>
              </div>
            </div>

            {/* Controles de Reprodução (Playback Controls) */}
            <div className="flex items-center justify-between px-2 pt-1 h-20">
              {/* Shuffle (Aleatório) */}
              <button
                onClick={toggleShuffle}
                aria-label="Modo aleatório"
                className={cn(
                  "w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-90",
                  isShuffled ? "text-[#3FFF8B]" : "text-[#A8A8A8] hover:text-white"
                )}
              >
                <Shuffle className="w-5 h-5" />
              </button>

              {/* Previous */}
              <button
                onClick={() => previous(true)}
                aria-label="Faixa anterior"
                className="w-13 h-13 flex items-center justify-center text-white hover:text-[#3FFF8B] active:scale-90 transition-all"
              >
                <SkipBack className="w-8 h-8" fill="currentColor" />
              </button>

              {/* Play / Pause Principal (Gigante com Glow) */}
              <button
                onClick={() => {
                  if (isLoading) return;
                  isPlaying ? pause() : resume();
                }}
                aria-label={isPlaying ? "Pausar" : "Tocar"}
                className={cn(
                  "w-[70px] h-[70px] rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_24px_rgba(255,255,255,0.3)] shrink-0",
                  isLoading && "opacity-60 cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-7 h-7 text-black animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-8 h-8" fill="currentColor" />
                ) : (
                  <Play className="w-8 h-8 ml-1" fill="currentColor" />
                )}
              </button>

              {/* Next */}
              <button
                onClick={() => next(true)}
                aria-label="Próxima faixa"
                className="w-13 h-13 flex items-center justify-center text-white hover:text-[#3FFF8B] active:scale-90 transition-all"
              >
                <SkipForward className="w-8 h-8" fill="currentColor" />
              </button>

              {/* Repeat */}
              <button
                onClick={cycleRepeat}
                aria-label="Repetir faixa"
                className={cn(
                  "w-11 h-11 flex items-center justify-center rounded-full transition-all active:scale-90 relative",
                  repeatMode !== 'off' ? "text-[#3FFF8B]" : "text-[#A8A8A8] hover:text-white"
                )}
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-5 h-5" />
                ) : (
                  <Repeat className="w-5 h-5" />
                )}
              </button>
            </div>
          </footer>

          {/* Modais Integrados */}
          <MusicComposerModal
            isOpen={isComposerOpen}
            onClose={() => setIsComposerOpen(false)}
            onSuccess={() => { setIsComposerOpen(false); }}
            initialUrl={ytId ? `https://www.youtube.com/watch?v=${ytId}` : ''}
          />
          <TrackCommentsModal
            isOpen={isCommentsOpen}
            onClose={() => setIsCommentsOpen(false)}
            trackId={ytId || ''}
            trackTitle={currentTrack.title}
          />
          <MusicShareModal
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            trackTitle={currentTrack.title}
            trackArtist={currentTrack.artist || ''}
            trackCover={currentTrack.cover ?? undefined}
            youtubeId={ytId || ''}
          />
          <AddToPlaylistModal
            isOpen={isAddToPlaylistOpen}
            onClose={() => setIsAddToPlaylistOpen(false)}
            track={currentTrack}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
