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

  const onPlay = () => {
    usePlayerStore.setState({ isPlaying: true });
  };

  const onPlaying = () => {
    usePlayerStore.setState({ isPlaying: true });

    if (typeof window !== 'undefined') {
      import('@jofr/capacitor-media-session').then(({ MediaSession }) => {
        import('@capacitor/core').then(({ Capacitor }) => {
          if (Capacitor.getPlatform() !== 'web') {
            MediaSession.setPlaybackState({ playbackState: 'playing' })
              .catch(e => console.warn('[MediaSession] Erro onPlaying:', e));
          }
        });
      });
    }
  };

  const onPause = () => {
    const { isLoading } = usePlayerStore.getState();
    if (isCrossfading.current || isLoading) {
      return;
    }
    usePlayerStore.setState({ isPlaying: false });
  };

  return (
    <>
      <audio
        ref={audioARef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onLoadedData={handleLoadedMetadata}
        onCanPlay={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={onError}
        onPlay={onPlay}
        onPlaying={onPlaying}
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
        onDurationChange={handleLoadedMetadata}
        onLoadedData={handleLoadedMetadata}
        onCanPlay={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={onError}
        onPlay={onPlay}
        onPlaying={onPlaying}
        onPause={onPause}
        className="hidden"
        preload="auto"
        playsInline
        {...({ disableRemotePlayback: true } as any)}
      />
    </>
  );
}
