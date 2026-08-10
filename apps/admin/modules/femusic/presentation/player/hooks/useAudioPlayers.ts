import { useRef, useState, useEffect, useCallback } from 'react';
import { AudioPlayerRefs } from '../types';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';

export function useAudioPlayers(): AudioPlayerRefs {
  const audioARef = useRef<HTMLAudioElement>(null);
  const audioBRef = useRef<HTMLAudioElement>(null);
  const [activeIndex, setActiveIndex] = useState<0 | 1>(0);
  const isCrossfading = useRef(false);
  const hasTriggeredCrossfade = useRef(false);

  // Ref para sempre ter o activeIndex atual
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Funções estáveis (não mudam a cada render)
  const getActiveAudio = useCallback(() => {
    return activeIndexRef.current === 0 ? audioARef.current : audioBRef.current;
  }, []);

  const getInactiveAudio = useCallback(() => {
    return activeIndexRef.current === 0 ? audioBRef.current : audioARef.current;
  }, []);

  const { currentTrack } = usePlayerStore();

  // Expõe o player ativo globalmente
  useEffect(() => {
    const active = getActiveAudio();
    if (active) {
      (window as any).audioPlayer = active;
    }
  }, [activeIndex, getActiveAudio]);

  // Quando a música muda
  useEffect(() => {
    const active = getActiveAudio();
    if (!active || !currentTrack) return;

    hasTriggeredCrossfade.current = false;
    isCrossfading.current = false;

    const newSrc =
      (currentTrack as any).audioUrl ||
      localStorage.getItem(`fc_audio_cache_${currentTrack.providerTrackId}`);

    if (newSrc && active.src !== newSrc && !active.src.endsWith(newSrc)) {
      active.src = newSrc;
      active.load();
      active.volume = 1;

      if (usePlayerStore.getState().isPlaying) {
        active.play().catch(() => {});
      }
    }
  }, [currentTrack?.id, getActiveAudio]);

  return {
    audioARef,
    audioBRef,
    activeIndex,
    setActiveIndex,
    isCrossfading,
    hasTriggeredCrossfade,
    getActiveAudio,
    getInactiveAudio,
  };
}
