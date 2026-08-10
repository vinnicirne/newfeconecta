"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Grid, ChevronDown, Globe, Instagram, MessageCircle, MessageSquare,
  Linkedin, Youtube, UserSquare2, PlaySquare, Flame, 
  ArrowLeft, RefreshCw, Mic, Camera 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { NotificationService } from "@/lib/notifications";
import { toast } from "sonner";
import PostCard from "@/components/feed/PostCard";
import { VerificationBadge } from "@/components/verification-badge";
import { ProfileConnectionsModal } from "@/components/profile/ProfileConnectionsModal";
import useSWR from 'swr';
import { formatExternalUrl } from '@/lib/url-utils';

export default function PublicProfilePage() {
  console.log("🚀 PublicProfilePage Rendering...", { timestamp: new Date().toISOString() });
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [user, setUser] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [view, setView] = useState<'grid' | 'lumes' | 'likes'>('grid');
  const [userPosts, setUserPosts] = useState<any[]>([]);
  const [isConnectionsOpen, setIsConnectionsOpen] = useState(false);
  const [connectionsType, setConnectionsType] = useState<'followers' | 'following'>('followers');
  const [connectionsData, setConnectionsData] = useState<any[]>([]);

  // 1. Inicialização do Usuário Logado (Apenas uma vez no mount)
  useEffect(() => {
    const initAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        if (profile) setCurrentUser(profile);
      }

      // Cache Check
      const cached = localStorage.getItem('fc_profile_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed.username === username) {
            setUser(parsed);
          }
        } catch (e) {}
      }
    };
    initAuth();
  }, [username]);

  // 2. Subscrição Realtime do Perfil Visitado (Apenas quando o user.id estiver disponível)
  useEffect(() => {
    if (!user?.id) return;

    // Sincronização Global de Seguidores
    const handleGlobalSync = (e: any) => {
      if (e.detail.userId === user.id) {
        setIsFollowing(e.detail.isFollowing);
      }
    };
    window.addEventListener('user-follow-changed', handleGlobalSync);

    const followChannel = supabase
      .channel(`profile-sync-${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'follows',
        filter: `following_id=eq.${user.id}`
      }, (payload) => {
        setUser((prev: any) => {
          const increment = payload.eventType === 'INSERT' ? 1 : payload.eventType === 'DELETE' ? -1 : 0;
          return { ...prev, followerCount: Math.max(0, (prev.followerCount || 0) + increment) };
        });
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'follows',
        filter: `follower_id=eq.${user.id}`
      }, (payload) => {
        setUser((prev: any) => {
          const increment = payload.eventType === 'INSERT' ? 1 : payload.eventType === 'DELETE' ? -1 : 0;
          return { ...prev, followingCount: Math.max(0, (prev.followingCount || 0) + increment) };
        });
      })
      .subscribe();

    return () => {
      window.removeEventListener('user-follow-changed', handleGlobalSync);
      supabase.removeChannel(followChannel);
    };
  }, [user?.id]);

  // 1. Motor de Perfil Unificado via SWR (Cache & One-Request)
  const fetcher = async (key: string) => {
    const parts = key.split(':');
    const username = parts[1];
    const viewerId = parts[2];
    
    // Sanitização rigorosa (Gabarito #11): garante UUID válido ou null real
    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
    const pViewerId = isUUID(viewerId) ? viewerId : null;

    const { data, error, status } = await supabase.rpc('get_profile_with_state', {
      p_username: username,
      p_viewer_id: pViewerId
    });

    if (error) {
      console.error(`[RPC Error] get_profile_with_state (${username}):`, error);
      // Anexa o status HTTP ao erro para o SWRProvider identificar o 400
      const wrappedError = new Error(error.message);
      (wrappedError as any).status = status;
      (wrappedError as any).code = error.code;
      throw wrappedError;
    }
    
    if (!data) throw new Error("Perfil não encontrado");
    return data;
  };

  const { data, error, mutate, isValidating } = useSWR(
    username ? `profile:${username}:${currentUser?.id || 'null'}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000, // 🛡️ 5 minutos de cache (Gabarito #8 - Zero Spam)
    }
  );

  // Sincronização de Estados Locais
  useEffect(() => {
    if (data?.profile) {
      // Normalização de dados (Snake Case para Camel Case)
      const normalizedProfile = {
        ...data.profile,
        followerCount: data.profile.followerCount ?? data.profile.followers_count ?? 0,
        followingCount: data.profile.followingCount ?? data.profile.following_count ?? 0,
        postCount: data.profile.postCount ?? data.profile.posts_count ?? 0
      };
      setUser(normalizedProfile);
      setIsFollowing(data.viewer_state.is_following);
      setUserPosts(data.posts || []);
      setLikedPosts(data.liked_posts || []);
    }
  }, [data]);

  const loading = !data && !error;

  const fetchData = async () => {
    // Agora o fetchData apenas dispara uma revalidação do SWR se necessário
    await mutate();
  };

  const fetchConnections = async (type: 'followers' | 'following', profileId: string) => {
    setConnectionsType(type);
    setIsConnectionsOpen(true);
    setConnectionsData([]);

    try {
      let authUserId = null;
      try {
        const cached = localStorage.getItem('fc_profile_cache');
        if (cached) authUserId = JSON.parse(cached).id;
        else {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          authUserId = authUser?.id;
        }
      } catch (authErr) {}

      const query = supabase.from('follows').select('follower_id, following_id');
      if (type === 'followers') query.eq('following_id', profileId);
      else query.eq('follower_id', profileId);

      const { data: follows, error: followError } = await query;
      if (followError || !follows || follows.length === 0) return;

      const userIds = follows.map(f => type === 'followers' ? f.follower_id : f.following_id);

      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url')
          .in('id', userIds);

        if (profiles && authUserId) {
          const { data: myFollowing } = await supabase.from('follows').select('following_id').eq('follower_id', authUserId);
          const myFollowSet = new Set(myFollowing?.map(m => m.following_id) || []);
          const enriched = profiles.map(p => ({ ...p, is_common: myFollowSet.has(p.id) }));
          setConnectionsData(enriched);
        } else if (profiles) {
          setConnectionsData(profiles);
        }
      }
    } catch (err: any) {
      console.error("Erro ao buscar conexões:", err);
    }
  };

  const [likedPosts, setLikedPosts] = useState<any[]>([]);

  const toggleFollow = async () => {
    if (!currentUser || !user || !data) return;
    
    const oldFollowing = isFollowing;
    const newFollowing = !oldFollowing;
    
    // 🚀 ATUALIZAÇÃO NUCLEAR OTIMISTA (SWR Mutate)
    // Isso evita o "ativa/desativa" (flicker) pois trava o estado no cache do SWR
    const optimisticData = {
      ...data,
      viewer_state: { ...data.viewer_state, is_following: newFollowing },
      profile: { 
        ...data.profile, 
        followers_count: newFollowing ? (data.profile.followers_count || 0) + 1 : Math.max(0, (data.profile.followers_count || 0) - 1)
      }
    };

    mutate(optimisticData, false); // Atualiza localmente sem revalidar ainda
    setIsFollowing(newFollowing);

    try {
      if (oldFollowing) {
        const { error } = await supabase.from('follows').delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('follows').insert({
          follower_id: currentUser.id,
          following_id: user.id
        });
        if (error) throw error;

        await NotificationService.notify({
          recipientId: user.id,
          senderId: currentUser.id,
          type: 'follow',
          content: 'começou a te seguir'
        });
      }

      window.dispatchEvent(new CustomEvent('user-follow-changed', {
        detail: { userId: user.id, isFollowing: newFollowing }
      }));
      
      // ✅ No mutate() aqui. Confiamos na atualização otimista acima 
      // para economizar recursos do Free Tier (Gabarito #8).
    } catch (err) {
      mutate(data, false); // Reverte cache em caso de erro
      setIsFollowing(oldFollowing);
      toast.error("Erro ao processar seguimento");
    }
  };

  return (
    <div className="min-h-screen pb-20 max-w-2xl mx-auto border-x bg-white dark:bg-black text-gray-900 dark:text-white transition-colors" suppressHydrationWarning>
      {/* Banner */}
      <div className="relative h-48 w-full bg-gray-900 overflow-hidden">
        {user?.banner_url ? (
          <img src={user.banner_url} className="w-full h-full object-cover" alt="Banner" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal/20 via-black to-whatsapp-green/20" />
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-lg transition-all text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-white drop-shadow-md">@{user?.username || '...'}</h1>
        <div className="w-10" /> 
      </div>

      <div className="px-5 -mt-12 relative z-10 pb-2">
        <div className="flex items-center justify-between gap-4 mb-6 pt-12">
          <div className="w-[100px] h-[100px] rounded-[32px] p-[3px] bg-black">
             <div className="w-full h-full rounded-[28px] border-4 border-black overflow-hidden bg-gray-800 shadow-2xl relative">
                {user?.avatar_url && !user.avatar_url.includes('vercel.sh') ? (
                  <img src={user.avatar_url} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-emerald-600 flex items-center justify-center text-white font-black text-2xl uppercase shadow-inner">
                    {(() => {
                      const name = user?.full_name || user?.username || "U";
                      const parts = name.trim().split(/\s+/);
                      return parts.length >= 2 ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase() : parts[0][0].toUpperCase();
                    })()}
                  </div>
                )}
             </div>
          </div>

          <div className="flex-1 flex justify-around text-center pt-8">
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-none">{user?.postCount || 0}</span>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Posts</span>
            </div>
            {user?.show_counters !== false && (
              <>
                <button 
                  onClick={() => user?.id && fetchConnections('followers', user.id)}
                  className="flex flex-col hover:opacity-70 active:scale-95 transition-all"
                >
                  <span className="font-bold text-lg leading-none">{user?.followerCount || 0}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Seguidores</span>
                </button>
                <button 
                  onClick={() => user?.id && fetchConnections('following', user.id)}
                  className="flex flex-col hover:opacity-70 active:scale-95 transition-all"
                >
                  <span className="font-bold text-lg leading-none">{user?.followingCount || 0}</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Seguindo</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-0.5 mb-6">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <h2 className="font-bold text-sm tracking-tight truncate">{user?.full_name}</h2>
            {user?.is_verified && (
              <VerificationBadge 
                role={user?.verification_label || 'Verificado'} 
                size="sm" 
              />
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{user?.bio}</p>
          {user?.church && <p className="text-xs text-whatsapp-teal dark:text-whatsapp-green font-bold uppercase tracking-wider mt-1">{user.church}</p>}
          {user?.website_url && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(formatExternalUrl(user.website_url), '_blank', 'noopener,noreferrer');
              }}
              className="text-xs text-blue-500 font-bold hover:underline block mt-2 text-left"
            >
              {user.website_url.replace('https://', '').replace('http://', '')}
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          {(currentUser?.id && user?.id && (currentUser.id === user.id || (currentUser.username && currentUser.username === username))) ? (
            <button 
              onClick={() => router.push('/profile')} 
              className="flex-1 bg-gray-100 dark:bg-white/10 py-2 rounded-xl text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white"
            >
              Editar Perfil
            </button>
          ) : (
            <button 
              onClick={toggleFollow}
              className={cn(
                "flex-1 py-2 rounded-xl text-sm font-bold transition-all active:scale-95 uppercase tracking-wide",
                isFollowing 
                  ? "bg-gray-100 dark:bg-white/5 border border-black/5 dark:border-white/10 text-gray-500 dark:text-gray-400" 
                  : "bg-whatsapp-teal text-white shadow-lg shadow-whatsapp-teal/20"
              )}
            >
              {isFollowing ? "Seguindo" : "Seguir"}
            </button>
          )}
          <button 
            onClick={() => {
              const isOwnProfile = currentUser?.id === user?.id || (currentUser?.username && currentUser.username === username);
              router.push(isOwnProfile ? '/messages' : `/messages?userId=${user?.id}`);
            }}
            className="flex-1 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 flex items-center justify-center gap-2 rounded-xl transition-all border border-black/5 dark:border-white/5 active:scale-95 text-sm font-bold uppercase tracking-wide text-gray-900 dark:text-white"
          >
            <MessageSquare className="w-4 h-4 text-gray-500 dark:text-gray-300" />
            Chat
          </button>
        </div>

        {/* Social Links Row */}
        {([
          { label: 'Instagram', icon: Instagram, color: 'hover:text-pink-500', key: 'instagram_url', type: 'instagram' },
          { label: 'WhatsApp', icon: MessageCircle, color: 'hover:text-green-500', key: 'whatsapp_url', type: 'whatsapp' },
          { label: 'LinkedIn', icon: Linkedin, color: 'hover:text-blue-500', key: 'linkedin_url', type: 'linkedin' },
          { label: 'YouTube', icon: Youtube, color: 'hover:text-red-500', key: 'youtube_url', type: 'youtube' },
        ].filter(l => user?.[l.key]).length > 0) && (
          <div className="flex items-center gap-3 mb-6">
            {[
              { label: 'Instagram', icon: Instagram, color: 'hover:text-pink-500', key: 'instagram_url', type: 'instagram' },
              { label: 'WhatsApp', icon: MessageCircle, color: 'hover:text-green-500', key: 'whatsapp_url', type: 'whatsapp' },
              { label: 'LinkedIn', icon: Linkedin, color: 'hover:text-blue-500', key: 'linkedin_url', type: 'linkedin' },
              { label: 'YouTube', icon: Youtube, color: 'hover:text-red-500', key: 'youtube_url', type: 'youtube' },
            ].filter(link => user?.[link.key]).map((link) => (
              <button
                key={link.label}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const url = formatExternalUrl(user?.[link.key], link.type);
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                className={cn(
                  "w-11 h-11 rounded-2xl bg-gray-100 dark:bg-white/5 border border-black/5 dark:border-white/10 flex items-center justify-center transition-all active:scale-90 group",
                  link.color
                )}
                title={link.label}
              >
                <link.icon className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-inherit transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex border-t border-white/10 mt-4 h-12">
        <button onClick={() => setView('grid')} className={cn("flex-1 flex justify-center items-center", view === 'grid' ? "text-white border-t-2 border-white -mt-[2px]" : "text-gray-500")}>
          <Grid className="w-6 h-6" />
        </button>
        <button onClick={() => setView('lumes')} className={cn("flex-1 flex justify-center items-center", view === 'lumes' ? "text-white border-t-2 border-white -mt-[2px]" : "text-gray-500")}>
          <PlaySquare className="w-6 h-6" />
        </button>
        <button onClick={() => setView('likes')} className={cn("flex-1 flex justify-center items-center", view === 'likes' ? "text-white border-t-2 border-white -mt-[2px]" : "text-gray-500")}>
          <Flame className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-[2px]">
        {(view === 'likes' ? likedPosts : userPosts)
          .filter((post) => {
            if (view === 'lumes') return post.post_type === 'video' || post.media_url?.match(/\.(mp4|webm|mov|m4v)/i);
            return true;
          })
          .map((post) => {
            const isVideo = (post.post_type === 'video' || post.media_url?.match(/\.(mp4|webm|mov|m4v)/i)) && !post.media_url?.match(/\.(mp3|wav|m4a|ogg|aac|flac|opus|weba)/i);
            const isAudio = post.post_type === 'audio' || post.media_url?.match(/\.(mp3|wav|m4a|ogg|aac|flac|opus|weba)/i);

            return (
              <div 
                key={post.id} 
                onClick={() => setSelectedPost(post)}
                className="aspect-square relative group cursor-pointer overflow-hidden bg-gray-900 border border-white/5"
              >
                {post.media_url ? (
                  isAudio ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-whatsapp-dark to-[#111b21]">
                       <div className="w-10 h-10 rounded-full bg-whatsapp-teal/20 flex items-center justify-center mb-2 animate-pulse">
                          <Mic className="w-5 h-5 text-whatsapp-teal" />
                       </div>
                    </div>
                  ) : isVideo ? (
                    <video 
                      src={post.media_url} 
                      crossOrigin="anonymous"
                      className="absolute inset-0 w-full h-full object-cover" 
                      muted 
                      playsInline 
                    />
                  ) : (
                    <img src={post.media_url} className="absolute inset-0 w-full h-full object-cover" alt="" />
                  )
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center p-2 text-[8px] text-gray-500 text-center uppercase font-bold overflow-hidden">{post.content}</div>
                )}
                {isVideo && (
                  <div className="absolute top-2 right-2 z-10">
                    <PlaySquare className="w-4 h-4 text-white drop-shadow-md" />
                  </div>
                )}
              </div>
            );
          })}
        {userPosts.length === 0 && (
          <div className="col-span-3 py-20 text-center opacity-20">
            <p className="text-xs font-bold uppercase tracking-widest">Nenhuma publicação</p>
          </div>
        )}
      </div>
      {selectedPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm transition-all" onClick={() => setSelectedPost(null)}>
           <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar" onClick={e => e.stopPropagation()}>
              <PostCard 
                post={{...selectedPost, author_name: user?.full_name, author_username: user?.username, author_avatar: user?.avatar_url}} 
                currentUser={currentUser} 
              />
           </div>
        </div>
      )}

      <ProfileConnectionsModal
        isOpen={isConnectionsOpen}
        onClose={() => setIsConnectionsOpen(false)}
        type={connectionsType}
        data={connectionsData}
      />
    </div>
  );
}
