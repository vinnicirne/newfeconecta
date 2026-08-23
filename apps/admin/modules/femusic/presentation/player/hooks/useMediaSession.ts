import { useEffect } from 'react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { MediaSession } from '@jofr/capacitor-media-session';
import { Capacitor } from '@capacitor/core';

// CRÍTICO: urlToBitmap() no Java faz HTTP request para cada entrada do artwork.
// Se qualquer download falhar (WebP, CORS, rede lenta), o setMetadata() inteiro lança
// IOException e call.resolve() nunca é chamado — a notificação nunca aparece.
// Solução: uma única URL JPEG estável garantida.
const FALLBACK_ARTWORK = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/320px-Camponotus_flavomarginatus_ant.jpg';

const isNative = Capacitor.getPlatform() !== 'web';

function getSafeArtworkUrl(cover?: string | null): string {
  // Só aceita URL HTTPS. Descarta WebP, blobs e data URIs.
  if (
    cover &&
    cover.startsWith('https://') &&
    !cover.includes('.webp') &&
    !cover.startsWith('blob:') &&
    !cover.startsWith('data:')
  ) {
    // Força conversão para JPEG em URLs do Unsplash e similares
    if (cover.includes('unsplash.com')) {
      return cover.replace(/&fm=\w+/, '').replace(/\?fm=\w+/, '?') + '&fm=jpg&q=80&w=512';
    }
    return cover;
  }
  return FALLBACK_ARTWORK;
}

