import React from "react";
import { Mic, AlertCircle } from "lucide-react";
import { useStoryViewer } from "./StoryViewerContext";
import { cn } from "@/lib/utils";

export default function StoryViewerMedia() {
  const {
    data: { story, storyGroups },
    ui: { userIdx, storyIdx, isMuted, isBuffering },
    actions: { togglePause, videoRef, audioRef, isBufferingRef, dispatch, advance },
  } = useStoryViewer();

  if (!story) return null;

  const group = storyGroups[userIdx];
  const nextStory = group
    ? storyIdx < group.stories.length - 1
      ? group.stories[storyIdx + 1]
      : userIdx < storyGroups.length - 1
      ? storyGroups[userIdx + 1]?.stories?.[0]
      : null
    : null;

  const cleanMediaUrl = story.media_url?.split("#")[0] || "";
  const nextMediaUrl = nextStory?.media_url?.split("#")[0] || "";
  const [imgLoaded, setImgLoaded] = React.useState(false);
  const [mediaError, setMediaError] = React.useState(false);

  React.useEffect(() => {
    setImgLoaded(false);
    setMediaError(false);
  }, [cleanMediaUrl]);

  const setIsBuffering = (val: boolean) => {
    isBufferingRef.current = val;
    dispatch({ type: "SET_BUFFERING", payload: val });
  };

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-black" onClick={togglePause}>
      {/* IMAGE */}
      {story.media_type === "image" && (
        <>
          {!imgLoaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="w-10 h-10 rounded-full border-3 border-whatsapp-green border-t-transparent animate-spin" />
            </div>
          )}
          <img
            src={cleanMediaUrl}
            alt=""
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            className={cn(
              "absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300",
              imgLoaded ? "opacity-100" : "opacity-0"
            )}
            draggable={false}
          />
          {/* Pré-carregamento invisível da próxima imagem de story para transição sem delay */}
          {nextMediaUrl && nextStory?.media_type === "image" && (
            <img src={nextMediaUrl} alt="" className="hidden" decoding="async" />
          )}
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
          {isBuffering && !mediaError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
              <div className="w-12 h-12 rounded-full border-4 border-whatsapp-green border-t-transparent animate-spin" />
            </div>
          )}
          {mediaError ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 gap-3">
              <AlertCircle className="w-12 h-12 text-rose-500" />
              <p className="text-sm font-bold text-white">Não foi possível reproduzir este vídeo</p>
              <button 
                onClick={(e) => { e.stopPropagation(); advance(); }}
                className="px-4 py-1.5 rounded-full bg-white/20 text-white text-xs font-semibold hover:bg-white/30 transition-colors"
              >
                Próximo story
              </button>
            </div>
          ) : (
            <video
              key={story.id}
              ref={videoRef as any}
              src={cleanMediaUrl}
              autoPlay
              playsInline
              webkit-playsinline="true"
              muted={isMuted}
              preload="auto"
              controls={false}
              poster="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onCanPlay={() => setIsBuffering(false)}
              onTimeUpdate={() => {
                const v = videoRef.current;
                if (v && v.duration > 0) {
                  const pct = Math.min((v.currentTime / v.duration) * 100, 100);
                  dispatch({ type: "SET_PROGRESS", payload: pct });
                }
              }}
              onEnded={() => {
                advance();
              }}
              onError={(e) => {
                console.error("Erro na reprodução do vídeo do story:", e);
                setIsBuffering(false);
                setMediaError(true);
                setTimeout(() => advance(), 2000);
              }}
              className="absolute inset-0 w-full h-full object-cover object-center bg-black
                         [&::-webkit-media-controls]:hidden
                         [&::-webkit-media-controls-start-playback-button]:hidden"
            />
          )}
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
            key={story.id}
            ref={audioRef as any}
            src={cleanMediaUrl}
            autoPlay
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onCanPlay={() => setIsBuffering(false)}
            onTimeUpdate={() => {
              const a = audioRef.current;
              if (a && a.duration > 0) {
                const pct = Math.min((a.currentTime / a.duration) * 100, 100);
                dispatch({ type: "SET_PROGRESS", payload: pct });
              }
            }}
            onEnded={() => advance()}
            onError={() => {
              setIsBuffering(false);
              setTimeout(() => advance(), 1500);
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
