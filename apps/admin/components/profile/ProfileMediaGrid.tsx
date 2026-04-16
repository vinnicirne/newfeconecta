"use client";

import React from "react";
import { Grid, PlaySquare, Mic, Heart, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileMediaGridProps {
  view: string;
  userPosts: any[];
  likedPosts: any[];
  savedPosts: any[];
  setSelectedPost: (post: any) => void;
}

export function ProfileMediaGrid({ 
  view, 
  userPosts, 
  likedPosts, 
  savedPosts, 
  setSelectedPost 
}: ProfileMediaGridProps) {
  
  const renderGrid = (posts: any[], emptyIcon: any, emptyText: string) => {
    if (posts.length === 0) {
      return (
        <div className="col-span-3 py-20 flex flex-col items-center justify-center text-gray-500 gap-4 opacity-50">
          <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center">
            {React.createElement(emptyIcon, { className: "w-6 h-6" })}
          </div>
          <p className="text-[11px] font-black uppercase tracking-widest">{emptyText}</p>
        </div>
      );
    }

    return posts.map((post) => {
      const isVideo = (post.post_type === 'video' || post.media_url?.match(/\.(mp4|webm|mov|m4v)/i)) && !post.media_url?.match(/\.(mp3|wav|m4a|ogg|aac|flac|opus|weba)/i);
      const isAudio = post.post_type === 'audio' || post.media_url?.match(/\.(mp3|wav|m4a|ogg|aac|flac|opus|weba)/i);

      return (
        <div
          key={post.id}
          onClick={() => setSelectedPost(post)}
          className={cn(
            "relative group cursor-pointer overflow-hidden bg-gray-100 dark:bg-gray-900 border border-black/5 dark:border-white/5",
            view === 'lumes' ? "aspect-[9/16]" : "aspect-square"
          )}
        >
          {post.media_url ? (
            isAudio ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-whatsapp-dark to-[#111b21]">
                <div className="w-12 h-12 rounded-full bg-whatsapp-teal/20 flex items-center justify-center mb-2 animate-pulse">
                  <Mic className="w-6 h-6 text-whatsapp-teal" />
                </div>
              </div>
            ) : isVideo ? (
              <video 
                src={post.media_url} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                muted 
                playsInline 
              />
            ) : (
              <img
                src={post.media_url}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                alt=""
              />
            )
          ) : (() => {
            const youtubeMatch = post.content?.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]{11})/);
            const youtubeId = youtubeMatch ? youtubeMatch[1] : null;
            
            if (youtubeId) {
              return (
                <img
                  src={`https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  alt="YouTube Thumbnail"
                />
              );
            }

            // Gradients dinâmicos para posts de texto (Premium)
            const gradients = [
              'from-whatsapp-teal/20 via-whatsapp-teal/40 to-whatsapp-green/40',
              'from-indigo-500/20 via-blue-500/40 to-whatsapp-teal/40',
              'from-orange-500/20 via-rose-500/40 to-amber-500/40',
              'from-whatsapp-green/20 via-emerald-500/40 to-teal-500/40'
            ];
            const gradientIdx = (post.id?.charCodeAt(0) || 0) % gradients.length;

            return (
              <div className={cn(
                "absolute inset-0 flex items-center justify-center p-6 bg-gradient-to-br",
                gradients[gradientIdx],
                "backdrop-blur-sm border border-white/10"
              )}>
                <div className="absolute inset-0 bg-black/20" />
                <p className="relative z-10 text-[10px] text-white text-center uppercase font-black leading-relaxed tracking-wider drop-shadow-md line-clamp-4">
                  {post.content}
                </p>
              </div>
            );
          })()}

          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          {isVideo && (
             <div className="absolute top-2 right-2 z-10">
                <PlaySquare className="w-4 h-4 text-white drop-shadow-md" />
             </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="min-h-[400px]">
      {view === 'grid' && (
        <div className="grid grid-cols-3 gap-[2px]">
          {renderGrid(userPosts, Grid, "Nenhuma publicação")}
        </div>
      )}

      {view === 'lumes' && (
        <div className="grid grid-cols-3 gap-[2px]">
          {renderGrid(userPosts.filter(p => p.post_type === 'video' || p.media_url?.match(/\.(mp4|webm|mov|m4v)/i)), PlaySquare, "Nenhum Lume disponível")}
        </div>
      )}

      {view === 'likes' && (
        <div className="grid grid-cols-3 gap-[2px]">
          {renderGrid(likedPosts, Heart, "Nada curtido ainda")}
        </div>
      )}

      {view === 'saved' && (
        <div className="grid grid-cols-3 gap-[2px]">
          {renderGrid(savedPosts, Bookmark, "Nada salvo ainda")}
        </div>
      )}
    </div>
  );
}
