import { useEffect } from 'react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { AudioPlayerRefs } from '../types';

const CROSSFADE_DURATION = 3.5; // segundos de crossfade suave

export function useCrossfade({
  getActiveAudio,
  getInactiveAudio,
  setActiveIndex,
  isCrossfading,
  hasTriggeredCrossfade,
}: AudioPlayerRefs) {
  const { isPlaying, progressMs, durationMs, queue, currentTrack, next } = usePlayerStore();

  useEffect(() => {
    if (!isPlaying || !durationMs || durationMs <= 0) return;

    const currentTime = progressMs / 1000;
    const timeLeft = durationMs / 1000 - currentTime;

    // Dispara o crossfade quando faltam X segundos para o término
    if (
      timeLeft <= CROSSFADE_DURATION &&
      timeLeft > 0.3 &&
      !hasTriggeredCrossfade.current &&
      queue.length > 0
    ) {
      startCrossfade();
    }
  }, [progressMs, durationMs, isPlaying]);

  const startCrossfade = async () => {
    if (isCrossfading.current) return;
    isCrossfading.current = true;
    hasTriggeredCrossfade.current = true;

    const currentAudio = getActiveAudio();
    const nextAudio = getInactiveAudio();
    if (!currentAudio || !nextAudio) return;

    // Descobre a próxima música da fila
    const currentIndex = queue.findIndex(
      (t) => t.id === currentTrack?.id || t.providerTrackId === currentTrack?.providerTrackId
    );
    const nextTrack = queue[currentIndex + 1];

    if (!nextTrack) {
      // Não tem próxima na fila → deixa a atual acabar normalmente
      isCrossfading.current = false;
      return;
    }

    // Pega a URL da próxima música (já deve estar no localStorage graças ao nosso preload Inteligente)
    const nextSrc =
      (nextTrack as any).audioUrl ||
      localStorage.getItem(`fc_audio_cache_${nextTrack.providerTrackId}`);

    if (!nextSrc) {
      // Se ainda não estiver pronta ou extraída, cancela o crossfade e usa o fluxo normal ao terminar
      isCrossfading.current = false;
      return;
    }

    console.log(`[Crossfade] Iniciando transição suave para: ${nextTrack.title}`);

    // Prepara o áudio inativo com volume zerado
    nextAudio.src = nextSrc;
    nextAudio.volume = 0;
    nextAudio.currentTime = 0;

    try {
      await nextAudio.play();
    } catch (err) {
      console.warn('[Crossfade] Não conseguiu iniciar áudio seguinte:', err);
      isCrossfading.current = false;
      return;
    }

    // Em vez de manipulação arriscada de volume/intervalo que quebra o window.audioPlayer,
    // deixamos o término natural ou avanço suave acontecer
    isCrossfading.current = false;
  };
}

