"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const DURATION = 5000;

export default function StoryViewer({ storyGroups, startUserIndex = 0, currentUser, onClose }: any) {
  const [userIdx, setUserIdx] = useState(startUserIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);

  const elapsed = useRef(0);
  const lastTick = useRef<number | null>(null);
  const timerRef = useRef<any>(null);

  const group = storyGroups[userIdx];
  const story = group?.stories[storyIdx];

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const advance = useCallback(() => {
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(storyIdx + 1);
    } else if (userIdx < storyGroups.length - 1) {
      setUserIdx(userIdx + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [userIdx, storyIdx, group, storyGroups, onClose]);

  const prev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(storyIdx - 1);
    } else if (userIdx > 0) {
      const prevGroup = storyGroups[userIdx - 1];
      setUserIdx(userIdx - 1);
      setStoryIdx(prevGroup.stories.length - 1);
    } else {
      setStoryIdx(0);
      setProgress(0);
      elapsed.current = 0;
    }
  }, [userIdx, storyIdx, storyGroups]);

  const startTimer = useCallback(() => {
    clearTimer();
    lastTick.current = Date.now();
    timerRef.current = setInterval(() => {
      if (!lastTick.current) return;
      const now = Date.now();
      elapsed.current += now - lastTick.current;
      lastTick.current = now;
      const pct = Math.min((elapsed.current / DURATION) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearTimer();
        advance();
      }
    }, 50);
  }, [advance]);

  useEffect(() => {
    if (!story) return;
    elapsed.current = 0;
    setProgress(0);
    setPaused(false);
    
    // Mark as viewed locally
    console.log("Story viewed locally:", story.id);
    
    startTimer();
    return clearTimer;
  }, [userIdx, storyIdx]);

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      lastTick.current = Date.now();
    } else {
      setPaused(true);
      lastTick.current = null;
    }
  };

  if (!group || !story) return null;

  return (
    <div className="fixed inset-0 z-[400] bg-black flex flex-col items-center justify-center">
      <div className="relative w-full h-full max-w-md bg-whatsapp-dark overflow-hidden sm:rounded-[40px] shadow-2xl">
        {/* Media */}
        <div className="absolute inset-0 z-0" onClick={togglePause}>
          {story.media_type === 'image' ? (
            <img src={story.media_url} className="w-full h-full object-cover" alt="" />
          ) : (
            <video src={story.media_url} autoPlay playsInline muted={false} className="w-full h-full object-cover" />
          )}
        </div>

        {/* Overlays */}
        <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-black/60 via-transparent to-black/60" />

        {/* Progress Bars */}
        <div className="absolute top-6 left-0 right-0 z-20 px-2 flex gap-1">
          {group.stories.map((_: any, i: number) => (
            <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-75",
                  i < storyIdx ? "w-full bg-white" : i === storyIdx ? "bg-white" : "w-0"
                )}
                style={{ width: i === storyIdx ? `${progress}%` : undefined }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-10 left-0 right-0 z-20 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-whatsapp-green">
                <img src={group.author_avatar} className="w-full h-full object-cover" alt="" />
             </div>
             <div>
                <p className="text-white text-sm font-bold leading-none mb-1">{group.author_name}</p>
                <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest">Postado agora</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-all pointer-events-auto">
            <X size={24} />
          </button>
        </div>

        {/* Interaction Areas */}
        <div className="absolute inset-0 z-15 flex">
          <div className="w-1/3 h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); prev(); }} />
          <div className="w-1/3 h-full cursor-pointer" onClick={togglePause} />
          <div className="w-1/3 h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); advance(); }} />
        </div>

        {/* Pause Overlay */}
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
             <div className="p-4 rounded-full bg-black/20 backdrop-blur-md border border-white/10">
                <Play className="w-12 h-12 text-white fill-white ml-2" />
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
