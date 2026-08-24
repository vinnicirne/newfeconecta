"use client";

import { useState, useEffect, useRef, Suspense, type MouseEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { Flame, MessageCircle, Share2, Volume2, VolumeX, Play, ArrowLeft, Repeat, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import CommentsSection from '@/components/feed/CommentsSection';
import { cn } from '@/lib/utils';
import { NotificationService } from '@/lib/notifications';
import ExternalMediaNative from '@/components/feed/ExternalMediaNative';
import { useTribo } from '@/hooks/useTribo';
import { useSearchParams } from 'next/navigation';

function TriboContent() {
  const searchParams = useSearchParams();
  const initialReelId = searchParams?.get('id');

  const [user, setUser] = useState<any>(null);
  const [current, setCurrent] = useState(0);
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [followingMap, setFollowingMap] = useState<{ [key: string]: boolean }>({});
  const [isPlaying, setIsPlaying] = useState(true);

  // 1. Motor de Dados Infinito
  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUser(profile);
      }
    };
    initAuth();
  }, []);

  const { reels, isLoading, loadMore, mutate } = useTribo(user?.id || null, initialReelId);

  // 2. Sincronização Global de Seguidores
  useEffect(() => {
    const handleGlobalSync = (e: any) => {
      setFollowingMap(prev => ({ ...prev, [e.detail.userId]: e.detail.isFollowing }));
    };
    window.addEventListener('user-follow-changed', handleGlobalSync);
    return () => window.removeEventListener('user-follow-changed', handleGlobalSync);
  }, []);

  // 3. Carregar Seguidores Iniciais do Usuário logado
  useEffect(() => {
    const fetchFollows = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
        if (data) {
          setFollowingMap(prev => {
            const newMap = { ...prev };
            data.forEach((f: any) => { newMap[f.following_id] = true; });
            return newMap;
          });
        }
      } catch (err) {
        // Ignorar erro silenciosamente
      }
    };
    fetchFollows();
  }, [user?.id]);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});

  // 4. Gerenciamento de Visibilidade (IntersectionObserver)
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const idx = Number((entry.target as HTMLElement).dataset.index);
          setCurrent(idx);
          setShowComments(false);
          
          if (idx >= reels.length - 3) {
            loadMore();
          }
        }
      });
    }, { threshold: 0.6 }); // 60% visível para considerar ativo

    const nodes = document.querySelectorAll('.reel-container');
    nodes.forEach(node => observer.observe(node));
    
    return () => observer.disconnect();
  }, [reels.length, loadMore]);

  // Limpeza em background (Pausar quando usuário minimizar App)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        Object.values(videoRefs.current).forEach(v => v && v.pause());
        setIsPlaying(false);
      } else {
        const v = videoRefs.current[current];
        if (v && isPlaying) {
          v.play().catch(() => setIsPlaying(false));
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [current, isPlaying]);

  // Gerenciamento de Mudo global
  useEffect(() => {
    Object.values(videoRefs.current).forEach(v => {
      if (v) v.muted = muted;
    });
  }, [muted]);

  // Autoplay atômico do vídeo ativo
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([idx, v]) => {
      if (!v) return;
      if (Number(idx) === current) {
        setIsPlaying(true);
        v.muted = muted;
        const playPromise = v.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => setIsPlaying(false));
        }
      } else {
        v.pause();
        // Em iOS é vital forçar o currentTime para zero ou apenas pausar já basta, pausar basta.
      }
    });
  }, [current, muted]); // 'reels' não precisa engatilhar autoplay, apenas a mudança de índice.

  const togglePlay = () => {
    const v = videoRefs.current[current];
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const toggleLike = async (reel: any) => {
    if (!user) return;
    // O RPC retorna is_liked (boolean) e likes_count (number), não um array
    const isLiked = reel.is_liked;
    const newCount = isLiked ? Math.max(0, (reel.likes_count || 0) - 1) : (reel.likes_count || 0) + 1;

    // 🚀 ATUALIZAÇÃO OTIMISTA usando os campos corretos do RPC
    mutate((currentPages: any) => currentPages.map((page: any) => page.map((r: any) =>
      r.id === reel.id ? { ...r, is_liked: !isLiked, likes_count: newCount } : r
    )), false);

    try {
      // Chamada atômica ao RPC
      const { data: isNowLiked, error } = await supabase.rpc("toggle_like", {
        p_post_id: reel.id,
        p_profile_id: user.id,
      });

      if (error) throw error;

      // Sincroniza o estado real com o retorno do banco
      mutate((currentPages: any) => currentPages.map((page: any) => page.map((r: any) =>
        r.id === reel.id ? { ...r, is_liked: isNowLiked } : r
      )), false);

      if (isNowLiked) {
        await NotificationService.notify({
          recipientId: reel.author_id,
          senderId: user.id,
          type: 'like',
          postId: reel.id
        });
      }
    } catch (err) {
      // Reversão em caso de falha
      mutate((currentPages: any) => currentPages.map((page: any) => page.map((r: any) =>
        r.id === reel.id ? { ...r, is_liked: isLiked, likes_count: reel.likes_count } : r
      )), false);
      toast.error("Não foi possível processar sua curtida");
    }
  };

  const toggleRepost = async (reel: any) => {
    if (!user) return;
    const isReposted = reel.is_reposted;

    mutate((currentPages: any) => currentPages.map((page: any) => page.map((r: any) => r.id === reel.id ? {
      ...r,
      is_reposted: !isReposted,
      reposts_count: (r.reposts_count || 0) + (isReposted ? -1 : 1)
    } : r)), false);

    try {
      if (isReposted) {
        await supabase.from('reposts').delete().eq('post_id', reel.id).eq('profile_id', user.id);
      } else {
        await supabase.from('reposts').insert({ post_id: reel.id, profile_id: user.id });
        toast.success("Republicado!");

        await NotificationService.notify({
          recipientId: reel.author_id,
          senderId: user.id,
          type: 'repost',
          postId: reel.id
        });
      }
    } catch (err) {
      mutate((currentPages: any) => currentPages.map((page: any) => page.map((r: any) => r.id === reel.id ? {
        ...r,
        is_reposted: isReposted,
        reposts_count: reel.reposts_count
      } : r)), false);
    }
  };

  const toggleSave = async (reel: any) => {
    if (!user) return;
    const isSaved = reel.is_saved;

    mutate((currentPages: any) => currentPages.map((page: any) => page.map((r: any) => r.id === reel.id ? { ...r, is_saved: !isSaved } : r)), false);

    try {
      if (isSaved) {
        await supabase.from('saved_posts').delete().eq('post_id', reel.id).eq('user_id', user.id);
      } else {
        await supabase.from('saved_posts').insert({ post_id: reel.id, user_id: user.id });
        toast.success("Salvo nos favoritos!");
      }
      
      // Atualiza o cache do perfil
      import('swr').then(({ mutate: globalMutate }) => {
         globalMutate(`profile_full:${user.id}`);
      });
    } catch (err) {
      mutate((currentPages: any) => currentPages.map((page: any) => page.map((r: any) => r.id === reel.id ? { ...r, is_saved: isSaved } : r)), false);
      toast.error("Erro ao salvar publicação");
    }
  };

  const toggleFollow = async (authorId: string) => {
    if (!user) { toast.error("Faça login para seguir"); return; }
    if (user.id === authorId) return;

    const isFollowing = !!followingMap[authorId];

    // Update local state immediately (Real-time feeling)
    setFollowingMap(prev => ({ ...prev, [authorId]: !isFollowing }));

    try {
      const { data: newStatus, error } = await supabase.rpc('toggle_follow', {
        p_follower_id: user.id,
        p_following_id: authorId
      });

      if (error) throw error;

      setFollowingMap(prev => ({ ...prev, [authorId]: newStatus }));

      if (newStatus) {
        await NotificationService.notify({
          recipientId: authorId,
          senderId: user.id,
          type: 'follow'
        });
      }

      // Sincronizar globalmente com outros componentes na tela
      window.dispatchEvent(new CustomEvent('user-follow-changed', {
        detail: { userId: authorId, isFollowing: newStatus }
      }));
    } catch (err) {
      setFollowingMap(prev => ({ ...prev, [authorId]: isFollowing }));
      toast.error("Erro ao processar seguimento");
    }
  };

  if (isLoading && reels.length === 0) return (
    <div className="fixed inset-0 flex items-center justify-center bg-black">
      <div className="w-12 h-12 border-4 border-whatsapp-green/20 border-t-whatsapp-green rounded-full animate-spin" />
    </div>
  );

  if (!isLoading && reels.length === 0) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white px-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
        <Flame className="w-8 h-8 text-whatsapp-green" />
      </div>
      <h2 className="text-xl font-bold">Nenhum vídeo na Tribo ainda</h2>
      <p className="text-sm text-gray-400 max-w-xs">
        Seja o primeiro a publicar um vídeo curto ou volte para o feed principal para ver mais publicações.
      </p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-full bg-whatsapp-green text-black font-bold text-sm hover:bg-whatsapp-greenLight transition-all active:scale-95 shadow-lg"
      >
        Voltar ao Feed
      </Link>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-zinc-950 dark:bg-black overflow-hidden select-none touch-none flex justify-center">
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar relative w-full sm:max-w-[450px] bg-black sm:border-x sm:border-white/5"
        style={{ scrollbarWidth: 'none' }}
      >

        {reels.map((reel, idx) => {
          return (
            <div
              key={reel.id}
              data-index={idx}
              className="relative w-full h-[100dvh] snap-start snap-always overflow-hidden reel-container"
              onClick={togglePlay}
            >
              {(() => {
                const isLiked = reel.is_liked;
                const isActive = current === idx;

                return (
                  <>
                    {reel.post_type === 'external_media' ? (
                      <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden bg-black flex items-center justify-center">
                        <div className="absolute top-1/2 left-1/2 w-full aspect-[9/16] -translate-x-1/2 -translate-y-[42%] transform scale-[1.35] origin-center">
                          {Math.abs(current - idx) <= 2 && <ExternalMediaNative url={reel.media_url} className="w-full h-full" />}
                        </div>
                      </div>
                    ) : (
                      Math.abs(current - idx) <= 2 ? (
                        <video
                          ref={el => { 
                            if (el) videoRefs.current[idx] = el;
                            else delete videoRefs.current[idx];
                          }}
                          src={reel.media_url}
                          autoPlay={isActive}
                          loop
                          playsInline
                          muted={muted}
                          onPlay={() => { if (isActive) setIsPlaying(true); }}
                          onPause={() => { if (isActive) setIsPlaying(false); }}
                          preload={isActive || Math.abs(current - idx) <= 1 ? "auto" : "none"}
                          poster={reel.thumbnail_url || undefined}
                          crossOrigin="anonymous"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div 
                          className="absolute inset-0 w-full h-full object-cover bg-black bg-center bg-cover" 
                          style={reel.thumbnail_url ? { backgroundImage: `url(${reel.thumbnail_url})` } : {}} 
                        />
                      )
                    )}

                    <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 via-black/20 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                    {!isPlaying && isActive && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center animate-out zoom-out-50 duration-300">
                          <Play className="w-10 h-10 text-white fill-white ml-2" />
                        </div>
                      </div>
                    )}

                    <div className="absolute bottom-32 left-4 right-20 z-10 space-y-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/profile/${reel.author_username}`}
                          onClick={(e: MouseEvent<HTMLAnchorElement>) => e.stopPropagation()}
                          className="group"
                        >
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white ring-2 ring-whatsapp-green ring-offset-2 ring-offset-black transition-transform group-active:scale-90">
                              {reel.author_avatar ? (
                                <img src={reel.author_avatar} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-whatsapp-green flex items-center justify-center text-white font-black">
                                  {(reel.author_name || 'U')[0]}
                                </div>
                              )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-whatsapp-green rounded-full border-2 border-black flex items-center justify-center">
                              <span className="text-[10px] text-black font-black">+</span>
                            </div>
                          </div>
                        </Link>
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <h3 className="text-white font-black text-sm drop-shadow-lg">@{reel.author_username}</h3>
                            {user?.id !== (reel.author_id || reel.user_id) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleFollow(reel.author_id || reel.user_id); }}
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold transition-all active:scale-90",
                                  followingMap[reel.author_id || reel.user_id]
                                    ? "bg-white/10 text-white/50 border border-white/10"
                                    : "bg-whatsapp-green text-black hover:bg-whatsapp-greenLight"
                                )}
                              >
                                {followingMap[reel.author_id || reel.user_id] ? 'Seguindo' : 'Seguir'}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-whatsapp-green animate-pulse" />
                            <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest leading-none">Original Audio</span>
                          </div>
                        </div>
                      </div>

                      {reel.content && (
                        <p className="text-white/90 text-[14px] leading-snug drop-shadow-md line-clamp-2 max-w-[85%] font-medium">
                          {reel.content}
                        </p>
                      )}
                    </div>

                    <div className="absolute right-4 bottom-32 z-20 flex flex-col items-center gap-6">
                      <button onClick={(e) => { e.stopPropagation(); toggleLike(reel); }} className="flex flex-col items-center gap-1 group">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center transition-all bg-white/10 backdrop-blur-xl border border-white/10 active:scale-125",
                          isLiked && "bg-orange-500/20 border-orange-500/50"
                        )}>
                          <Flame className={cn("w-6 h-6 transition-colors", isLiked ? 'text-orange-500 fill-orange-500' : 'text-white')} />
                        </div>
                        <span className="text-white text-[11px] font-black drop-shadow-md">{reel.likes_count || 0}</span>
                      </button>

                      <button onClick={(e) => { e.stopPropagation(); setShowComments(v => !v); }} className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center active:scale-90">
                          <MessageCircle className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-white text-[11px] font-black drop-shadow-md">{reel.comments_count || 0}</span>
                      </button>

                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const shareData = {
                            title: 'Tribo - FéConecta',
                            text: reel.content || 'Confira este conteúdo na Tribo do FéConecta!',
                            url: window.location.origin + '/tribo?id=' + reel.id
                          };
                          if (navigator.share) {
                            try { await navigator.share(shareData); } catch (err) { }
                          } else {
                            navigator.clipboard.writeText(shareData.url);
                            toast.success("Link da Tribo copiado!");
                          }
                        }}
                        className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center active:scale-90"
                      >
                        <Share2 className="w-6 h-6 text-white" />
                      </button>

                      <button onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center active:scale-90">
                        {muted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-whatsapp-green" />}
                      </button>

                      <button onClick={(e) => { e.stopPropagation(); toggleRepost(reel); }} className="flex flex-col items-center gap-1 group">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center transition-all bg-white/10 backdrop-blur-xl border border-white/10 active:scale-125",
                          reel.is_reposted && "bg-whatsapp-green/20 border-whatsapp-green/50"
                        )}>
                          <Repeat className={cn("w-6 h-6 transition-colors", reel.is_reposted ? 'text-whatsapp-green' : 'text-white')} />
                        </div>
                        <span className="text-white text-[11px] font-black drop-shadow-md">{reel.reposts_count || 0}</span>
                      </button>

                      <button onClick={(e) => { e.stopPropagation(); toggleSave(reel); }} className="flex flex-col items-center gap-1 group">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center transition-all bg-white/10 backdrop-blur-xl border border-white/10 active:scale-125",
                          reel.is_saved && "bg-yellow-500/20 border-yellow-500/50"
                        )}>
                          <Bookmark className={cn("w-6 h-6 transition-colors", reel.is_saved ? 'text-yellow-500 fill-yellow-500' : 'text-white')} />
                        </div>
                      </button>
                    </div>

                    {showComments && isActive && (
                      <div
                        className="absolute bottom-0 left-0 right-0 z-50 bg-[#0A0A0A] rounded-t-[40px] border-t border-white/10 h-[70vh] flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="flex flex-col items-center py-4 border-b border-white/5 bg-white/2 backdrop-blur-md">
                          <div className="w-12 h-1.5 rounded-full bg-white/20 mb-4" />
                          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-gray-400">Conversas Espirituais</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
                          <CommentsSection postId={reel.id} user={user} postAuthorId={reel.author_id || reel.user_id} />
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          );
        })}
      </div>

      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 pt-[calc(env(safe-area-inset-top)+14px)] pb-4 pointer-events-none">
        <Link href="/" className="pointer-events-auto w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-full border border-white/10 active:scale-90">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <span className="text-white font-black text-xs uppercase tracking-[0.4em] drop-shadow-2xl opacity-80">Tribo</span>
        <div className="w-10" />
      </div>
    </div>
  );
}

export default function TriboPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-black flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-whatsapp-green border-t-transparent animate-spin" /></div>}>
      <TriboContent />
    </Suspense>
  );
}
