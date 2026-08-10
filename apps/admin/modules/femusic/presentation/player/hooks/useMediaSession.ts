import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { MediaSession } from '@jofr/capacitor-media-session';
import { Capacitor } from '@capacitor/core';

export function useMediaSession() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progressMs = usePlayerStore((s) => s.progressMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const handlersRegistered = useRef(false);

  // 1. Registrar handlers UMA vez
  useEffect(() => {
    const platform = Capacitor.getPlatform();
    if (typeof navigator === 'undefined' || platform === 'web') return;
    if (handlersRegistered.current) return;
    handlersRegistered.current = true;

    try {
      MediaSession.setActionHandler({ action: 'play' }, () => {
        console.log('[MediaSession] PLAY');
        usePlayerStore.getState().resume();
      });

      MediaSession.setActionHandler({ action: 'pause' }, () => {
        console.log('[MediaSession] PAUSE');
        usePlayerStore.getState().pause();
      });

      MediaSession.setActionHandler({ action: 'previoustrack' }, () => {
        console.log('[MediaSession] PREVIOUS');
        usePlayerStore.getState().previous(true);
      });

      MediaSession.setActionHandler({ action: 'nexttrack' }, () => {
        console.log('[MediaSession] NEXT');
        usePlayerStore.getState().next(true);
      });

      MediaSession.setActionHandler({ action: 'seekto' }, (details) => {
        if (details && details.seekTime != null) {
          usePlayerStore.getState().seek(details.seekTime * 1000);
        }
      });

      console.log('[MediaSession] Handlers registrados via @jofr/capacitor-media-session (Capacitor 6)');
    } catch (err) {
      console.warn('[MediaSession] Erro ao registrar handlers:', err);
    }
  }, []);

  // 2. Metadata
  useEffect(() => {
    if (!currentTrack || typeof navigator === 'undefined' || Capacitor.getPlatform() === 'web') return;

    const coverUrl =
      currentTrack.cover ||
      'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=512&q=80';

    try {
      MediaSession.setMetadata({
        title: currentTrack.title || 'Música',
        artist: currentTrack.artist || 'FéConecta',
        album: currentTrack.album || '',
        artwork: [
          { src: coverUrl, sizes: '96x96', type: 'image/jpeg' },
          { src: coverUrl, sizes: '256x256', type: 'image/jpeg' },
          { src: coverUrl, sizes: '512x512', type: 'image/jpeg' },
        ],
      });
    } catch (err) {
      console.warn('[MediaSession] Erro no metadata:', err);
    }
  }, [
    currentTrack?.id,
    currentTrack?.title,
    currentTrack?.artist,
    currentTrack?.cover,
  ]);

  // 3. Playback State (CRÍTICO para exibir a notificação)
  useEffect(() => {
    if (typeof navigator === 'undefined' || Capacitor.getPlatform() === 'web') return;
    try {
      const playbackState = isPlaying ? 'playing' : 'paused';
      MediaSession.setPlaybackState({ playbackState });
    } catch (err) {
      console.warn('[MediaSession] Erro no playback state:', err);
    }
  }, [isPlaying]);

  // 4. Position state (barra de progresso)
  useEffect(() => {
    if (
      !currentTrack ||
      !durationMs ||
      durationMs <= 0 ||
      typeof navigator === 'undefined' ||
      Capacitor.getPlatform() === 'web'
    ) {
      return;
    }

    try {
      MediaSession.setPositionState({
        duration: durationMs / 1000,
        playbackRate: 1,
        position: Math.min(Math.max(progressMs / 1000, 0), durationMs / 1000),
      });
    } catch (err) {
      console.warn('[MediaSession] Erro ao definir posição:', err);
    }
  }, [progressMs, durationMs, currentTrack?.id]);
}
