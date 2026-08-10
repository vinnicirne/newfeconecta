import React from 'react';
import { useStoryViewer } from './StoryViewerContext';

export default function StoryViewerControls() {
  const {
    ui: { showStats, isNamingStory },
    actions: { handleTouchStart, handlePointerDown, handleTouchEnd, handlePointerUp }
  } = useStoryViewer();

  if (showStats || isNamingStory) return null;

  return (
    <div 
      className="absolute inset-0 z-15 flex touch-none"
      onPointerDown={(e) => {
        handleTouchStart(e);
        handlePointerDown();
      }}
      onPointerUp={(e) => {
        const clientX = e.clientX;
        const width = e.currentTarget.clientWidth;
        handleTouchEnd(e);
        if (clientX < width * 0.25) handlePointerUp('prev');
        else if (clientX > width * 0.75) handlePointerUp('next');
        else handlePointerUp(); 
      }}
    >
      <div className="w-1/4 h-full cursor-pointer" />
      <div className="flex-1 h-full cursor-pointer" />
      <div className="w-1/4 h-full cursor-pointer" />
    </div>
  );
}
