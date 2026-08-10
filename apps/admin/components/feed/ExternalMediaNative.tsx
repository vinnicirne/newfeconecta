"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

interface ExternalMediaNativeProps {
  url: string;
  className?: string;
  isActive?: boolean;
  showShields?: boolean;
}

export type PlatformType = "youtube_shorts" | "youtube_full" | "tiktok" | "kwai" | "instagram" | "unknown";

// Utilitário para extrair ID e plataforma
export const parseExternalMedia = (url: string): { platform: PlatformType; id: string | null } => {
  if (!url) return { platform: "unknown", id: null };

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/shorts\/|youtu\.be\/|youtube\.com\/watch\?v=)([^"&?\/\s]{11})/);
  if (ytMatch) {
    if (url.includes("/shorts/")) return { platform: "youtube_shorts", id: ytMatch[1] };
    return { platform: "youtube_full", id: ytMatch[1] };
  }

  // TikTok
  const tkMatch = url.match(/tiktok\.com\/.*video\/(\d+)/);
  if (tkMatch) {
    return { platform: "tiktok", id: tkMatch[1] };
  }


  // Kwai
  const kwaiMatch = url.match(/kwai-video\.com\/p\/([A-Za-z0-9]+)/) || url.match(/s\.kw\.ai\/p\/([A-Za-z0-9]+)/);
  if (kwaiMatch) {
    return { platform: "kwai", id: kwaiMatch[1] };
  }

  // Instagram
  const igMatch = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
  if (igMatch) {
    return { platform: "instagram", id: igMatch[1] };
  }

  return { platform: "unknown", id: null };
};

const ExternalMediaNative = React.memo(function ExternalMediaNative({ url, className, isActive = false, showShields = false }: ExternalMediaNativeProps) {
  const { platform, id } = useMemo(() => parseExternalMedia(url), [url]);

  React.useEffect(() => {
    if (platform === "instagram") {
      const scriptId = "instagram-embed-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "//www.instagram.com/embed.js";
        script.async = true;
        document.body.appendChild(script);
      } else if ((window as any).instgrm) {
        (window as any).instgrm.Embeds.process();
      }
    }
  }, [platform, id]);

  if (platform === "unknown" || !id) {
    return (
      <div className={cn("w-full h-full bg-zinc-900 flex flex-col items-center justify-center p-8 text-center text-white/40 text-[10px] font-black uppercase tracking-widest", className)}>
        Conteúdo Externo
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full bg-black relative flex items-center justify-center overflow-hidden", className)}>
      {platform === "youtube_shorts" && (
        <iframe
          className="w-full h-full pointer-events-auto"
          src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=${isActive ? '0' : '1'}&loop=1&controls=0&modestbranding=1&rel=0&playsinline=1&origin=${typeof window !== 'undefined' ? window.location.origin : ''}`}
          title="YouTube Shorts"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy" 
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      )}

      {platform === "youtube_full" && (
        <iframe
          className="w-full h-full pointer-events-auto"
          src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=0&controls=1&modestbranding=1&rel=0&playsinline=1`}
          title="YouTube Video"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy" 
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      )}

      {platform === "tiktok" && (
        <iframe
          className="w-full h-full border-none"
          src={`https://www.tiktok.com/embed/v2/${id}`}
          title="TikTok"
          frameBorder="0"
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          loading="lazy" 
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-popups allow-popups-to-escape-sandbox"
        />
      )}


      {platform === "kwai" && (
        <div className="w-full h-full flex flex-col items-center justify-center text-white bg-gradient-to-br from-[#FF7E00] to-[#FF4500] p-6 text-center">
          <p className="font-black text-xl mb-2 text-white">Vídeo do Kwai</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-white text-[#FF4500] font-bold rounded-full uppercase text-xs tracking-widest">
            Abrir no Kwai
          </a>
        </div>
      )}

      {platform === "instagram" && (
        <div className="w-full h-full bg-white flex items-center justify-center overflow-y-auto pointer-events-auto custom-scrollbar">
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={`https://www.instagram.com/reel/${id}/`}
            data-instgrm-version="14"
            style={{
              background: '#FFF',
              border: 0,
              margin: '1px',
              maxWidth: '540px',
              minWidth: '326px',
              padding: 0,
              width: 'calc(100% - 2px)'
            }}
          />
        </div>
      )}

      {/* Escudos de Proteção (Anti-Redirect & Anti-Branding) */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-[60px] z-[50] bg-transparent cursor-default transition-all",
        showShields ? "pointer-events-auto" : "pointer-events-none"
      )} onClick={(e) => e.stopPropagation()} />
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-[80px] z-[50] bg-transparent cursor-default transition-all",
        showShields ? "pointer-events-auto" : "pointer-events-none"
      )} onClick={(e) => e.stopPropagation()} />
      
      {/* Camada de Interação Invisível para scroll */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-transparent" />
    </div>
  );
});

export default ExternalMediaNative;
