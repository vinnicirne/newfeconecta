'use client';

import React, { useEffect } from 'react';
import { useSaveProgress } from '@/modules/femusic/application/useSaveProgress';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

import { useAudioPlayers } from './hooks/useAudioPlayers';
import { usePlayerControls } from './hooks/usePlayerControls';
import { useCrossfade } from './hooks/useCrossfade';
import { useMediaSession } from './hooks/useMediaSession';
import { HiddenAudioElements } from './components/HiddenAudioElements';

export default function GlobalYouTubePlayer() {
  useSaveProgress();

  useEffect(() => {
    if (Capacitor.getPlatform() === 'android') {
      LocalNotifications.requestPermissions().catch(console.warn);
    }
  }, []);

  const playerRefs = useAudioPlayers();

  const {
    handleTimeUpdate,
    handleLoadedMetadata,
    handleEnded,
    onError,
  } = usePlayerControls(playerRefs);

  useCrossfade(playerRefs);
  useMediaSession();

  return (
    <HiddenAudioElements
      {...playerRefs}
      handleTimeUpdate={handleTimeUpdate}
      handleLoadedMetadata={handleLoadedMetadata}
      handleEnded={handleEnded}
      onError={onError}
    />
  );
}
