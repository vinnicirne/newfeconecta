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

  // 1. Aciona o pré-carregamento silencioso de forma segura
  useEffect(() => {
    if (!currentTrack) return;
    
    const store = usePlayerStore.getState();
    const provider = store.provider as any;
    
    if (provider?.preloadNextTracks && Array.isArray(store.queue) && store.queue.length > 0) {
      provider.preloadNextTracks(store.queue, currentTrack.id, 2);
    }
  }, [currentTrack?.id]);

  // 2. Sincronização rigorosa de Play/Pause baseada no estado isPlaying
  useEffect(() => {
    const active = getActiveAudio();
    if (!active) return;

    if (isPlaying) {
      // Somente tenta tocar se houver um source válido configurado e se o áudio estiver de fato pausado
      if (active.src && active.src !== window.location.href && active.paused) {
        active.play().catch((err) => {
          console.warn('[usePlayerControls] Falha ao executar play no áudio ativo:', err);
        });
      }
    } else {
      if (!active.paused) {
        active.pause();
      }
      
      // Garante que o inativo não fique tocando em background pós-crossfade
      const inactive = getInactiveAudio();
      if (inactive && !inactive.paused) {
        inactive.pause();
      }
    }
  }, [isPlaying, activeIndex, getActiveAudio, getInactiveAudio]);

  // 3. Handlers de eventos de áudio (agora envoltos em useCallback para estabilidade)
  const handleTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLAudioElement>) => {
    if (isCrossfading.current) return; 
    
    const audio = e.currentTarget;
    if (audio === getActiveAudio()) {
      updateProgress(audio.currentTime * 1000);
    }
  }, [getActiveAudio, isCrossfading, updateProgress]);

  const handleLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    if (audio === getActiveAudio()) {
      // Valida se a duração é um número válido e diferente de infinito (comum em streams HLS)
      if (typeof audio.duration === 'number' && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setDuration(audio.duration * 1000);
      }
    }
  }, [getActiveAudio, setDuration]);

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
