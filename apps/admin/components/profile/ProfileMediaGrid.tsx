"use client";

import React from "react";
import { Bookmark, Grid, Heart, Images, Mic, PlaySquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getPostCarouselUrls, getPostMediaInfo } from "@/utils/post-media";
import Image from "next/image";
import { VirtuosoGrid } from "react-virtuoso";

interface ProfileMediaGridProps {
  view: string;
  userPosts: any[];
  likedPosts: any[];
  savedPosts: any[];
  isLoading?: boolean;
  setSelectedPost: (post: any) => void;
}

export function ProfileMediaGrid({
  view,
  userPosts,
  likedPosts,
  savedPosts,
  isLoading = false,
  setSelectedPost
}: ProfileMediaGridProps) {
  const renderGrid = (posts: any[], emptyIcon: any, emptyText: string, gridClass = "grid grid-cols-3 gap-[2px]") => {
    if (isLoading && posts.length === 0) {
      return (
        <div className={gridClass} role="status" aria-label="Carregando publicações">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className={cn("animate-pulse bg-gray-200 dark:bg-white/10", view === "lumes" ? "aspect-[9/16]" : "aspect-square")} />
          ))}
        </div>
      );
    }

    if (posts.length === 0) {
      return (
        <div className="col-span-3 flex flex-col items-center justify-center gap-4 py-20 text-center text-gray-500">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-black/10 dark:border-white/10">
            {React.createElement(emptyIcon, { className: "h-6 w-6", "aria-hidden": true })}
          </div>
          <p className="text-xs font-semibold">{emptyText}</p>
        </div>
      );
    }

    return (
      <VirtuosoGrid
        useWindowScroll
        data={posts}
        listClassName={gridClass}
        itemContent={(_, post) => {
          const { isVideo, isAudio, isCarousel, mediaUrl, postType } = getPostMediaInfo(post);
          const carouselUrls = isCarousel ? getPostCarouselUrls(post) : [];
          const imageUrl = isCarousel ? carouselUrls[0] : mediaUrl;
          const isImage = Boolean(imageUrl && !isAudio && !isVideo && postType !== "external_media");
          const textPreview = String(post.content || "").trim();
          const label = isAudio
            ? `Abrir publicação de áudio${textPreview ? `: ${textPreview.slice(0, 80)}` : ""}`
            : isVideo
              ? `Abrir publicação de vídeo${textPreview ? `: ${textPreview.slice(0, 80)}` : ""}`
              : isImage
                ? `Abrir publicação com imagem${textPreview ? `: ${textPreview.slice(0, 80)}` : ""}`
                : `Abrir publicação de texto: ${textPreview.slice(0, 100) || "sem legenda"}`;

          return (
            <button
              key={post.id}
              type="button"
              onClick={() => setSelectedPost(post)}
              aria-label={label}
              title={label}
              className={cn(
                "group relative block w-full overflow-hidden border border-black/5 bg-gray-100 text-left focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-whatsapp-teal dark:border-white/5 dark:bg-gray-900",
                view === "lumes" ? "aspect-[9/16]" : "aspect-square"
              )}
            >
              {isImage && imageUrl ? (
                <Image
                  src={imageUrl}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 33vw, 220px"
                  loading="lazy"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  alt={textPreview ? `Imagem da publicação: ${textPreview.slice(0, 100)}` : "Imagem da publicação"}
                />
              ) : isVideo ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-800 to-whatsapp-teal/60">
                  {post.thumbnail_url ? (
                    <Image
                      src={post.thumbnail_url}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 33vw, 220px"
                      loading="lazy"
                      className="object-cover"
                      alt="Capa do vídeo"
                    />
                  ) : null}
                  <span className="relative z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
                    <PlaySquare className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
              ) : isAudio ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#101a20] via-[#15272b] to-whatsapp-teal/70 p-3 text-center text-white">
                  {post.thumbnail_url ? (
                    <Image
                      src={post.thumbnail_url}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 33vw, 220px"
                      loading="lazy"
                      className="object-cover opacity-35"
                      alt="Capa do áudio"
                    />
                  ) : null}
                  <Mic className="relative z-10 h-7 w-7" aria-hidden="true" />
                  <span className="relative z-10 line-clamp-3 text-xs font-semibold">
                    {post.metadata?.title || textPreview || "Publicação de áudio"}
                  </span>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-whatsapp-teal/20 via-slate-900 to-whatsapp-green/30 p-4 text-white">
                  <p className="line-clamp-6 whitespace-pre-wrap break-words text-center text-xs leading-relaxed">
                    {textPreview || "Publicação de texto"}
                  </p>
                </div>
              )}

              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-70 transition-opacity group-hover:opacity-100" />
              {isVideo && (
                <span className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-white" aria-hidden="true">
                  <PlaySquare className="h-4 w-4" />
                </span>
              )}
              {isAudio && (
                <span className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-1.5 text-white" aria-hidden="true">
                  <Mic className="h-4 w-4" />
                </span>
              )}
              {carouselUrls.length > 1 && (
                <span
                  className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur"
                  aria-label={`Carrossel temporariamente indisponível, ${carouselUrls.length} imagens`}
                  title="Carrossel temporariamente indisponível"
                >
                  <Images className="h-3.5 w-3.5" aria-hidden="true" />
                  {carouselUrls.length}
                </span>
              )}
            </button>
          );
        }}
      />
    );
  };

  return (
    <div className="min-h-[300px]">
      {view === "grid" && renderGrid(userPosts, Grid, "Nenhuma publicação ainda")}
      {view === "lumes" && renderGrid(userPosts.filter((post) => getPostMediaInfo(post).isVideo), PlaySquare, "Nenhum vídeo publicado ainda")}
      {view === "audio" && renderGrid(userPosts.filter((post) => getPostMediaInfo(post).isAudio), Mic, "Nenhum áudio publicado ainda")}
      {view === "likes" && renderGrid(likedPosts, Heart, "Você ainda não curtiu publicações")}
      {view === "saved" && renderGrid(savedPosts, Bookmark, "Você ainda não salvou publicações")}
    </div>
  );
}
