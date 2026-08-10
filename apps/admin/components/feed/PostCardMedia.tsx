import React from "react";
import Image from "next/image";
import { Flame, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { usePostCardContext } from "./PostCardContext";
import ExternalMediaNative, { parseExternalMedia } from "./ExternalMediaNative";
import { LinkPreview } from "./LinkPreview";
import { cn } from "@/lib/utils";

export default function PostCardMedia() {
  const {
    post,
    isVideo,
    isAudio,
    mediaUrl,
    shouldSkipMedia,
    postType,
    setLightboxUrl,
    handleDoubleClickLike,
    retryCount,
    setRetryCount,
    isPriority,
    setMediaError,
    showLikeAnim,
    videoRef,
    isMuted,
    handlePlayMedia,
    setIsMuted,
    audioRef,
    isPlaying,
    toggleAudio,
    audioProgress,
    mounted,
    fmtTime,
    setAudioProgress,
    setIsPlaying,
    router
  } = usePostCardContext();

  return (
    <>
      {/* YouTube Embed / Link Preview */}
      {!isVideo &&
        !isAudio &&
        (!mediaUrl || shouldSkipMedia) &&
        post.content && (
          <div className="px-3 pb-0">
            {(() => {
              const urlMatch = post.content.match(
                /(https?:\/\/[^\s]+|www\.[^\s]+)/,
              );
              if (!urlMatch) return null;
              let url = urlMatch[0];
              if (url.startsWith('www.')) url = 'https://' + url;

              const { platform } = parseExternalMedia(url);

              if (platform !== "unknown") {
                return (
                  <div className="w-full aspect-[9/16] max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl relative">
                    <ExternalMediaNative url={url} />
                  </div>
                );
              }

              return <LinkPreview url={url} />;
            })()}
          </div>
        )}

      {/* Image Media */}
      {mediaUrl &&
        !shouldSkipMedia &&
        (postType === "image" ||
          postType === "photo" ||
          post.media_type === "image" ||
          (!isVideo &&
            !isAudio &&
            mediaUrl.match(/\.(jpg|jpeg|png|gif|webp|heic|avif)/i)) ||
          (!isVideo &&
            !isAudio &&
            mediaUrl.includes("supabase.co/storage"))) && (
          <div
            className="w-full aspect-[4/5] bg-black relative group cursor-zoom-in overflow-hidden shadow-2xl"
            onClick={() => {
              if (mediaUrl && typeof mediaUrl === 'string') {
                setLightboxUrl(mediaUrl);
              }
            }}
            onDoubleClick={handleDoubleClickLike}
          >
            <Image
              src={retryCount > 0 ? `${mediaUrl}${mediaUrl.includes('?') ? '&' : '?'}sw=bypass` : mediaUrl}
              fill
              unoptimized
              priority={isPriority}
              sizes="(max-width: 768px) 100vw, 672px"
              className="feconecta-vibe object-cover transition-transform duration-700 group-hover:scale-105"
              alt="Imagem do post"
              onError={() => {
                if (retryCount < 1) {
                  setRetryCount((prev: number) => prev + 1);
                } else {
                  setMediaError(true);
                }
              }}
            />

            {showLikeAnim && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <Flame className="w-24 h-24 text-whatsapp-green fill-whatsapp-green drop-shadow-[0_0_20px_rgba(37,211,102,0.6)] animate-in zoom-in spin-in duration-300" />
              </div>
            )}
          </div>
        )}

      {/* Video Media */}
      {mediaUrl && isVideo && !shouldSkipMedia && (
        <div
          className="w-full bg-black rounded-2xl relative group cursor-pointer overflow-hidden shadow-2xl flex items-center justify-center"
          onClick={() => router.push(`/tribo?id=${post.id}`)}
          onDoubleClick={handleDoubleClickLike}
        >
          {post.thumbnail_url && (
            <div
              className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 scale-110 pointer-events-none"
              style={{ backgroundImage: `url(${post.thumbnail_url})` }}
            />
          )}

          <video
            ref={videoRef}
            className="w-full max-h-[70vh] object-contain relative z-10"
            src={retryCount > 0 ? `${mediaUrl}${mediaUrl.includes('?') ? '&' : '?'}sw=bypass#t=0.001` : `${mediaUrl}#t=0.001`}
            poster={post.thumbnail_url || undefined}
            preload={isPriority ? "auto" : "metadata"}
            muted={isMuted}
            loop
            playsInline
            crossOrigin="anonymous"
            onPlay={handlePlayMedia}
            onError={(e) => {
              if (retryCount < 1) {
                setRetryCount((prev: number) => prev + 1);
              } else {
                setMediaError(true);
              }
            }}
          />

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="absolute bottom-4 right-4 z-[40] w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/80 active:scale-90 transition-all shadow-lg"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4 fill-white" />
            )}
          </button>

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

          {showLikeAnim && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <Flame className="w-24 h-24 text-whatsapp-green fill-whatsapp-green drop-shadow-[0_0_20px_rgba(37,211,102,0.6)] animate-in zoom-in spin-in duration-300" />
            </div>
          )}
        </div>
      )}

      {/* Audio Media */}
      {isAudio && mediaUrl && !shouldSkipMedia && (
        <div className="bg-[#111b21] p-4 rounded-2xl border border-white/5 shadow-2xl mt-3 overflow-hidden relative group transition-all hover:bg-[#182229]">
          <style
            dangerouslySetInnerHTML={{
              __html: `
              @keyframes audio-wave-anim {
                0%, 100% { height: 6px; }
                50% { height: 24px; }
              }
              .wave-bar-anim { animation: audio-wave-anim 0.8s ease-in-out infinite; }
            `,
            }}
          />

          <div className="flex items-center gap-4 relative z-10">
            <button
              onClick={toggleAudio}
              className="w-11 h-11 rounded-full bg-whatsapp-teal flex items-center justify-center shadow-lg shadow-whatsapp-teal/20 transition-transform active:scale-90 hover:scale-105"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-white fill-white" />
              ) : (
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              )}
            </button>

            <div className="flex-1 flex items-center gap-[3px] h-10">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-[3px] rounded-full transition-all duration-300",
                    isPlaying
                      ? "wave-bar-anim bg-whatsapp-teal"
                      : "h-[6px] bg-whatsapp-teal/30",
                  )}
                  style={{
                    animationDelay: `${i * 0.05}s`,
                    backgroundColor:
                      audioProgress > (i / 30) * 100 ? "#00A884" : undefined,
                    opacity: audioProgress > (i / 30) * 100 ? 1 : 0.3,
                  }}
                />
              ))}
            </div>

            <span className="text-[11px] font-mono text-gray-400 min-w-[38px] text-right">
              {mounted && audioRef?.current
                ? fmtTime(audioRef.current.currentTime)
                : "0:00"}
            </span>
          </div>

          <audio
            ref={audioRef}
            src={mediaUrl}
            crossOrigin="anonymous"
            preload="metadata"
            onTimeUpdate={() =>
              audioRef.current &&
              setAudioProgress(
                (audioRef.current.currentTime / audioRef.current.duration) *
                100,
              )
            }
            onEnded={() => {
              setIsPlaying(false);
              setAudioProgress(0);
            }}
            onError={() => {
              setMediaError(true);
            }}
            className="hidden"
          />
        </div>
      )}
    </>
  );
}