export function useMediaSession() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progressMs = usePlayerStore((s) => s.progressMs);
  const durationMs = usePlayerStore((s) => s.durationMs);

  // ─── 1. Handlers ─────────────────────────────────────────────────────────
  // Re-registra em todo mount. CALLBACK_ID_DANGLING invalida handlers após
  // qualquer reload da WebView (Live Reload, navegação, etc).
  useEffect(() => {
    if (!isNative && typeof navigator === 'undefined') return;
    if (!isNative && !('mediaSession' in navigator)) return;

    const register = async () => {
      try {
        if (isNative) {
          await MediaSession.setActionHandler({ action: 'play' }, () => {
            usePlayerStore.getState().resume();
          });
          await MediaSession.setActionHandler({ action: 'pause' }, () => {
            usePlayerStore.getState().pause();
          });
          await MediaSession.setActionHandler({ action: 'previoustrack' }, () => {
            usePlayerStore.getState().previous(true);
          });
          await MediaSession.setActionHandler({ action: 'nexttrack' }, () => {
            usePlayerStore.getState().next(true);
          });
          await MediaSession.setActionHandler({ action: 'seekto' }, (details) => {
            if (details?.seekTime != null) {
              usePlayerStore.getState().seek(details.seekTime * 1000);
            }
          });
          await MediaSession.setActionHandler({ action: 'seekforward' }, () => {
            const s = usePlayerStore.getState();
            s.seek(s.progressMs + 10000);
          });
          await MediaSession.setActionHandler({ action: 'seekbackward' }, () => {
            const s = usePlayerStore.getState();
            s.seek(Math.max(0, s.progressMs - 10000));
          });
          console.log('[MediaSession] ✅ Handlers registrados (native)');
        } else {
          navigator.mediaSession.setActionHandler('play', () => usePlayerStore.getState().resume());
          navigator.mediaSession.setActionHandler('pause', () => usePlayerStore.getState().pause());
          navigator.mediaSession.setActionHandler('previoustrack', () => usePlayerStore.getState().previous(true));
          navigator.mediaSession.setActionHandler('nexttrack', () => usePlayerStore.getState().next(true));
          navigator.mediaSession.setActionHandler('seekto', (d) => {
            if (d.seekTime != null) usePlayerStore.getState().seek(d.seekTime * 1000);
          });
          navigator.mediaSession.setActionHandler('seekforward', () => {
            const s = usePlayerStore.getState(); s.seek(s.progressMs + 10000);
          });
          navigator.mediaSession.setActionHandler('seekbackward', () => {
            const s = usePlayerStore.getState(); s.seek(Math.max(0, s.progressMs - 10000));
          });
          console.log('[MediaSession] ✅ Handlers registrados (web)');
        }
      } catch (e) {
        console.warn('[MediaSession] ❌ Handlers failed:', e);
      }
    };

    register();
  }, []);

  // ─── 2. Metadata + PlaybackState ─────────────────────────────────────────
  // ORDEM CRÍTICA: setMetadata → delay → setPlaybackState
  // Uma única URL JPEG no artwork (múltiplas causam IOException se qualquer uma falhar)
  useEffect(() => {
    if (!currentTrack) return;

    const run = async () => {
      // URL única, JPEG garantido — evita IOException no urlToBitmap() Java
      const cover = getSafeArtworkUrl(currentTrack.cover);
      const playbackState = isPlaying ? 'playing' : 'paused';

      console.log('[MediaSession] Setup →', playbackState, '| track:', currentTrack.title, '| cover:', cover);

      try {
        if (isNative) {
          // 1º: metadata com UMA artwork (Java itera o array e faz download de cada)
          await MediaSession.setMetadata({
            title: currentTrack.title || 'Música',
            artist: currentTrack.artist || 'FéConecta',
            album: currentTrack.album || '',
            artwork: [
              { src: cover, sizes: '512x512', type: 'image/jpeg' },
            ],
          });

          // 2º: delay — Java precisa terminar o download da imagem antes
          await new Promise((r) => setTimeout(r, 200));

          // 3º: playback state
          await MediaSession.setPlaybackState({ playbackState });
          console.log('[MediaSession] ✅ Metadata + state →', playbackState);
        } else if ('mediaSession' in navigator) {
          navigator.mediaSession.metadata = new MediaMetadata({
            title: currentTrack.title || 'Música',
            artist: currentTrack.artist || 'FéConecta',
            album: currentTrack.album || '',
            artwork: [{ src: cover, sizes: '512x512', type: 'image/jpeg' }],
          });
          navigator.mediaSession.playbackState = playbackState;
        }
      } catch (e) {
        console.warn('[MediaSession] ❌ Setup failed:', e);
      }
    };

    run();
  }, [
    currentTrack?.id,
    currentTrack?.title,
    currentTrack?.artist,
    currentTrack?.cover,
    isPlaying,
  ]);

  // ─── 3. Force playing (segurança extra para alguns devices) ──────────────
  useEffect(() => {
    if (!isNative || !isPlaying || !currentTrack) return;

    const t = setTimeout(async () => {
      try {
        await MediaSession.setPlaybackState({ playbackState: 'playing' });
        console.log('[MediaSession] ✅ Force playing OK');
      } catch (e) {
        console.warn('[MediaSession] ❌ Force playing failed:', e);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [isPlaying, currentTrack?.id]);

  // ─── 4. Position state ───────────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack || !durationMs || durationMs <= 0) return;

    const position = Math.min(Math.max(progressMs / 1000, 0), durationMs / 1000);
    const duration = durationMs / 1000;

    // Valores inválidos derrubam a notificação no Android
    if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return;

    if (isNative) {
      MediaSession.setPositionState({ duration, playbackRate: 1, position })
        .catch((e) => console.warn('[MediaSession] position error:', e));
    } else if (typeof navigator !== 'undefined' && navigator.mediaSession?.setPositionState) {
      try {
        navigator.mediaSession.setPositionState({ duration, playbackRate: 1, position });
      } catch (e) {
        console.warn('[MediaSession] position web error:', e);
      }
    }
  }, [progressMs, durationMs, currentTrack?.id]);

  // ─── 5. Cleanup quando sem track ─────────────────────────────────────────
  useEffect(() => {
    if (currentTrack || !isNative) return;
    MediaSession.setPlaybackState({ playbackState: 'none' }).catch(() => {});
  }, [currentTrack]);
}
