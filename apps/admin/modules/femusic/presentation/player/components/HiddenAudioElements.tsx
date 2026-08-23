import React from 'react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';
import { AudioPlayerRefs } from '../types';

interface Props extends AudioPlayerRefs {
  handleTimeUpdate: (e: React.SyntheticEvent<HTMLAudioElement>) => void;
  handleLoadedMetadata: (e: React.SyntheticEvent<HTMLAudioElement>) => void;
  handleEnded: () => void;
  onError: (e: React.SyntheticEvent<HTMLAudioElement>) => void;
}

export function HiddenAudioElements({
  audioARef,
  audioBRef,
  isCrossfading,
  handleTimeUpdate,
  handleLoadedMetadata,
  handleEnded,
  onError,
}: Props) {

  // Sync store ← audio para o caso do Android controlar o <audio> diretamente
  // (bypass do nosso handler JS — acontece com play/pause nativos do Android).
  // Guard: isLoading evita o feedback loop durante troca de música
  // (o src muda → audio pausa momentaneamente → onPause seria chamado incorretamente).
  const onPlay = () => {
    console.log('[Audio] onPlay disparado');
    usePlayerStore.setState({ isPlaying: true });
  };

  const onPause = () => {
    const { isLoading } = usePlayerStore.getState();
    if (isCrossfading.current || isLoading) {
      console.log('[Audio] onPause ignorado (crossfade ou loading em curso)');
      return;
    }
    console.log('[Audio] onPause disparado → isPlaying: false');
    usePlayerStore.setState({ isPlaying: false });
  };

  return (
    <>
      <audio
        ref={audioARef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={onError}
        onPlay={onPlay}
        onPause={onPause}
        className="hidden"
        preload="auto"
        playsInline
        {...({ disableRemotePlayback: true } as any)}
      />
      <audio
        ref={audioBRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={onError}
        onPlay={onPlay}
        onPause={onPause}
        className="hidden"
        preload="auto"
        playsInline
        {...({ disableRemotePlayback: true } as any)}
      />
    </>
  );
}
