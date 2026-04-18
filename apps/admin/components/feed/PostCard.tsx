"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { Flame, MessageCircle, Share2, MoreHorizontal, Pencil, Trash2, Repeat, Play, Pause, Bookmark, Eye, Sparkles, Quote, Volume2, VolumeX, ArrowUpRight, ShieldAlert } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import CommentsSection from './CommentsSection';
import { supabase } from '@/lib/supabase';
import moment from 'moment';
import 'moment/locale/pt-br';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { toast } from 'sonner';
import { VerificationBadge } from '@/components/verification-badge';
import { NotificationService } from '@/lib/notifications';
import { useRouter } from 'next/navigation';

import { BIBLE_BOOKS } from '@/lib/bible-data';

// Ensure moment is in PT-BR
moment.locale('pt-br');
let audioContext: AudioContext | null = null;
const SILENCE_B64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA== "; // Silêncio mínimo real

const startSilenceLoop = () => {
  try {
    let audio = document.getElementById('pwa-ghost-audio') as HTMLAudioElement;
    
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = 'pwa-ghost-audio';
      audio.loop = true;
      audio.volume = 0.001; // volume extremamente baixo
      audio.preload = 'auto';
      audio.src = SILENCE_B64; // mantenha seu base64
      document.body.appendChild(audio); // garanta que esteja no body
    }

    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }

    audio.play().catch(err => {
      console.warn("Ghost audio play falhou (esperado no background):", err);
    });

    console.log('👻 Ghost Audio (volume mínimo) reforçado');
  } catch (err) {
    console.error('Erro ghost audio:', err);
  }
};

