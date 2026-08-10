import { useEffect, useRef } from 'react';
import { usePlayerStore } from '../infrastructure/state/usePlayerStore';
import { updateContinueProgress } from '../domain/continueListening';

export function useSaveProgress() {
  const { currentTrack, isPlaying, progressMs } = usePlayerStore();
  const lastSavedAt = useRef(0);

  // Salva periodicamente enquanto toca + imediatamente quando pausa
  useEffect(() => {
    if (!currentTrack || progressMs <= 0) return;

    const now = Date.now();
    const timeSinceLastSave = now - lastSavedAt.current;

    // Salva a cada 4 segundos enquanto está tocando
    // ou imediatamente quando o usuário pausa
    const shouldSave = !isPlaying || timeSinceLastSave > 4000;

    if (shouldSave) {
      updateContinueProgress(currentTrack.id || currentTrack.providerTrackId, progressMs);
      lastSavedAt.current = now;
    }
  }, [currentTrack?.id, currentTrack?.providerTrackId, progressMs, isPlaying]);

  // Garante o salvamento quando o usuário fecha a aba/app
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentTrack && progressMs > 0) {
        updateContinueProgress(currentTrack.id || currentTrack.providerTrackId, progressMs);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentTrack, progressMs]);
}
