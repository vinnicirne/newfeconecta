import { useEffect, useCallback } from 'react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { AudioPlayerRefs } from '../types';

export function usePlayerControls({
  getActiveAudio,
  getInactiveAudio,
  activeIndex,
  isCrossfading,
}: AudioPlayerRefs) {
  const {
    isPlaying,
    currentTrack,
    updateProgress,
    setDuration,
    next,
  } = usePlayerStore();

  // 1. Inicializa duração se já vier nos metadados da faixa e pré-carrega próximas
  useEffect(() => {
    if (!currentTrack) return;
    
    if (currentTrack.duration && currentTrack.duration > 0) {
      setDuration(currentTrack.duration);
    }

    const store = usePlayerStore.getState();
    const provider = store.provider as any;
    
    if (provider?.preloadNextTracks && Array.isArray(store.queue) && store.queue.length > 0) {
      provider.preloadNextTracks(store.queue, currentTrack.id, 2);
    }
  }, [currentTrack?.id, setDuration]);

  // 2. Sincronização rigorosa de Play/Pause baseada no estado isPlaying
  useEffect(() => {
    const active = getActiveAudio();
    const inactive = getInactiveAudio();

    // Garante SEMPRE que o inativo esteja pausado
    if (inactive && !inactive.paused) {
      inactive.pause();
      inactive.currentTime = 0;
    }

    if (!active) return;

    if (isPlaying) {
      // Somente tenta tocar se houver um source válido e se o áudio estiver de fato pausado
      if (active.src && active.src !== window.location.href && active.paused) {
        active.play().catch((err) => {
          console.warn('[usePlayerControls] Falha ao executar play no áudio ativo:', err);
        });
      }
    } else {
      if (!active.paused) {
        active.pause();
      }
    }
  }, [isPlaying, activeIndex, getActiveAudio, getInactiveAudio]);

  // 3. Handlers de eventos de áudio com sincronização contínua de progresso e duração
  const syncDuration = useCallback((audio: HTMLAudioElement) => {
    if (typeof audio.duration === 'number' && !isNaN(audio.duration) && audio.duration !== Infinity && audio.duration > 0) {
      const durMs = audio.duration * 1000;
      setDuration(durMs);
    }
  }, [setDuration]);

  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    if (audio === getActiveAudio()) {
      updateProgress(audio.currentTime * 1000);
      syncDuration(audio);
    }
  }, [getActiveAudio, syncDuration, updateProgress]);

  const handleLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    if (audio === getActiveAudio()) {
      syncDuration(audio);
    }
  }, [getActiveAudio, syncDuration]);

  const handleEnded = useCallback(() => {
    if (!isCrossfading.current) {
      next();
    }
  }, [isCrossfading, next]);

  const onError = useCallback((e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    console.error('[usePlayerControls] Erro nativo no elemento de áudio:', audio.error);
    
    if (!isCrossfading.current) {
      const store = usePlayerStore.getState();
      const track = store.currentTrack;
      if (track) {
        // Limpa o cache corrompido ou expirado
        localStorage.removeItem(`fc_audio_cache_${track.providerTrackId}`);
      }
      
      store.incrementFailures();
    }
  }, [isCrossfading]);

  return {
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
    onError,
  };
}
