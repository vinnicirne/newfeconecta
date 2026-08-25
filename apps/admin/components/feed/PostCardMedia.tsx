import React from "react";
import Image from "next/image";
import { Flame, Play, Pause, Volume2, VolumeX, Music, Mic, Radio, Sparkles } from "lucide-react";
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
                const isShorts = platform === "youtube_shorts" || platform === "tiktok";
                return (
                  <div className={cn(
                    "w-full rounded-2xl overflow-hidden shadow-2xl relative bg-zinc-950",
                    isShorts ? "aspect-[9/16] max-h-[70vh]" : "aspect-video max-h-[60vh]"
                  )}>
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

        {/* Audio Media — Pôster de Áudio Imersivo */}
        {isAudio && mediaUrl && !shouldSkipMedia && (
          <div className="relative w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl mt-0.5 mb-2 bg-gradient-to-b from-[#18272f] via-[#0d161b] to-[#080d11] select-none group">
            <style
              dangerouslySetInnerHTML={{
                __html: `
                @keyframes pulse-wave {
                  0%, 100% { transform: scaleY(0.25); }
                  50% { transform: scaleY(1); }
                }
                .audio-visualizer-bar {
                  transform-origin: bottom;
                  transition: transform 0.2s ease, background-color 0.2s ease;
                }
                .audio-visualizer-bar.playing {
                  animation: pulse-wave 1s ease-in-out infinite alternate;
                }
              `,
              }}
            />

            {/* Poster Background Art & Ambient Glow */}
            {post.thumbnail_url ? (
              <>
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-30 blur-md scale-105 pointer-events-none transition-opacity duration-700 group-hover:opacity-40"
                  style={{ backgroundImage: `url(${post.thumbnail_url})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080d11] via-[#080d11]/80 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-whatsapp-green/10 via-transparent to-transparent pointer-events-none" />
            )}

            <div className="relative z-10 p-5 flex flex-col justify-between min-h-[220px]">
              {/* Header: Tag de Categoria + Duração */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-whatsapp-green/15 text-whatsapp-green border border-whatsapp-green/30 backdrop-blur-md flex items-center gap-1.5">
                    <Mic className="w-3 h-3" /> Áudio
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-gray-300 border border-white/10 backdrop-blur-md">
                    {post.metadata?.category || "Devocional"}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] font-mono font-medium text-gray-400 bg-black/40 px-2.5 py-1 rounded-full border border-white/5">
                  <span>{mounted && audioRef?.current ? fmtTime(audioRef.current.currentTime) : "0:00"}</span>
                  <span className="text-gray-600">/</span>
                  <span>{mounted && audioRef?.current && audioRef.current.duration && !isNaN(audioRef.current.duration) ? fmtTime(audioRef.current.duration) : "-:--"}</span>
                </div>
              </div>

              {/* Centro: Thumbnail + Título + Botão de Play de Destaque */}
              <div className="flex items-center justify-between gap-4 my-auto">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-14 h-14 shrink-0 rounded-2xl overflow-hidden bg-black/50 border border-white/15 shadow-xl flex items-center justify-center relative">
                    {post.thumbnail_url ? (
                      <img src={post.thumbnail_url} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal/80 to-whatsapp-green/60 flex items-center justify-center">
                        <Music className="w-7 h-7 text-white" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    {post.metadata?.title || post.content ? (
                      <h4 className="text-white font-bold text-base tracking-tight truncate leading-tight">
                        {post.metadata?.title || post.content}
                      </h4>
                    ) : null}
                    <p className="text-whatsapp-green text-xs font-semibold truncate mt-0.5">
                      {post.metadata?.artist || post.author?.full_name || "Membro FéConecta"}
                    </p>
                  </div>
                </div>

                {/* Botão de Play Circular Glow */}
                <button
                  onClick={toggleAudio}
                  className="w-12 h-12 shrink-0 rounded-full bg-whatsapp-green text-black flex items-center justify-center shadow-[0_0_20px_rgba(37,211,102,0.45)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title={isPlaying ? "Pausar" : "Ouvir"}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 fill-black" />
                  ) : (
                    <Play className="w-5 h-5 fill-black ml-0.5" />
                  )}
                </button>
              </div>

              {/* Rodapé: Equalizador Waveform Rítmico Interativo */}
              <div 
                className="mt-5 w-full h-10 bg-black/40 backdrop-blur-md rounded-xl px-3 py-1 flex items-center justify-between gap-[3px] border border-white/5 cursor-pointer"
                onClick={(e) => {
                  if (audioRef.current && audioRef.current.duration) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    audioRef.current.currentTime = percent * audioRef.current.duration;
                  }
                }}
              >
                {[...Array(36)].map((_, i) => {
                  const isPassed = audioProgress > (i / 36) * 100;
                  // Variação orgânica de altura para o equalizador
                  const baseHeights = [8, 14, 20, 10, 24, 16, 12, 28, 18, 10, 22, 14, 26, 12, 18, 24, 14, 8, 20, 16, 28, 12, 18, 22, 10, 14, 20, 8, 16, 24, 12, 18, 10, 14, 8, 6];
                  const heightPx = baseHeights[i % baseHeights.length];

                  return (
                    <div
                      key={i}
                      className={cn(
                        "w-[3px] rounded-full audio-visualizer-bar pointer-events-none",
                        isPlaying && "playing",
                        isPassed ? "bg-whatsapp-green shadow-[0_0_8px_rgba(37,211,102,0.6)]" : "bg-white/20"
                      )}
                      style={{
                        height: `${heightPx}px`,
                        animationDelay: `${(i * 0.04).toFixed(2)}s`,
                        animationDuration: `${0.6 + (i % 5) * 0.1}s`,
                      }}
                    />
                  );
                })}
              </div>
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
