'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, Play, Pause, SkipBack, SkipForward,
  ThumbsUp, ThumbsDown, MessageCircle, Share2,
  Shuffle, Repeat, Repeat1, Music2, Video,
  MoreVertical, ListMusic, Loader2,
} from 'lucide-react';
import MusicShareModal from './MusicShareModal';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { cn } from '@/lib/utils';
import MusicComposerModal from '@/components/feed/MusicComposerModal';
import TrackCommentsModal from './TrackCommentsModal';
import AddToPlaylistModal from './AddToPlaylistModal';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

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
  const [disliked, setDisliked] = React.useState(false);

  // Estados e Refs para arrasto / scrubbing contínuo da barra de progresso
  const timelineRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragProgressMs, setDragProgressMs] = React.useState<number | null>(null);

  React.useEffect(() => { loadLikes(); }, [loadLikes]);

  const effectiveDuration = durationMs > 0 ? durationMs : (currentTrack?.duration && currentTrack.duration > 0 ? currentTrack.duration : 0);

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
  // sem redirecionar para a página anterior (Feed)
  React.useEffect(() => {
    if (isFullScreen) {
      const isNative = typeof window !== 'undefined' && Capacitor.getPlatform() !== 'web';

      if (isNative) {
        // No Android nativo, pushState "reseta" a Webview e faz o Media Session sumir/quebrar.
        // Então usamos o evento nativo do Capacitor:
        let backListener: any;
        CapApp.addListener('backButton', (info) => {
          setFullScreen(false);
        }).then(listener => {
          backListener = listener;
        });

        return () => {
          if (backListener) backListener.remove();
        };
      } else {
        // Na Web (PWA), usamos pushState
        window.history.pushState({ playerOpen: true }, '', window.location.href);
        
        const handlePopState = (e: PopStateEvent) => {
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
  const ytId = currentTrack.providerTrackId || currentTrack.id;


  return (
    <AnimatePresence>
      {isFullScreen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className="fixed inset-0 z-[9999] text-white"
          style={{ height: '100dvh' }}
        >
          {/* Background — sólido primeiro, blur por cima */}
          <div className="absolute inset-0 bg-[#0d0d0d]" />
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: `url(${currentTrack.cover || ''})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(60px)',
              transform: 'scale(1.3)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60 pointer-events-none" />

          {/* Content — flex column full height */}
          <div className="relative z-10 flex flex-col h-full">

            {/* ─── HEADER ─── */}
            <div className="flex items-center justify-between px-5 pt-10 pb-3 shrink-0">
              <button
                onClick={() => setFullScreen(false)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
              <div className="text-center flex-1 px-2">
                <p className="text-[9px] tracking-[0.2em] uppercase text-gray-500 font-bold">Tocando agora</p>
                <p className="text-xs font-semibold text-gray-300 truncate max-w-[180px] mx-auto">
                  {currentTrack.artist || 'FéConecta'}
                </p>
              </div>
              <button
                onClick={() => setVideoVisible(true)}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* ─── CAPA (flex-1 para ocupar o espaço disponível) ─── */}
            <div className="flex-1 flex items-center justify-center px-8 min-h-0">
              <motion.div
                key={currentTrack.id}
                animate={{ scale: isPlaying ? 1 : 0.88 }}
                transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                onClick={() => setVideoVisible(true)}
                className="relative cursor-pointer group rounded-2xl overflow-hidden shadow-2xl bg-gray-800"
                style={{ width: '100%', maxWidth: '320px', aspectRatio: '1/1' }}
              >
                <img
                  src={currentTrack.cover || 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=800&q=80'}
                  alt={currentTrack.title}
                  className={cn("w-full h-full object-cover transition-all", isLoading && "opacity-50 blur-sm")}
                />
                
                {isLoading ? (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                    <Loader2 className="w-10 h-10 text-whatsapp-green animate-spin mb-3 shadow-xl" />
                    <p className="text-[11px] font-bold text-white text-center tracking-wide">BAIXANDO ÁUDIO...</p>
                    <p className="text-[9px] text-gray-300 text-center mt-1 uppercase tracking-widest">Só na primeira vez</p>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Video className="w-10 h-10 text-white" />
                    <p className="text-[10px] font-bold mt-1.5 tracking-widest uppercase">Assistir Clipe</p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* ─── ÁREA INFERIOR (tudo shrink-0) ─── */}
            <div className="shrink-0 px-6 pt-4"
              style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
            >
              {/* Título + Like/Dislike */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1 min-w-0 pr-3">
                  <h2 className="text-[18px] font-black truncate leading-tight">{currentTrack.title}</h2>
                  <p className="text-sm text-gray-400 truncate mt-0.5">{currentTrack.artist}</p>
                </div>
                <div className="flex items-center rounded-full border border-white/15 overflow-hidden shrink-0">
                  <button
                    onClick={() => { toggleLike(currentTrack); if (disliked) setDisliked(false); }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-2 border-r border-white/15 transition-colors text-xs font-semibold',
                      isLiked ? 'text-white' : 'text-gray-400 hover:text-white'
                    )}
                  >
                    <ThumbsUp className={cn('w-4 h-4', isLiked && 'fill-white')} />
                    Curtir
                  </button>
                  <button
                    onClick={() => { setDisliked(d => !d); if (isLiked) toggleLike(currentTrack); }}
                    className={cn('px-3 py-2 transition-colors', disliked ? 'text-white' : 'text-gray-400 hover:text-white')}
                  >
                    <ThumbsDown className={cn('w-4 h-4', disliked && 'fill-white')} />
                  </button>
                </div>
              </div>

              {/* Action Pills */}
              <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setLyricsOpen(l => !l)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all shrink-0',
                    lyricsOpen ? 'bg-white text-black border-white' : 'bg-white/10 text-gray-300 border-white/10'
                  )}
                >
                  <Music2 className="w-3.5 h-3.5" />Letra
                </button>
                <button
                  onClick={() => setIsCommentsOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-gray-300 border border-white/10 shrink-0"
                >
                  <MessageCircle className="w-3.5 h-3.5" />Comentar
                </button>
                <button
                  onClick={() => setIsAddToPlaylistOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-gray-300 border border-white/10 shrink-0 hover:bg-white/20 transition-colors"
                >
                  <ListMusic className="w-3.5 h-3.5 text-whatsapp-teal" />Playlist
                </button>
                <button
                  onClick={() => setIsShareOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/10 text-gray-300 border border-white/10 shrink-0"
                >
                  <Share2 className="w-3.5 h-3.5" />Comp.
                </button>
              </div>

              {/* Lyrics placeholder */}
              <AnimatePresence>
                {lyricsOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-3"
                  >
                    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
                      <p className="text-xs text-gray-400">Letra não disponível</p>
                      <a
                        href={`https://www.youtube.com/watch?v=${ytId}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[11px] text-blue-400 hover:underline"
                      >Ver no YouTube ↗</a>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progress Bar com suporte a toque e arrasto (Scrubbing / Drag) */}
              <div 
                ref={timelineRef}
                className="relative mb-1 py-4 cursor-pointer select-none touch-none group"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <div className="w-full h-1.5 group-hover:h-2.5 bg-white/20 rounded-full relative overflow-hidden transition-all duration-150">
                  <div 
                    className="h-full bg-whatsapp-teal rounded-full" 
                    style={{ width: `${currentPct}%` }} 
                  />
                </div>
                <div
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full shadow-lg pointer-events-none ring-2 ring-whatsapp-teal/40 transition-transform duration-100",
                    isDragging ? "w-5 h-5 bg-whatsapp-teal scale-110" : "w-3.5 h-3.5 bg-white group-hover:scale-125"
                  )}
                  style={{ left: `${currentPct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-400 font-mono mb-4">
                <span>{fmt(isDragging && dragProgressMs !== null ? dragProgressMs : progressMs)}</span>
                <span>{fmt(effectiveDuration)}</span>
              </div>


              {/* Controls */}
              <div className="flex items-center justify-between px-2">
                {/* Shuffle */}
                <button
                  onClick={toggleShuffle}
                  className={cn(
                    'w-10 h-10 flex items-center justify-center rounded-full transition-all',
                    isShuffled ? 'text-green-400' : 'text-gray-500 hover:text-white'
                  )}
                >
                  <Shuffle className="w-[18px] h-[18px]" />
                </button>

                {/* Previous */}
                <button
                  onClick={() => previous(true)}
                  className="w-12 h-12 flex items-center justify-center text-white active:scale-90 transition-transform"
                >
                  <SkipBack className="w-7 h-7" fill="currentColor" />
                </button>

                {/* Play/Pause */}
                <button
                  onClick={() => {
                    if (isLoading) return;
                    isPlaying ? pause() : resume();
                  }}
                  className={cn(
                    "w-[58px] h-[58px] flex items-center justify-center rounded-full shadow-xl transition-all",
                    isLoading ? "bg-gray-700 text-gray-400 cursor-not-allowed opacity-50" : "bg-white text-black hover:scale-105 active:scale-95"
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-6 h-6" fill="currentColor" />
                  ) : (
                    <Play className="w-6 h-6 ml-0.5" fill="currentColor" />
                  )}
                </button>

                {/* Next */}
                <button
                  onClick={() => next(true)}
                  className="w-12 h-12 flex items-center justify-center text-white active:scale-90 transition-transform"
                >
                  <SkipForward className="w-7 h-7" fill="currentColor" />
                </button>

                {/* Repeat */}
                <button
                  onClick={cycleRepeat}
                  className={cn(
                    'w-10 h-10 flex items-center justify-center rounded-full transition-all relative',
                    repeatMode !== 'off' ? 'text-green-400' : 'text-gray-500 hover:text-white'
                  )}
                >
                  {repeatMode === 'one' ? (
                    <Repeat1 className="w-[18px] h-[18px]" />
                  ) : (
                    <Repeat className="w-[18px] h-[18px]" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Modais */}
          <MusicComposerModal
            isOpen={isComposerOpen}
            onClose={() => setIsComposerOpen(false)}
            onSuccess={() => { setIsComposerOpen(false); }}
            initialUrl={`https://www.youtube.com/watch?v=${ytId}`}
          />
          <TrackCommentsModal
            isOpen={isCommentsOpen}
            onClose={() => setIsCommentsOpen(false)}
            trackId={ytId}
            trackTitle={currentTrack.title}
          />
          <MusicShareModal
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            trackTitle={currentTrack.title}
            trackArtist={currentTrack.artist || ''}
            trackCover={currentTrack.cover ?? undefined}
            youtubeId={ytId}
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
