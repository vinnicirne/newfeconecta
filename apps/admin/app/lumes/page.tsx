"use client";

import { useState, useEffect, useRef, type MouseEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { Flame, MessageCircle, Share2, Volume2, VolumeX, Play, ArrowLeft, Repeat, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import CommentsSection from '@/components/feed/CommentsSection';
import { cn } from '@/lib/utils';
import { NotificationService } from '@/lib/notifications';

export default function LumesPage() {
  const [reels, setReels] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [current, setCurrent] = useState(0);
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});

  const [isPlaying, setIsPlaying] = useState(true);
  
  useEffect(() => {
    init();
    
    // Inscrição em tempo real para novos Lumes
    const channel = supabase
      .channel('lumes-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: 'post_type=eq.video' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setReels(prev => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const init = async () => {
    let authUser = null;
    try {
      const { data } = await supabase.auth.getUser();
      authUser = data.user;
    } catch (e) {
      console.warn("Supabase auth lock contention, ignoring safely.");
    }
    
    const userId = authUser?.id || '296f0f37-c8b8-4ad1-855c-4625f3f14731';
    
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setUser(profile);

    const initialId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('id') : null;

    let postsData: any[] = [];
    
    // Se houver um ID, buscamos ele especificamente primeiro
    if (initialId) {
      const { data: specificPost } = await supabase.from('posts').select('*').eq('id', initialId).single();
      if (specificPost) postsData.push(specificPost);
    }

    let query = supabase
      .from('posts')
      .select('*')
      .eq('post_type', 'video');
    
    if (initialId) {
      query = query.neq('id', initialId); // Evita duplicar se já pegamos acima
    }

    const { data: latestPosts, error: postsError } = await query
      .order('created_at', { ascending: false })
      .limit(50);
      
    if (postsError) {
      console.error("❌ Erro ao buscar lumes:", postsError);
      if (postsData.length === 0) return;
    }

    if (latestPosts) postsData = [...postsData, ...latestPosts];

    if (postsData.length > 0) {
      // 1. Buscar autores em lote
      const userIds = Array.from(new Set(postsData.map((p: any) => p.author_id || p.user_id).filter(Boolean)));
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .in('id', userIds);

      const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});

      // 2. Mapear para garantir que o autor venha preenchido
      const mapped = postsData.map(p => {
        const author = profilesMap[p.author_id || p.user_id] || {};
        return {
          ...p,
          author,
          author_name: author.full_name || author.username || 'Usuário',
          author_avatar: author.avatar_url,
          author_username: author.username || 'usuario'
        };
      });
      // Buscar status de repost e save para o usuário logado em lote
      if (userId) {
        const [
          { data: userReposts },
          { data: userSaved }
        ] = await Promise.all([
          supabase.from('reposts').select('post_id').eq('profile_id', userId),
          supabase.from('saved_posts').select('post_id').eq('user_id', userId)
        ]);

        const repostIds = new Set(userReposts?.map(r => r.post_id) || []);
        const savedIds = new Set(userSaved?.map(s => s.post_id) || []);

        const finalMapped = mapped.map(p => ({
          ...p,
          is_reposted: repostIds.has(p.id),
          is_saved: savedIds.has(p.id)
        }));
        setReels(finalMapped);
        // Auto-scroll to the requested Lume
        if (initialId) {
          const idx = finalMapped.findIndex((r: any) => r.id === initialId);
          if (idx !== -1) {
            setCurrent(idx);
            setTimeout(() => {
              if (containerRef.current) {
                containerRef.current.scrollTo({ top: window.innerHeight * idx, behavior: 'instant' });
              }
            }, 150);
          }
        }
      } else {
        setReels(mapped);
        if (initialId) {
          const idx = mapped.findIndex((r: any) => r.id === initialId);
          if (idx !== -1) {
            setCurrent(idx);
            setTimeout(() => {
              if (containerRef.current) {
                containerRef.current.scrollTo({ top: window.innerHeight * idx, behavior: 'instant' });
              }
            }, 150);
          }
        }
      }
    }
  };

  useEffect(() => {
    setIsPlaying(true);
    Object.entries(videoRefs.current).forEach(([idx, vid]) => {
      if (!vid) return;
      if (Number(idx) === current) {
        vid.currentTime = 0;
        vid.play().catch(() => {});
      } else {
        vid.pause();
      }
    });
  }, [current]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const idx = Math.round(container.scrollTop / window.innerHeight);
    if (idx !== current) {
      setCurrent(idx);
      setShowComments(false);
    }
  };

  const togglePlay = () => {
    const v = videoRefs.current[current];
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const toggleLike = async (reel: any) => {
    if (!user) return;
    const isLiked = reel.likes?.includes(user.id);
    const newLikes = isLiked 
      ? reel.likes.filter((id: string) => id !== user.id)
      : [...(reel.likes || []), user.id];

    setReels(prev => prev.map(r => r.id === reel.id ? { ...r, likes: newLikes } : r));

    try {
      const { error } = await supabase.from('posts').update({ likes: newLikes }).eq('id', reel.id);
      if (error) throw error;
      
      if (!isLiked) {
        await NotificationService.notify({
          recipientId: reel.author_id,
          senderId: user.id,
          type: 'like',
          postId: reel.id
        });
      }
    } catch (err) {
      setReels(prev => prev.map(r => r.id === reel.id ? { ...r, likes: reel.likes } : r));
    }
  };

  const toggleRepost = async (reel: any) => {
    if (!user) return;
    const isReposted = reel.is_reposted;
    
    setReels(prev => prev.map(r => r.id === reel.id ? { 
      ...r, 
      is_reposted: !isReposted,
      reposts_count: (r.reposts_count || 0) + (isReposted ? -1 : 1)
    } : r));

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
      setReels(prev => prev.map(r => r.id === reel.id ? { 
        ...r, 
        is_reposted: isReposted,
        reposts_count: reel.reposts_count
      } : r));
    }
  };

  const toggleSave = async (reel: any) => {
    if (!user) return;
    const isSaved = reel.is_saved;
    
    setReels(prev => prev.map(r => r.id === reel.id ? { ...r, is_saved: !isSaved } : r));

    if (isSaved) {
      await supabase.from('saved_posts').delete().eq('post_id', reel.id).eq('user_id', user.id);
    } else {
      await supabase.from('saved_posts').insert({ post_id: reel.id, user_id: user.id });
      toast.success("Salvo nos favoritos!");
    }
  };

  if (reels.length === 0) return (
     <div className="fixed inset-0 flex items-center justify-center bg-black">
       <div className="w-12 h-12 border-4 border-whatsapp-green/20 border-t-whatsapp-green rounded-full animate-spin" />
     </div>
  );

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none touch-none">
      {/* Container Principal com Scroll Snap */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar relative w-full"
        style={{ scrollbarWidth: 'none' }}
      >
        {reels.map((reel, idx) => {
          const isLiked = reel.likes?.includes(user?.id);
          const isActive = current === idx;
          
          return (
            <div
              key={reel.id}
              className="relative w-full h-[100dvh] snap-start snap-always overflow-hidden"
              onClick={togglePlay}
            >
              {/* Video Player (Engine Principal) */}
              <video
                ref={el => { videoRefs.current[idx] = el; }}
                src={reel.media_url}
                loop
                playsInline
                muted={muted}
                preload="auto"
                crossOrigin="anonymous"
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Camadas de Gradiente (UX Visual) */}
              <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/70 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

              {/* Indicador Visual de Pause */}
              {!isPlaying && isActive && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                  <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center animate-out zoom-out-50 duration-300">
                    <Play className="w-10 h-10 text-white fill-white ml-2" />
                  </div>
                </div>
              )}

              {/* Painel de Informações (Esquerda) */}
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
                      <button 
                        onClick={(e) => { e.stopPropagation(); toast.info("Seguindo em breve!"); }}
                        className="px-2 py-0.5 bg-whatsapp-green/20 hover:bg-whatsapp-green/40 border border-whatsapp-green/50 rounded-full text-[10px] text-whatsapp-green font-bold transition-all active:scale-90"
                      >
                        Seguir
                      </button>
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

              {/* Barra de Ações (Direita) */}
              <div className="absolute right-4 bottom-32 z-20 flex flex-col items-center gap-6">
                <button onClick={(e) => { e.stopPropagation(); toggleLike(reel); }} className="flex flex-col items-center gap-1 group">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center transition-all bg-white/10 backdrop-blur-xl border border-white/10 active:scale-125",
                    isLiked && "bg-orange-500/20 border-orange-500/50"
                  )}>
                    <Flame className={cn("w-6 h-6 transition-colors", isLiked ? 'text-orange-500 fill-orange-500' : 'text-white')} />
                  </div>
                  <span className="text-white text-[11px] font-black drop-shadow-md">{reel.likes?.length || 0}</span>
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
                      title: 'Lumes - FéConecta',
                      text: reel.content || 'Confira este Lume no FéConecta!',
                      url: window.location.origin + '/lumes?id=' + reel.id
                    };
                    if (navigator.share) {
                      try { await navigator.share(shareData); } catch (err) {}
                    } else {
                      navigator.clipboard.writeText(shareData.url);
                      toast.success("Link do Lume copiado!");
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

              {/* Modal de Comentários Premium */}
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
                    <CommentsSection postId={reel.id} user={user} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Header Superior - Minimalista */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 pt-14 pb-4 pointer-events-none">
        <Link href="/" className="pointer-events-auto w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-xl rounded-full border border-white/10 active:scale-90">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <span className="text-white font-black text-xs uppercase tracking-[0.4em] drop-shadow-2xl opacity-80">Lumes</span>
        <div className="w-10" />
      </div>
    </div>
  );
}