// Componente Interno para Gerenciar o Player do YouTube com Estabilidade
function YouTubePlayer({ videoId, postId }: { videoId: string, postId: string }) {
  const playerRef = useRef<any>(null);
  const containerId = `yt-player-container-${postId}`;
  const [playerState, setPlayerState] = useState(-1); // -1: unstarted, 1: playing, 2: paused

  const togglePlay = () => {
    if (!playerRef.current || typeof playerRef.current.getPlayerState !== 'function') return;
    
    // Ativação por gesto (Crucial para Mobile)
    startSilenceLoop();

    const state = playerRef.current.getPlayerState();
    if (state === 1) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  useEffect(() => {
    let checkInterval: any;
    let keepAliveInterval: any;

    const setupMediaSession = () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: 'Vídeo no FéConecta', 
          artist: 'FéConecta',
          artwork: [
            { src: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, sizes: '1280x720', type: 'image/jpeg' },
            { src: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`, sizes: '320x180', type: 'image/jpeg' }
          ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
          playerRef.current?.playVideo();
          startSilenceLoop();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          playerRef.current?.pauseVideo();
        });
      }
    };

    const initPlayer = () => {
      const YT = (window as any).YT;
      if (YT && YT.Player) {
        clearInterval(checkInterval);
        playerRef.current = new YT.Player(containerId, {
          videoId: videoId,
          playerVars: {
            playsinline: 1,
            modestbranding: 1,
            rel: 0,
            enablejsapi: 1,
            controls: 0,
            origin: window.location.origin,
            host: window.location.hostname,
            widget_referrer: window.location.origin
          },
          events: {
            'onReady': (event: any) => {
              event.target.setVolume(100);
            },
            'onStateChange': (event: any) => {
              setPlayerState(event.data);
              const YT_CONST = (window as any).YT;
              if (event.data === YT_CONST.PlayerState.PLAYING) {
                event.target.setVolume(100); // Reforço ao dar play
                startSilenceLoop();
                setupMediaSession();
                if ('mediaSession' in navigator) {
                  navigator.mediaSession.playbackState = 'playing';
                }
                
                if (keepAliveInterval) clearInterval(keepAliveInterval);
                keepAliveInterval = setInterval(() => {
                  startSilenceLoop();
                }, 5000);
                
              } else {
                if ('mediaSession' in navigator) {
                  navigator.mediaSession.playbackState = 'paused';
                }
                
                if (keepAliveInterval) {
                  clearInterval(keepAliveInterval);
                  keepAliveInterval = null;
                }
              }
            }
          }
        });
      }
    };

    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    checkInterval = setInterval(initPlayer, 500);

    // Listener de Visibilidade (Reforço para Background)
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && playerRef.current?.getPlayerState() === 1) {
        startSilenceLoop(); 
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(checkInterval);
      if (keepAliveInterval) clearInterval(keepAliveInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [videoId, containerId, postId]);

  return (
    <div className="rounded-3xl overflow-hidden aspect-video bg-black mt-2 shadow-lg border border-white/10 relative group border-2 border-whatsapp-teal/10">
      <div id={containerId} className="w-full h-full pointer-events-none scale-[1.01]" />
      
      <div 
        onClick={togglePlay}
        className="absolute inset-0 z-20 cursor-pointer flex items-center justify-center transition-all bg-black/0 hover:bg-black/5"
      >
        {(playerState !== 1) && (
          <div className="w-16 h-16 rounded-full bg-whatsapp-teal/20 backdrop-blur-md flex items-center justify-center border border-whatsapp-teal/30 scale-100 group-hover:scale-110 transition-transform">
             <Play className="w-8 h-8 text-whatsapp-teal fill-current ml-1" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostCard({ post, currentUser, onDeleted, onUpdated }: any) {
  const [showComments, setShowComments] = useState(false);
  const [likes, setLikes] = useState<string[]>(Array.isArray(post.likes) ? post.likes : []);
  const [isExpanded, setIsExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const router = useRouter();
 
  // Higienização Atômica: Trata strings "null" como nulo real
  const mediaUrl = (post.media_url === 'null' || !post.media_url) ? null : post.media_url;
  const postType = post.post_type === 'null' ? 'text' : post.post_type;

  const isLegacyMedia = useMemo(() => {
    if (!mediaUrl) return false;
    const fileName = mediaUrl.split('/').pop() || "";
    return !fileName.includes('.');
  }, [mediaUrl]);
 
  // Se a mídia for legada ou der erro, apenas marcamos para não renderizar a mídia, 
  // mas mantemos o PostCard vivo para mostrar o conteúdo e YouTube.
  const shouldSkipMedia = mediaError || isLegacyMedia;


  const getYoutubeId = (url: string) => {
    // RegEx Universal para capturar ID de 11 caracteres (YouTube Desktop, Mobile, Shorts e Embed)
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
    const match = url.match(regExp);
    return (match && match[1]) ? match[1] : null;
  };

  // VIEWS FEATURE
  const [viewsCount, setViewsCount] = useState(Number(post.views_count) || 0);
  const hasViewedRef = useRef(false);

  useEffect(() => {
    setViewsCount(Number(post.views_count) || 0);
  }, [post.views_count]);

  const handlePlayMedia = async () => {
    if (hasViewedRef.current) return;
    hasViewedRef.current = true;

    setViewsCount(prev => prev + 1);

    try {
      // await supabase.rpc('increment_view', { p_post_id: post.id });
      onUpdated?.({ ...post, views_count: viewsCount + 1 });
    } catch (e) {
      console.error("Erro ao computar visualização", e);
    }
  };

  const [repostsCount, setRepostsCount] = useState(Number(post.reposts_count) || 0);

  useEffect(() => {
    setRepostsCount(Number(post.reposts_count) || 0);
  }, [post.reposts_count]);

  const [isReposted, setIsReposted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const userId = currentUser?.id;
  const isLiked = userId ? likes.includes(userId) : false;
  const isAuthor = post.author_id === userId;
  const isAdmin = currentUser?.role === 'admin';
  const isOwner = isAuthor || isAdmin;

  // Áudio
  const isAudio = postType === 'audio' ||
    post.media_type === 'audio' ||
    mediaUrl?.match(/\.(mp3|wav|m4a|ogg|aac|flac|opus|weba)/i);

  const isVideo = postType === 'video' ||
    post.media_type === 'video' ||
    mediaUrl?.match(/\.(mp4|webm|mov|mkv)/i);

  const isShortText = post.content && post.content.length < 90 && !post.content.includes('\n') && !mediaUrl;
  const urlMatch = post.content?.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/);
  const hasExternalMedia = !!urlMatch;
  const isMediaPost = !!(mediaUrl || isVideo || isAudio || hasExternalMedia);
  const isVerseRepost = post.type === 'repost_verse' || !!post.content?.startsWith('📖');
  const isDFCH = !!(post.content?.startsWith('📖') || post.is_testimony) || isVerseRepost;

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
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const commentCount = Number(post.comments_count) || 0;
  const likeCount = likes?.length || 0;

  const checkIfSaved = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', userId)
      .maybeSingle();
    setIsSaved(!!data);
  };

  const checkIfReposted = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('reposts')
      .select('id')
      .eq('post_id', post.id)
      .eq('profile_id', userId)
      .maybeSingle();
    setIsReposted(!!data);
  };

  const checkIfFollowing = async () => {
    if (!userId || isOwner || !post.author_id) return;
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', post.author_id)
      .maybeSingle();
    setIsFollowing(!!data);
  };

  useEffect(() => {
    checkIfReposted();
    checkIfSaved();
    checkIfFollowing();

    // Sincronização Global de Seguidores (Real-time UI sync)
    const handleSync = (e: any) => {
      if (e.detail.userId === post.author_id) {
        setIsFollowing(e.detail.isFollowing);
      }
    };
    window.addEventListener('user-follow-changed', handleSync);
    return () => window.removeEventListener('user-follow-changed', handleSync);
  }, [post.id, userId, post.author_id]);

  const toggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) { toast.error("Faça login para seguir"); return; }
    if (isOwner || !post.author_id) return;

    const oldFollowing = isFollowing;
    setIsFollowing(!oldFollowing);

    try {
      if (oldFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', userId)
          .eq('following_id', post.author_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: userId, following_id: post.author_id });
        if (error) throw error;

        await NotificationService.notify({
          recipientId: post.author_id,
          senderId: userId,
          type: 'follow'
        });
      }

      // Disparar evento para sincronizar outros PostCards do mesmo autor na tela
      window.dispatchEvent(new CustomEvent('user-follow-changed', {
        detail: { userId: post.author_id, isFollowing: !oldFollowing }
      }));
    } catch (err) {
      setIsFollowing(oldFollowing);
      toast.error('Erro ao atualizar seguidor.');
    }
  };

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) { toast.error("Faça login para salvar"); return; }

    const oldSaved = isSaved;
    setIsSaved(!oldSaved);
    try {
      if (oldSaved) {
        const { error } = await supabase.from('saved_posts').delete().eq('post_id', post.id).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('saved_posts').insert({ post_id: post.id, user_id: userId });
        if (error) throw error;
      }

    } catch (err) {
      setIsSaved(oldSaved);
      toast.error("Erro ao salvar publicação.");
    }
  };

  const toggleRepost = async () => {
    if (!userId) { toast.error("Faça login para republicar"); return; }

    const oldReposted = isReposted;
    const oldLocalCount = repostsCount;

    setIsReposted(!oldReposted);
    setRepostsCount(oldReposted ? Math.max(0, oldLocalCount - 1) : oldLocalCount + 1);

    try {
      if (oldReposted) {
        const { error } = await supabase
          .from('reposts')
          .delete()
          .eq('post_id', post.id)
          .eq('profile_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reposts')
          .insert({ post_id: post.id, profile_id: userId });
        if (error) throw error;

        const isVerse = isVerseRepost || !!post.content?.startsWith('📖');
        
        await NotificationService.notify({
          recipientId: post.author_id,
          senderId: userId,
          type: isVerse ? 'verse_day' : 'repost',
          postId: post.id,
          content: isVerse ? `recomendou a Palavra do Dia: "${post.content?.substring(0, 30)}..."` : undefined
        });
      }
      onUpdated?.({ ...post, reposts_count: oldReposted ? Math.max(0, oldLocalCount - 1) : oldLocalCount + 1 });
    } catch (err) {
      console.error("Error toggling repost:", err);
      setIsReposted(oldReposted);
      setRepostsCount(oldLocalCount);
      toast.error("Erro ao processar republicação.");
    }
  };

  const toggleLike = async () => {
    if (!userId) { toast.error("Faça login para curtir"); return; }

    const oldLikes = [...likes];
    const newLikes = isLiked
      ? likes.filter((id: string) => id !== userId)
      : [...likes, userId];

    setLikes(newLikes);

    try {
      const { error } = await supabase
        .from('posts')
        .update({ likes: newLikes })
        .eq('id', post.id);

      if (error) throw error;

      // Notificação Centralizada (Apenas se for novo Like)
      if (!isLiked) {
        await NotificationService.notify({
          recipientId: post.author_id,
          senderId: userId,
          type: 'like',
          postId: post.id
        });
      }

      onUpdated?.({ ...post, likes: newLikes, likes_count: newLikes.length, views_count: viewsCount });
    } catch (err) {
      console.error("Error updating likes:", err);
      setLikes(oldLikes); // revert exactly back to old array
      toast.error("Não foi possível curtir a publicação");
    }
  };

  const handleDoubleClickLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLiked) {
      toggleLike();
    }
    // Sempre mostrar animação no double click para feedback visual
    setShowLikeAnim(true);
    setTimeout(() => setShowLikeAnim(false), 800);
  };

  const handleDelete = async () => {
    toast("Deseja excluir esta publicação?", {
      action: {
        label: "Excluir",
        onClick: async () => {
          try {
            const { error } = await supabase
              .from('posts')
              .delete()
              .eq('id', post.id);

            if (error) throw error;

            toast.success("Publicação excluída!");
            onDeleted?.(post.id);
          } catch (err: any) {
            console.error("Error deleting post:", err);
            toast.error("Erro ao excluir publicação: " + err.message);
          }
        }
      }
    });
  };

  const handleShare = () => {
    const postUrl = window.location.origin + '/post/' + post.id;
    if (navigator.share) {
      navigator.share({ title: 'FéConecta Post', url: postUrl }).catch(console.error);
    } else {
      navigator.clipboard.writeText(postUrl);
      toast.success("Link copiado!");
    }
  };

  const handleReport = async () => {
    try {
      const { error } = await supabase.from('system_errors').insert({
        module: 'system',
        error_message: `[DENÚNCIA] Publicação ${post.id} sinalizada por conteúdo impróprio.`,
        user_id: currentUser?.id,
        metadata: { post_id: post.id, author: post.author_username, snippet: post.content?.substring(0, 100) }
      });
      if (error) throw error;
      toast.success("Denúncia enviada para análise da moderação.");
    } catch (err) {
      toast.error("Erro ao enviar denúncia.");
    }
  };

  const renderContent = (content: string) => {
    if (!content) return null;

    const rawContent = isVerseRepost 
      ? content.replace(/📖\s*Recomendo a\s*Palavra do Dia:\s*/i, '').replace(/""/g, '"').replace(/"/g, '').trim() 
      : content;

    const MAX_CHAR = 240;
    const shouldTruncate = rawContent.length > MAX_CHAR && !isExpanded;
    const displayContent = shouldTruncate ? rawContent.substring(0, MAX_CHAR) + '...' : rawContent;

    const parts = displayContent.split(/(#[\wáàâãéèêíïóôõöúç-]+|@[\w.-]+|https?:\/\/[^\s]+|www\.[^\s]+|\n)/g);

    const urlMatch = displayContent.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/);
    const previewUrl = urlMatch ? urlMatch[0] : null;

    return (
      <>
        {parts.map((part: string, i: number) => {
          const trimmed = part.trim();
          if (part === '\n' || part === '\r\n') return <br key={i} />;

          // Oculta o link se ele já estiver sendo exibido no Card/Vídeo abaixo
          if (trimmed === previewUrl) return null;

          if (trimmed.startsWith('#')) {
            const tag = trimmed.substring(1);
            return (
              <Link
                key={i}
                href={`/explore/${tag}`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="text-whatsapp-teal dark:text-whatsapp-green hover:underline cursor-pointer font-medium"
              >
                {part}
              </Link>
            );
          }

          if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('www.')) {
            const url = trimmed.startsWith('www.') ? `https://${trimmed}` : trimmed;
            return (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="text-whatsapp-teal dark:text-whatsapp-green hover:underline break-all"
              >
                {part}
              </a>
            );
          }

          if (trimmed.startsWith('@')) {
            const username = trimmed.substring(1);
            return (
              <Link
                key={i}
                href={`/profile/${username}`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="text-whatsapp-teal dark:text-whatsapp-green hover:underline font-bold"
              >
                {part}
              </Link>
            );
          }

          return part;
        })}

        {content.length > MAX_CHAR && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="text-whatsapp-teal dark:text-whatsapp-green font-bold ml-1 hover:underline text-xs uppercase"
          >
            {isExpanded ? 'Ver menos' : 'Ver mais'}
          </button>
        )}
      </>
    );
  };

  if (mediaError) return null;

  return (
    <div
      id={`post-${post.id}`}
      className="bg-white dark:bg-whatsapp-darkLighter border border-gray-100 dark:border-white/5 rounded-2xl mx-4 mb-4 shadow-sm overflow-hidden transition-all duration-300"
    >
      {/* Header */}
      {post.is_repost && (
        <div className="px-4 pt-2 -mb-1 flex items-center gap-1.5 text-[10px] text-whatsapp-green font-bold uppercase tracking-wider">
          <Repeat className="w-3 h-3" />
          <span>{post.reposted_by_name || 'Alguém'} republicou</span>
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/profile/${post.author_username}`} className="w-9 h-9 rounded-full overflow-hidden bg-muted flex-shrink-0 border border-gray-100 dark:border-white/10 hover:opacity-80 transition-opacity">
          {post.author_avatar ? (
            <img src={post.author_avatar} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-whatsapp-tealLight flex items-center justify-center text-white font-bold text-xs">
              {(post.author_name || 'U')[0]}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <Link href={`/profile/${post.author_username}`} className="block group/name">
            <div
              className="text-sm font-bold leading-tight truncate flex items-center gap-1.5 transition-colors"
              style={{ color: post.is_verified ? '#ffffff' : undefined }}
            >
              {post.author_name}
              <VerificationBadge
                role={post.verification_label || 'Verificado'}
                size="sm"
                className="ml-1"
              />
            </div>
          </Link>
          <div className="flex items-center gap-1.5">
            <Link href={`/profile/${post.author_username}`} className="text-[10px] text-whatsapp-teal dark:text-whatsapp-green font-medium hover:underline">
              @{post.author_username}
            </Link>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">•</span>
            <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">
              {mounted ? moment(post.created_date || post.created_at).fromNow() : '...'}
            </p>
          </div>
        </div>

        {!isAuthor && (
          <button
            onClick={toggleFollow}
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border transition-all active:scale-95",
              isFollowing
                ? "border-gray-300 dark:border-white/20 text-gray-400 dark:text-gray-500"
                : "border-whatsapp-teal text-whatsapp-teal dark:border-whatsapp-green dark:text-whatsapp-green hover:bg-whatsapp-teal hover:text-white dark:hover:bg-whatsapp-green dark:hover:text-whatsapp-dark"
            )}
          >
            {isFollowing ? 'Seguindo' : 'Seguir'}
          </button>
        )}



        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all">
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar
            </DropdownMenuItem>
            {isOwner && (
              <>
                <DropdownMenuItem onClick={() => toast.info("Edição em breve")} className="text-blue-500">
                  <Pencil className="w-4 h-4 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete} className="text-red-500">
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </>
            )}
            {!isOwner && (
              <DropdownMenuItem onClick={handleReport} className="text-orange-500">
                <ShieldAlert className="w-4 h-4 mr-2" /> Denunciar Publicação
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* YouTube Embed / Link Preview */}
      {!isVideo && !isAudio && (!mediaUrl || shouldSkipMedia) && post.content && (
        <div className="px-3 pb-0">
          {(() => {
            const urlMatch = post.content.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/);
            if (!urlMatch) return null;
            const url = urlMatch[0];
            const youtubeId = getYoutubeId(url);

            if (youtubeId) {
              return (
                <YouTubePlayer 
                  videoId={youtubeId} 
                  postId={post.id} 
                />
              );
            }



            return (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col rounded-2xl border border-gray-100 dark:border-white/10 overflow-hidden bg-gray-50/50 dark:bg-white/5 mt-2 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors group"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-whatsapp-teal/10 dark:bg-whatsapp-green/10 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5 text-whatsapp-teal dark:text-whatsapp-green" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold dark:text-white truncate">Link Compartilhado</p>
                      <p className="text-[10px] text-gray-500 truncate">{url}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-whatsapp-green transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </a>
            );
          })()}
        </div>
      )}

      {/* Imagem */}
      {mediaUrl && !shouldSkipMedia &&
        (postType === 'image' ||
          postType === 'photo' ||
          post.media_type === 'image') && (
          <div
            className="rounded-2xl overflow-hidden mt-3 border border-white/10 cursor-zoom-in relative group"
            onClick={() => setLightboxUrl(mediaUrl)}
            onDoubleClick={handleDoubleClickLike}
          >
            <img
              src={mediaUrl}
              className="w-full h-auto object-cover max-h-[520px] transition-transform duration-500 group-hover:scale-[1.02]"
              alt="Imagem do post"
              onError={() => setMediaError(true)}
            />

            {/* Like Animation Overlay */}
            {showLikeAnim && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <Flame className="w-24 h-24 text-orange-500 fill-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.6)] animate-in zoom-in duration-300 animate-out fade-out fade-mode-forwards" />
                <Flame className="absolute w-24 h-24 text-orange-500/50 animate-ping duration-700" />
              </div>
            )}
          </div>
        )}

      {/* Vídeo / Lumes (Instagram Style) */}
      {mediaUrl && isVideo && !shouldSkipMedia && (
        <div
          className="rounded-2xl overflow-hidden mt-3 h-[450px] bg-black/95 relative group cursor-pointer border border-white/5 mx-auto max-w-[340px] shadow-2xl"
          onClick={() => router.push(`/lumes?id=${post.id}`)}
          onDoubleClick={handleDoubleClickLike}
        >
          <video
            className="w-full h-full object-cover"
            src={mediaUrl}
            muted={isMuted}
            autoPlay
            loop
            playsInline
            crossOrigin="anonymous"
            onPlay={handlePlayMedia}
            onError={(e) => {
              console.warn("⚠️ [PostCard] Erro ao carregar mídia. Verifique a URL:", post.media_url);
              setMediaError(true);
            }}
          />

          {/* Toggle de Áudio Flutuante */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className="absolute bottom-4 right-4 z-[40] w-9 h-9 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/80 active:scale-90 transition-all shadow-lg"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 fill-white" />}
          </button>

          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

          {/* Like Animation for Video */}
          {showLikeAnim && (
            <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <Flame className="w-24 h-24 text-orange-500 fill-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.6)] animate-in zoom-in spin-in duration-300" />
            </div>
          )}
        </div>
      )}

      {/* Áudio */}
      {isAudio && mediaUrl && !shouldSkipMedia && (
        <div className="bg-[#111b21] p-4 rounded-2xl border border-white/5 shadow-2xl mt-3 overflow-hidden relative group transition-all hover:bg-[#182229]">
          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes audio-wave-anim {
                0%, 100% { height: 6px; }
                50% { height: 24px; }
              }
              .wave-bar-anim { animation: audio-wave-anim 0.8s ease-in-out infinite; }
            `}} />

          <div className="flex items-center gap-4 relative z-10">
            <button
              onClick={toggleAudio}
              className="w-11 h-11 rounded-full bg-whatsapp-teal flex items-center justify-center shadow-lg shadow-whatsapp-teal/20 transition-transform active:scale-90 hover:scale-105"
            >
              {isPlaying ? <Pause className="w-5 h-5 text-white fill-white" /> : <Play className="w-5 h-5 text-white fill-white ml-0.5" />}
            </button>

            <div className="flex-1 flex items-center gap-[3px] h-10">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-[3px] rounded-full transition-all duration-300",
                    isPlaying ? "wave-bar-anim bg-whatsapp-teal" : "h-[6px] bg-whatsapp-teal/30"
                  )}
                  style={{
                    animationDelay: `${i * 0.05}s`,
                    backgroundColor: audioProgress > (i / 30) * 100 ? '#00A884' : undefined,
                    opacity: audioProgress > (i / 30) * 100 ? 1 : 0.3
                  }}
                />
              ))}
            </div>

            <span className="text-[11px] font-mono text-gray-400 min-w-[38px] text-right">
              {mounted && audioRef.current ? fmtTime(audioRef.current.currentTime) : "0:00"}
            </span>
          </div>

          <audio
            ref={audioRef}
            src={mediaUrl}
            crossOrigin="anonymous"
            preload="metadata"
            onTimeUpdate={() => audioRef.current && setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100)}
            onEnded={() => { setIsPlaying(false); setAudioProgress(0); }}
            onError={() => {
              console.warn("⚠️ [PostCard] Erro ao carregar áudio:", post.media_url);
              setMediaError(true);
            }}
            className="hidden"
          />
        </div>
      )}

      {/* Legenda (Abaixo da Mídia) */}
      {post.content && (
        <div className={cn("px-4", (!isMediaPost || isDFCH) && !mediaUrl ? "py-10" : "pb-3 pt-0 -mt-1.5")}>
          <div
            className={cn(
              isShortText || isDFCH ? "text-[24px] font-black leading-[1.1] tracking-tight" : "text-[17px] font-medium leading-relaxed",
              "whitespace-pre-wrap break-words transition-all mb-1",
              isMediaPost && !isDFCH ? "text-left" : "text-center",
              (post.background || (isDFCH && !mediaUrl)) && "min-h-[240px] flex items-center justify-center p-10 rounded-3xl m-1 text-center shadow-xl border border-white/5 bg-gray-50/5 dark:bg-zinc-900/50",
              isVerseRepost && "bg-gradient-to-br from-indigo-900 via-purple-900 to-zinc-900 border-indigo-500/30 text-white min-h-[300px] flex-col gap-4 italic font-serif"
            )}
            style={{ background: post.background || undefined }}
          >
            {isVerseRepost && (
               <div className="flex flex-col items-center gap-3 mb-6 not-italic font-sans">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 shadow-xl mb-2">
                    <Sparkles className="w-6 h-6 text-whatsapp-green animate-pulse" />
                  </div>
                  <h2 className="text-sm font-black uppercase tracking-[0.3em] text-whatsapp-green drop-shadow-sm">
                    Palavra do Dia
                  </h2>
                  <div className="w-12 h-0.5 bg-whatsapp-green/30 rounded-full" />
               </div>
            )}
            
            <span className={cn(
              post.background || isVerseRepost ? "text-white drop-shadow-md" : "text-gray-900 dark:text-gray-100",
              isVerseRepost ? "text-xl md:text-2xl font-serif italic leading-tight" : ""
            )}>
              {(() => {
                let text = post.content;
                if (isVerseRepost) {
                  text = text.replace(/📖\s*Recomendo a\s*Palavra do Dia:\s*/i, '')
                             .replace(/""/g, '"')
                             .replace(/^"|"$|^“|”$/g, '')
                             .replace(/^\[Versículo\]\s*/i, '')
                             .trim();
                  
                  const parts = text.split(/ — | —|— | - /);
                  if (parts.length > 1) {
                    const verseText = parts[0].trim();
                    const reference = parts[1].trim();
                    return (
                      <div className="flex flex-col items-center gap-5">
                        <span>{renderContent(`"${verseText}"`)}</span>
                        <span className="text-sm md:text-lg font-sans font-black uppercase tracking-[0.2em] text-whatsapp-green/90 not-italic pb-2">
                          {reference}
                        </span>
                      </div>
                    );
                  }
                }
                return renderContent(text);
              })()}
            </span>

            {isVerseRepost && (
               <button 
                 onClick={() => {
                   let refCode = post.metadata?.bible_ref;
                   
                   if (!refCode && post.content) {
                     // 1. Pega a parte final do texto (após o último — ou -)
                     const parts = post.content.split(/[—–-]/);
                     if (parts.length > 1) {
                        const rawRef = parts[parts.length - 1].trim(); // Ex: "Romanos 12:2"
                        
                        // 2. Extrai livro, capítulo e versículo
                        // Regex que suporta livros com números: "1 João 3:16"
                        const match = rawRef.match(/^((?:\d\s*)?[a-záàâãéèêíïóôõöúç\s]+)\s+(\d+)(?::(\d+))?/i);
                        
                        if (match) {
                           const bName = match[1].trim().toLowerCase();
                           const chapter = match[2];
                           const verse = match[3] || '1';
                           
                           // 3. Busca o livro na base
                           const book = BIBLE_BOOKS.find(b => 
                              b.name.toLowerCase() === bName || 
                              b.name.toLowerCase().replace(/\s/g, '') === bName.replace(/\s/g, '') ||
                              bName.startsWith(b.name.toLowerCase().substring(0, 4))
                           );
                           
                           if (book) {
                              refCode = `${book.abbrev}${chapter}:${verse}`;
                           }
                        }
                     }
                   }
                   
                   // Fallback seguro se tudo falhar, mas com a nova lógica deve pegar rm12:2
                   const finalRef = refCode || 'mc1:1';
                   router.push(`/bible?verse=${finalRef}`);
                 }}
                 className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-[10px] font-black uppercase tracking-widest text-white transition-all active:scale-95 not-italic font-sans"
               >
                 Ler capítulo completo
               </button>
            )}
          </div>
        </div>
      )}

      {/* Interactions */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-gray-50 dark:border-white/5 mt-2">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleLike}
            className={cn(
              "flex items-center gap-1.5 transition-all active:scale-125",
              isLiked ? "text-orange-500" : "text-gray-500 dark:text-gray-400"
            )}
          >
            <Flame className={cn("w-5 h-5", isLiked && "fill-orange-500")} />
            <span className="text-xs font-bold">{likes.length || 0}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-whatsapp-teal transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs font-bold">{commentCount}</span>
          </button>

          <button
            onClick={toggleRepost}
            className={cn(
              "flex items-center gap-1.5 transition-all active:scale-125",
              isReposted ? "text-whatsapp-green" : "text-gray-500 dark:text-gray-400"
            )}
          >
            <Repeat className="w-5 h-5" />
            <span className="text-xs font-bold">{repostsCount}</span>
          </button>

          {(isAudio || isVideo) && (
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-white/10 pl-4 ml-1">
              <Eye className="w-5 h-5" />
              <span className="text-xs font-bold">{viewsCount}</span>
            </div>
          )}
        </div>

        <button
          onClick={toggleSave}
          className={cn(
            "flex items-center gap-1.5 transition-all active:scale-125",
            isSaved ? "text-whatsapp-teal" : "text-gray-500 dark:text-gray-400 font-bold"
          )}
        >
          <Bookmark className={cn("w-5 h-5", isSaved && "fill-whatsapp-teal")} />
          <span className="text-[10px] uppercase">{isSaved ? 'Salvo' : 'Salvar'}</span>
        </button>
      </div>

      {showComments && <CommentsSection postId={post.id} postAuthorId={post.author_id} user={currentUser} />}

      {/* Lightbox / Media Expansion */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300"
          onClick={() => setLightboxUrl(null)}
        >
          {/* Top Bar: Author Info & Close */}
          <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
                <img src={post.author_avatar || "https://github.com/shadcn.png"} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <div className="font-black text-sm text-white truncate">{post.author_name}</div>
                  {post.is_verified && (
                    <VerificationBadge
                      role={post.verification_label || 'Verificado'}
                      size="xs"
                    />
                  )}
                </div>
                <span className="text-[10px] text-whatsapp-green font-bold uppercase tracking-tighter">@{post.author_username}</span>
              </div>
            </div>
            <button
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-md border border-white/10"
              onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
            >
              <span className="text-xl">✕</span>
            </button>
          </div>

          <div className="relative max-w-full max-h-[80vh] flex items-center justify-center p-4">
            <img
              src={lightboxUrl}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in duration-300 pointer-events-auto cursor-default"
              alt="Expanded view"
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClickLike(e); }}
            />

            {/* Double Click Like Animation in Lightbox */}
            {showLikeAnim && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <Flame className="w-32 h-32 text-orange-500 fill-orange-500 drop-shadow-[0_0_30px_rgba(249,115,22,0.8)] animate-in zoom-in duration-300" />
                <Flame className="absolute w-32 h-32 text-orange-500/50 animate-ping duration-700" />
              </div>
            )}
          </div>

          {/* Floating Interaction Bar */}
          <div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl flex items-center gap-8 shadow-2xl animate-in slide-in-from-bottom duration-500"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); toggleLike(); }}
              className={cn(
                "flex flex-col items-center gap-1 transition-all active:scale-125",
                isLiked ? "text-orange-500" : "text-white"
              )}
            >
              <Flame className={cn("w-6 h-6", isLiked && "fill-orange-500")} />
              <span className="text-[10px] font-bold">{likes.length || 0}</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); setShowComments(true); }}
              className="flex flex-col items-center gap-1 text-white hover:text-whatsapp-teal transition-all"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-[10px] font-bold">{commentCount}</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); toggleRepost(); }}
              className={cn(
                "flex flex-col items-center gap-1 transition-all active:scale-125",
                isReposted ? "text-whatsapp-green" : "text-white"
              )}
            >
              <Repeat className="w-6 h-6" />
              <span className="text-[10px] font-bold">{repostsCount}</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); handleShare(); }}
              className="flex flex-col items-center gap-1 text-white hover:text-whatsapp-teal transition-all"
            >
              <Share2 className="w-6 h-6" />
              <span className="text-[10px] font-bold italic uppercase tracking-tighter">Share</span>
            </button>

            <div className="w-px h-8 bg-white/10 mx-2" />

            <button
              onClick={(e) => { e.stopPropagation(); toggleSave(e); }}
              className={cn(
                "flex flex-col items-center gap-1 transition-all active:scale-125",
                isSaved ? "text-whatsapp-teal" : "text-white"
              )}
            >
              <Bookmark className={cn("w-6 h-6", isSaved && "fill-whatsapp-teal")} />
              <span className="text-[10px] uppercase font-bold">{isSaved ? 'Salvo' : 'Save'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}