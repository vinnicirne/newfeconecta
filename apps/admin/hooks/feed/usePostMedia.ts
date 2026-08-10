import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export function usePostMedia(post: any, isVideo: boolean, onUpdated?: (post: any) => void) {
  const [viewsCount, setViewsCount] = useState(Number(post.views_count) || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [audioProgress, setAudioProgress] = useState(0);
  
  const hasViewedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setViewsCount(Number(post.views_count) || 0);
  }, [post.views_count]);

  const handlePlayMedia = async () => {
    if (hasViewedRef.current) return;
    hasViewedRef.current = true;

    const newCount = viewsCount + 1;
    setViewsCount(newCount);

    try {
      const { error: rpcError } = await supabase.rpc("increment_view", {
        p_post_id: post.id,
      });
      // Fallback: se a RPC não existir no banco, usa update direto
      if (rpcError) {
        await supabase
          .from("posts")
          .update({ views_count: newCount })
          .eq("id", post.id);
      }
      onUpdated?.({ ...post, views_count: newCount });
    } catch (e) {
      console.error("Erro ao computar visualização", e);
    }
  };

  useEffect(() => {
    if (!videoRef.current || !isVideo) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => {});
          } else {
            if (videoRef.current) {
              videoRef.current.pause();
              videoRef.current.muted = true; // Força mute ao sair
            }
            setIsMuted(true);
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.5 } // Só dá play se 50% do vídeo estiver visível
    );

    observer.observe(videoRef.current);

    return () => {
      observer.disconnect();
    };
  }, [isVideo]);

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
        handlePlayMedia(); // Aciona o gatilho viral
      }
      setIsPlaying(!isPlaying);
    }
  };

  const fmtTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    viewsCount, setViewsCount,
    isPlaying, setIsPlaying,
    isMuted, setIsMuted,
    audioProgress, setAudioProgress,
    audioRef, videoRef,
    handlePlayMedia, toggleAudio, fmtTime
  };
}
