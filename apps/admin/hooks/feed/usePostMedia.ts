import { useState, useEffect, useRef } from "react";
import { trackQualifiedPostView } from "@/lib/viewTracker";

export function usePostMedia(post: any, isVideo: boolean, onUpdated?: (post: any) => void) {
  const [viewsCount, setViewsCount] = useState(Number(post.views_count) || 0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [audioProgress, setAudioProgress] = useState(0);
  
  const dwellTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setViewsCount(Number(post.views_count) || 0);
  }, [post.views_count]);

  const handlePlayMedia = async () => {
    await trackQualifiedPostView(post.id, viewsCount, (newCount) => {
      setViewsCount(newCount);
      onUpdated?.({ ...post, views_count: newCount });
    });
  };

  useEffect(() => {
    if (!videoRef.current || !isVideo) return;
    
    // ⏱️ Padrão Big Tech: IntersectionObserver com Dwell Time de 2 segundos contínuos
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            videoRef.current?.play().catch(() => {});

            // Inicia o contador de 2 segundos de retenção qualificada
            if (!dwellTimerRef.current) {
              dwellTimerRef.current = setTimeout(() => {
                handlePlayMedia();
              }, 2000);
            }
          } else {
            // Cancelar o timer se o usuário rolar rápido antes de 2 segundos
            if (dwellTimerRef.current) {
              clearTimeout(dwellTimerRef.current);
              dwellTimerRef.current = null;
            }

            if (videoRef.current) {
              videoRef.current.pause();
              videoRef.current.muted = true; // Força mute ao sair
            }
            setIsMuted(true);
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.5 } // Pelo menos 50% do conteúdo visível na tela
    );

    observer.observe(videoRef.current);

    return () => {
      if (dwellTimerRef.current) {
        clearTimeout(dwellTimerRef.current);
      }
      observer.disconnect();
    };
  }, [isVideo, post.id, viewsCount]);

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
        handlePlayMedia();
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
