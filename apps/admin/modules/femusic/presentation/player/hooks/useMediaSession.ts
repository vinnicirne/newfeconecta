import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { MediaSession } from '@jofr/capacitor-media-session';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';

const isNative = Capacitor.getPlatform() !== 'web';

// URL de fallback estável, HTTPS, JPEG garantido
const FALLBACK_ARTWORK =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/320px-Camponotus_flavomarginatus_ant.jpg';

function getSafeArtworkUrl(cover?: string | null): string {
  if (
    cover &&
    /^https:\/\//i.test(cover) &&
    !cover.startsWith('blob:') &&
    !cover.startsWith('data:') &&
    !cover.toLowerCase().includes('.webp')
  ) {
    return cover;
  }
  return FALLBACK_ARTWORK;
}

export function useMediaSession() {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progressMs = usePlayerStore((s) => s.progressMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const lastPositionAt = useRef(0);

  // ══════════════════════════════════════════════════════════════════
  // 1. HANDLERS — cada um tem seu próprio try/catch
  //    Se seekto falhar, play/pause/next/prev ainda registram.
  //    Re-registra em cada mount (CALLBACK_ID_DANGLING após WebView reload).
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!isNative) return;

    const handlers: Array<{ action: Parameters<typeof MediaSession.setActionHandler>[0]['action']; fn: () => void }> = [
      { action: 'play',          fn: () => { console.log('[MS] ▶ PLAY');     usePlayerStore.getState().resume(); } },
      { action: 'pause',         fn: () => { console.log('[MS] ⏸ PAUSE');    usePlayerStore.getState().pause(); } },
      { action: 'previoustrack', fn: () => { console.log('[MS] ⏮ PREV');    usePlayerStore.getState().previous(true); } },
      { action: 'nexttrack',     fn: () => { console.log('[MS] ⏭ NEXT');    usePlayerStore.getState().next(true); } },
      { action: 'seekforward',   fn: () => { const s = usePlayerStore.getState(); s.seek(s.progressMs + 10000); } },
      { action: 'seekbackward',  fn: () => { const s = usePlayerStore.getState(); s.seek(Math.max(0, s.progressMs - 10000)); } },
    ];

    // seekto tem assinatura diferente, registra separado
    const registerAll = async () => {
      for (const { action, fn } of handlers) {
        try {
          await MediaSession.setActionHandler({ action }, fn);
          console.log(`[MS] Handler OK: ${action}`);
        } catch (e) {
          console.error(`[MS] Handler ERRO: ${action}`, e);
        }
      }
      try {
        await MediaSession.setActionHandler({ action: 'seekto' }, (details: any) => {
          if (details?.seekTime != null) usePlayerStore.getState().seek(details.seekTime * 1000);
        });
        console.log('[MS] Handler OK: seekto');
      } catch (e) {
        console.error('[MS] Handler ERRO: seekto', e);
      }
      console.log('[MS] ✅ Handlers completos');
    };

    registerAll();
  }, []); // sem deps = re-registra em cada mount

  // ══════════════════════════════════════════════════════════════════
  // 2. METADATA — independente do playback state
  //    Falha no artwork NÃO bloqueia o efeito 3 (playback state).
  //    Uma única URL JPEG (Java faz download de cada entrada do array).
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!isNative || !currentTrack) return;

    const cover = getSafeArtworkUrl(currentTrack.cover);
    console.log('[MS] Metadata →', currentTrack.title, '| cover:', cover);

    MediaSession.setMetadata({
      title: currentTrack.title || 'Música',
      artist: currentTrack.artist || 'FéConecta',
      album: currentTrack.album || '',
      artwork: [{ src: cover, sizes: '512x512', type: 'image/jpeg' }],
    })
      .then(() => console.log('[MS] ✅ Metadata OK'))
      .catch((e) => console.error('[MS] ❌ Metadata ERRO:', e));
      // IMPORTANTE: falha aqui NÃO impede o efeito de playback state abaixo
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, currentTrack?.album, currentTrack?.cover]);

  // ══════════════════════════════════════════════════════════════════
  // 3. PLAYBACK STATE — independente do metadata
  //    Roda sempre que isPlaying ou track muda, mesmo que metadata falhou.
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!isNative || !currentTrack) return;

    const playbackState = isPlaying ? 'playing' : 'paused';
    console.log('[MS] PlaybackState →', playbackState);

    MediaSession.setPlaybackState({ playbackState })
      .then(() => console.log('[MS] ✅ PlaybackState OK:', playbackState))
      .catch((e) => console.error('[MS] ❌ PlaybackState ERRO:', e));
  }, [isPlaying, currentTrack?.id]);

  // ══════════════════════════════════════════════════════════════════
  // 4. POSITION STATE — throttled a 1s para evitar NPE no service Java
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!isNative || !currentTrack || !durationMs || durationMs <= 0) return;

    const now = Date.now();
    if (isPlaying && now - lastPositionAt.current < 1000) return;
    lastPositionAt.current = now;

    const duration = durationMs / 1000;
    const position = Math.min(Math.max(progressMs / 1000, 0), duration);
    if (!Number.isFinite(position) || !Number.isFinite(duration)) return;

    MediaSession.setPositionState({ duration, playbackRate: 1, position })
      .catch((e) => console.warn('[MS] Position ERRO:', e));
  }, [progressMs, durationMs, isPlaying, currentTrack?.id]);

  // ══════════════════════════════════════════════════════════════════
  // Web fallback (PWA / Chrome desktop)
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (isNative || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!currentTrack) return;

    try {
      const cover = getSafeArtworkUrl(currentTrack.cover);
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || 'Música',
        artist: currentTrack.artist || 'FéConecta',
        album: currentTrack.album || '',
        artwork: [{ src: cover, sizes: '512x512', type: 'image/jpeg' }],
      });
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (e) {
      console.warn('[MS] Web metadata ERRO:', e);
    }
  }, [currentTrack?.id, currentTrack?.title, currentTrack?.artist, currentTrack?.cover, isPlaying]);

  useEffect(() => {
    if (isNative || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    const handlers: any = {
      play: () => usePlayerStore.getState().resume(),
      pause: () => usePlayerStore.getState().pause(),
      previoustrack: () => usePlayerStore.getState().previous(true),
      nexttrack: () => usePlayerStore.getState().next(true),
      seekforward: () => { const s = usePlayerStore.getState(); s.seek(s.progressMs + 10000); },
      seekbackward: () => { const s = usePlayerStore.getState(); s.seek(Math.max(0, s.progressMs - 10000)); },
      seekto: (d: any) => { if (d?.seekTime != null) usePlayerStore.getState().seek(d.seekTime * 1000); },
    };
    Object.entries(handlers).forEach(([action, fn]) => {
      try { navigator.mediaSession.setActionHandler(action as any, fn as any); } catch (_) {}
    });
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // 5. CLEANUP — limpa sessão quando não há track
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (isNative && !currentTrack) {
      MediaSession.setPlaybackState({ playbackState: 'none' }).catch(() => {});
    }
  }, [currentTrack]);
}
