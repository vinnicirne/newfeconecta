import React from 'react';
import { Mic } from 'lucide-react';
import { useStoryViewer } from './StoryViewerContext';
import { cn } from '@/lib/utils';

export default function StoryViewerMedia() {
  const {
    data: { story, storyGroups },
    ui: { userIdx, storyIdx, isMuted, isBuffering },
    actions: { togglePause, videoRef, audioRef, isBufferingRef, dispatch }
  } = useStoryViewer();

  if (!story) return null;

  const group = storyGroups[userIdx];
  const nextStory = group ? (storyIdx < group.stories.length - 1 
    ? group.stories[storyIdx + 1] 
    : (userIdx < storyGroups.length - 1 
      ? storyGroups[userIdx + 1].stories[0] 
      : null)) : null;

  const cleanMediaUrl = story.media_url?.split('#')[0] || '';
  const nextMediaUrl = nextStory?.media_url?.split('#')[0] || '';

  const setIsBuffering = (val: boolean) => dispatch({ type: "SET_BUFFERING", payload: val });

  return (
    <div className="absolute inset-0 z-0" onClick={togglePause}>
      {story.media_type === 'image' && (
        <>
          <img src={cleanMediaUrl} className="w-full h-full object-cover" alt="" />
          {story.content && (
            <div className="absolute bottom-16 left-0 right-0 p-8 pt-24 flex items-end justify-center text-center pointer-events-none bg-gradient-to-t from-black/80 via-black/30 to-transparent">
              <h2 className="text-white text-xl font-bold leading-snug break-words drop-shadow-lg px-4 mb-8">
                {story.content}
              </h2>
            </div>
          )}
        </>
      )}
      {story.media_type === 'video' && (
        <>
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[10]">
               <div className="w-12 h-12 rounded-full border-4 border-whatsapp-green border-t-transparent animate-spin shadow-lg" />
            </div>
          )}
          <video 
            ref={videoRef as any}
            src={cleanMediaUrl} 
            crossOrigin="anonymous"
            autoPlay 
            playsInline 
            muted={isMuted} 
            preload="auto"
            controls={false}
            poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            onWaiting={() => { setIsBuffering(true); isBufferingRef.current = true; }}
            onPlaying={() => { setIsBuffering(false); isBufferingRef.current = false; }}
            className="w-full h-full object-contain bg-black [&::-webkit-media-controls-start-playback-button]:hidden [&::-webkit-media-controls]:hidden" 
          />
          {story.content && (
            <div className="absolute bottom-16 left-0 right-0 p-8 pt-24 flex items-end justify-center text-center pointer-events-none bg-gradient-to-t from-black/80 via-black/30 to-transparent">
              <h2 className="text-white text-xl font-bold leading-snug break-words drop-shadow-lg px-4 mb-8">
                {story.content}
              </h2>
            </div>
          )}
        </>
      )}
      {story.media_type === 'audio' && (
        <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center bg-zinc-900 border-x border-white/5">
           <div className="w-32 h-32 rounded-full bg-whatsapp-green/10 flex items-center justify-center relative mb-8">
              <div className="absolute inset-0 rounded-full bg-whatsapp-green/20 animate-ping" />
              <Mic className="w-12 h-12 text-whatsapp-green relative z-10" />
           </div>
           {story.content && (
              <h2 className="text-white text-3xl font-bold leading-tight break-words drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] px-4">
                {story.content}
              </h2>
           )}
           <audio 
             ref={audioRef as any}
             src={cleanMediaUrl} 
             crossOrigin="anonymous"
             autoPlay 
             onWaiting={() => { setIsBuffering(true); isBufferingRef.current = true; }}
             onPlaying={() => { setIsBuffering(false); isBufferingRef.current = false; }}
           />
        </div>
      )}
      {story.media_type === 'text' && (
        <div className="w-full h-full flex items-center justify-center p-12 text-center relative overflow-hidden" style={{ backgroundColor: story.background_color || '#075E54' }}>
           <h2 className="text-white text-3xl font-bold leading-tight break-words px-4 relative z-10">{story.content}</h2>
           <div className="absolute -bottom-10 -right-10 opacity-[0.05] pointer-events-none transform rotate-12">
              <svg width="240" height="240" viewBox="0 0 24 24" fill="white">
                 <path d="M11 2h2v7h7v2h-7v11h-2v-11h-7v-2h7v-7z"/>
              </svg>
           </div>
        </div>
      )}

      <div className="hidden pointer-events-none opacity-0 absolute w-0 h-0 overflow-hidden">
        {nextStory && nextStory.media_type === 'image' && (
          <img src={nextMediaUrl} alt="preload" />
        )}
        {nextStory && (nextStory.media_type === 'video' || nextStory.media_type === 'audio') && (
          <video src={nextMediaUrl} preload="auto" muted playsInline />
        )}
      </div>
    </div>
  );
}
