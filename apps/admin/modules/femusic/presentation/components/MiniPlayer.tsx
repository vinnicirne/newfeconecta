'use client';

import React from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Heart } from 'lucide-react';
import { usePlayerStore } from '@/modules/femusic/infrastructure/state/usePlayerStore';

export default function MiniPlayer() {
  const { currentTrack, isPlaying, isFullScreen, setFullScreen, pause, resume, next, previous } = usePlayerStore();
  
  if (!currentTrack || isFullScreen) {
    return null;
  }

  return (
    <div 
      onClick={() => setFullScreen(true)}
      className="fixed left-3 right-3 md:left-auto md:right-4 md:w-96 backdrop-blur-xl border border-white/20 rounded-2xl p-2 shadow-2xl shadow-black flex items-center gap-3 z-[300] cursor-pointer"
      style={{ bottom: '140px', backgroundColor: 'rgba(24,24,27,0.95)' }}
    >
      <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-black/50">
        <img 
          src={currentTrack.cover || 'https://via.placeholder.com/150'} 
          alt={currentTrack.title} 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="flex-1 min-w-0 pr-1">
        <h4 className="font-bold text-sm text-white truncate">{currentTrack.title}</h4>
        <p className="text-xs text-whatsapp-teal truncate">{currentTrack.artist}</p>
      </div>

      <div className="flex items-center gap-2 pr-2" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={() => previous(true)}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <SkipBack className="w-4 h-4" fill="currentColor" />
        </button>
        
        <button 
          onClick={() => isPlaying ? pause() : resume()}
          className="w-10 h-10 flex items-center justify-center bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all"
        >
          {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-1" fill="currentColor" />}
        </button>
        
        <button 
          onClick={() => next(true)}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <SkipForward className="w-4 h-4" fill="currentColor" />
        </button>
      </div>
    </div>
  );
}
