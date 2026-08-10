import { useEffect, useState } from 'react';
import { usePlayerStore } from '../infrastructure/state/usePlayerStore';
import {
  getContinueSession,
  clearContinueSession,
  cleanupStaleSessions,
  ContinueSession,
} from '../domain/continueListening';

export function useContinueListening() {
  const [session, setSession] = useState<ContinueSession | null>(null);
  const { play } = usePlayerStore();

  // Carrega ao abrir o app — limpa sessões antigas com IDs inválidos primeiro
  useEffect(() => {
    cleanupStaleSessions(); // remove IDs fictícios do localStorage
    const saved = getContinueSession();
    setSession(saved);
  }, []);

  const resumeSession = async () => {
    if (!session) return;

    const currentTrack =
      session.tracks.find((t) => t.id === session.currentTrackId || t.providerTrackId === session.currentTrackId) ||
      session.tracks[0];

    if (!currentTrack) return;

    await play(currentTrack, session.tracks);

    const seekTime = session.progress / 1000;
    if (seekTime <= 0) return;

    const audio = (window as any).audioPlayer as HTMLAudioElement | undefined;
    if (!audio) return;

    const applySeek = () => {
      if (audio.readyState >= 1) {
        audio.currentTime = seekTime;
        return true;
      }
      return false;
    };

    if (applySeek()) return;

    const onReady = () => {
      applySeek();
      audio.removeEventListener('loadedmetadata', onReady);
      audio.removeEventListener('canplay', onReady);
    };

    audio.addEventListener('loadedmetadata', onReady);
    audio.addEventListener('canplay', onReady);
  };

  const dismissSession = () => {
    clearContinueSession();
    setSession(null);
  };

  return {
    session,
    resumeSession,
    dismissSession,
  };
}
