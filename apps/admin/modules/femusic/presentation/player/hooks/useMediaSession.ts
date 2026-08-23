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
    if (typeof navigator === 'undefined') return;
    if (handlersRegistered.current) return;
    handlersRegistered.current = true;

    const platform = Capacitor.getPlatform();

    if (platform !== 'web') {
      try {
        MediaSession.setActionHandler({ action: 'play' }, () => {
          usePlayerStore.getState().resume();
        });
        MediaSession.setActionHandler({ action: 'pause' }, () => {
          usePlayerStore.getState().pause();
        });
        MediaSession.setActionHandler({ action: 'previoustrack' }, () => {
          usePlayerStore.getState().previous(true);
        });
        MediaSession.setActionHandler({ action: 'nexttrack' }, () => {
          usePlayerStore.getState().next(true);
        });
        MediaSession.setActionHandler({ action: 'seekto' }, (details) => {
          if (details && details.seekTime != null) {
            usePlayerStore.getState().seek(details.seekTime * 1000);
          }
        });
      } catch (err) {
        console.warn('[MediaSession] Erro ao registrar handlers Capacitor:', err);
      }
    } else if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('play', () => usePlayerStore.getState().resume());
        navigator.mediaSession.setActionHandler('pause', () => usePlayerStore.getState().pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().previous(true));
        navigator.mediaSession.setActionHandler('nexttrack', () => usePlayerStore.getState().next(true));
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime != null) usePlayerStore.getState().seek(details.seekTime * 1000);
        });
      } catch (err) {
        console.warn('[MediaSession] Erro ao registrar handlers Web:', err);
      }
    }
  }, []);

  // 2 & 3. Metadata e Playback State combinados para evitar Race Condition no Android!
  // CRÍTICO: No Android (Capacitor), setMetadata DEVE terminar ANTES de setPlaybackState('playing').
  useEffect(() => {
    if (!currentTrack || typeof navigator === 'undefined') return;

    const setupSession = async () => {
      const coverUrl =
        currentTrack.cover ||
        'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&w=512&q=80';
      
      const playbackState = isPlaying ? 'playing' : 'paused';

      if (Capacitor.getPlatform() !== 'web') {
        try {
          await MediaSession.setMetadata({
            title: currentTrack.title || 'Música',
            artist: currentTrack.artist || 'FéConecta',
            album: currentTrack.album || '',
            artwork: [
              { src: coverUrl, sizes: '96x96', type: 'image/jpeg' },
              { src: coverUrl, sizes: '256x256', type: 'image/jpeg' },
              { src: coverUrl, sizes: '512x512', type: 'image/jpeg' },
            ],
          });
          
          await MediaSession.setPlaybackState({ playbackState });
        } catch (err) {
          console.warn('[MediaSession] Erro no Android setup:', err);
        }
      } else if ('mediaSession' in navigator) {
        try {
          // Fallback para Web PWA (Chrome/Safari)
          navigator.mediaSession.metadata = new MediaMetadata({
            title: currentTrack.title || 'Música',
            artist: currentTrack.artist || 'FéConecta',
            album: currentTrack.album || '',
            artwork: [
              { src: coverUrl, sizes: '96x96', type: 'image/jpeg' },
              { src: coverUrl, sizes: '256x256', type: 'image/jpeg' },
              { src: coverUrl, sizes: '512x512', type: 'image/jpeg' },
            ],
          });
          navigator.mediaSession.playbackState = playbackState;
        } catch (err) {
          console.warn('[MediaSession] Erro no Web setup:', err);
        }
      }
    };

    setupSession();
  }, [
    currentTrack?.id,
    currentTrack?.title,
    currentTrack?.artist,
    currentTrack?.cover,
    isPlaying
  ]);

  // 4. Position state (barra de progresso)
  useEffect(() => {
    if (!currentTrack || !durationMs || durationMs <= 0 || typeof navigator === 'undefined') return;

    const positionSec = Math.min(Math.max(progressMs / 1000, 0), durationMs / 1000);
    const durationSec = durationMs / 1000;

    if (Capacitor.getPlatform() !== 'web') {
      MediaSession.setPositionState({
        duration: durationSec,
        playbackRate: 1,
        position: positionSec,
      }).catch(err => console.warn('[MediaSession] Erro posição Android:', err));
    } else if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
      try {
        navigator.mediaSession.setPositionState({
          duration: durationSec,
          playbackRate: 1,
          position: positionSec,
        });
      } catch (err) {
        console.warn('[MediaSession] Erro posição Web:', err);
      }
    }
  }, [progressMs, durationMs, currentTrack?.id]);
}
