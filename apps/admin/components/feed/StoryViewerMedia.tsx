import React from "react";
import { Mic } from "lucide-react";
import { useStoryViewer } from "./StoryViewerContext";
import { cn } from "@/lib/utils";

export default function StoryViewerMedia() {
  const {
    data: { story, storyGroups },
    ui: { userIdx, storyIdx, isMuted, isBuffering },
    actions: { togglePause, videoRef, audioRef, isBufferingRef, dispatch },
  } = useStoryViewer();

  if (!story) return null;

  const group = storyGroups[userIdx];
  const nextStory = group
    ? storyIdx < group.stories.length - 1
      ? group.stories[storyIdx + 1]
      : userIdx < storyGroups.length - 1
      ? storyGroups[userIdx + 1].stories[0]
      : null
    : null;

  const cleanMediaUrl = story.media_url?.split("#")[0] || "";
  const nextMediaUrl = nextStory?.media_url?.split("#")[0] || "";

  const setIsBuffering = (val: boolean) =>
    dispatch({ type: "SET_BUFFERING", payload: val });

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-black" onClick={togglePause}>
      {/* IMAGE */}
      {story.media_type === "image" && (
        <>
          <img
            src={cleanMediaUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center"
            draggable={false}
          />
          {story.content && (
            <div className="absolute inset-x-0 bottom-0 pt-24 pb-20 px-6 flex items-end justify-center text-center pointer-events-none bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <h2 className="text-white text-xl font-bold leading-snug break-words drop-shadow-lg max-w-[90%]">
                {story.content}
              </h2>
            </div>
          )}
        </>
      )}

      {/* VIDEO */}
      {story.media_type === "video" && (
        <>
          {isBuffering && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-12 h-12 rounded-full border-4 border-whatsapp-green border-t-transparent animate-spin" />
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
            onWaiting={() => {
              setIsBuffering(true);
              isBufferingRef.current = true;
            }}
            onPlaying={() => {
              setIsBuffering(false);
              isBufferingRef.current = false;
            }}
            className="absolute inset-0 w-full h-full object-cover object-center bg-black
                       [&::-webkit-media-controls]:hidden
                       [&::-webkit-media-controls-start-playback-button]:hidden"
          />
          {story.content && (
            <div className="absolute inset-x-0 bottom-0 pt-24 pb-20 px-6 flex items-end justify-center text-center pointer-events-none bg-gradient-to-t from-black/80 via-black/40 to-transparent">
              <h2 className="text-white text-xl font-bold leading-snug break-words drop-shadow-lg max-w-[90%]">
                {story.content}
              </h2>
            </div>
          )}
        </>
      )}

      {/* AUDIO */}
      {story.media_type === "audio" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-900">
          <div className="relative w-28 h-28 rounded-full bg-whatsapp-green/10 flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-full bg-whatsapp-green/20 animate-ping" />
            <Mic className="w-11 h-11 text-whatsapp-green relative z-10" />
          </div>
          {story.content && (
            <h2 className="text-white text-2xl font-bold leading-tight break-words drop-shadow-lg max-w-[90%]">
              {story.content}
            </h2>
          )}
          <audio
            ref={audioRef as any}
            src={cleanMediaUrl}
            crossOrigin="anonymous"
            autoPlay
            onWaiting={() => {
              setIsBuffering(true);
              isBufferingRef.current = true;
            }}
            onPlaying={() => {
              setIsBuffering(false);
              isBufferingRef.current = false;
            }}
          />
        </div>
      )}

      {/* TEXT */}
      {story.media_type === "text" && (
        <div
          className="absolute inset-0 flex items-center justify-center p-8 text-center overflow-hidden"
          style={{ backgroundColor: story.background_color || "#075E54" }}
        >
          <h2 className="text-white text-3xl font-bold leading-tight break-words max-w-[90%] relative z-10">
            {story.content}
          </h2>
          <div className="absolute -bottom-10 -right-10 opacity-[0.05] pointer-events-none rotate-12">
            <svg width="240" height="240" viewBox="0 0 24 24" fill="white">
              <path d="M11 2h2v7h7v2h-7v11h-2v-11h-7v-2h7v-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Preload próximo */}
      <div className="hidden absolute w-0 h-0 overflow-hidden pointer-events-none opacity-0">
        {nextStory?.media_type === "image" && (
          <img src={nextMediaUrl} alt="preload" />
        )}
        {nextStory &&
          (nextStory.media_type === "video" || nextStory.media_type === "audio") && (
            <video src={nextMediaUrl} preload="auto" muted playsInline />
          )}
      </div>
    </div>
  );
}
