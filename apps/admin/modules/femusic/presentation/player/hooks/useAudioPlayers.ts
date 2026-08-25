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

  // Expõe o player ativo e a limpeza do inativo globalmente
  useEffect(() => {
    const active = getActiveAudio();
    if (active) {
      (window as any).audioPlayer = active;
    }
    
    (window as any).stopInactiveAudio = () => {
      const inactive = getInactiveAudio();
      if (inactive) {
        inactive.pause();
        inactive.currentTime = 0;
        inactive.removeAttribute('src');
        inactive.load();
      }
    };
  }, [activeIndex, getActiveAudio, getInactiveAudio]);

  // Quando a música muda: limpa o áudio anterior para NUNCA tocar 2 músicas juntas
  useEffect(() => {
    const active = getActiveAudio();
    const inactive = getInactiveAudio();
    if (!active || !currentTrack) return;

    hasTriggeredCrossfade.current = false;
    isCrossfading.current = false;

    // Pausa e descarrega IMEDIATAMENTE o áudio inativo
    if (inactive) {
      inactive.pause();
      inactive.currentTime = 0;
      inactive.removeAttribute('src');
      inactive.load();
    }
  }, [currentTrack?.id, getActiveAudio, getInactiveAudio]);

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
