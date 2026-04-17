"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Bell,
  RefreshCw,
  Flame,
  UserCircle2,
  LayoutDashboard,
  Bookmark,
  Sun,
  Moon,
  Menu,
  MessageSquare,
  MoreVertical,
  ShieldCheck,
  ScrollText,
  Cookie,
  Megaphone,
  Users,
  Mic,
  BookOpen,
  Sparkles,
  MessageCircle,
  Repeat2,
  Send,
  MoreHorizontal,
  Trash2,
  Calendar
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import CreatePost from "@/components/feed/CreatePost";
import PostCard from "@/components/feed/PostCard";
import StoriesBar from "@/components/feed/StoriesBar";
import FollowSuggestions from "@/components/feed/FollowSuggestions";
import StoryCreator from "@/components/feed/StoryCreator";
import StoryViewer from "@/components/feed/StoryViewer";
import NotificationCenter from "@/components/feed/NotificationCenter";
import { supabase } from "@/lib/supabase";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import LiveRoomsBar from "@/components/room/LiveRoomsBar";
import CommentsSection from "@/components/feed/CommentsSection";
import DailyVerseSection from "@/components/feed/DailyVerseSection";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function RootPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [storyGroups, setStoryGroups] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;
  const { theme, setTheme } = useTheme();
  const { requestPermission, listenToForegroundMessages } = usePushNotifications();

  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [viewingStoryGroup, setViewingStoryGroup] = useState<any | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isMounted, setIsMounted] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    let mounted = true;

    const init = async () => {
      try {
        // Adicionando um pequeno delay para evitar conflito com outros componentes (ex: BottomNav)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { data, error: authError } = await supabase.auth.getUser();
        const authUser = data?.user;
        
        if (authError?.message?.includes('lock') || authError?.message?.includes('steal')) {
          console.warn("Supabase auth lock contention, ignoring safely.");
          // Se houver erro de lock, tentamos carregar dados públicos pelo menos
          loadInitialPosts();
          loadStories();
          return;
        }

        if (!mounted) return;

        if (authUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          setCurrentUser(profile ? { ...authUser, ...profile } : authUser);
          
          // Carregar dados dependentes do usuário
          loadInitialPosts();
          loadStories();
          loadUnreadCount(authUser.id);
          
          // Registrar para Push Notifications (atrasado para evitar conflito de lock)
          setTimeout(() => {
            requestPermission(authUser.id);
            listenToForegroundMessages();
          }, 1500);
        } else {
          // Fallback para usuários deslogados
          loadInitialPosts();
          loadStories();
        }
      } catch (err: any) {
        if (err?.message?.includes('lock') || err?.message?.includes('steal')) {
          console.warn("🛡️ [Auth] Lock detectado no catch, carregando modo público...");
          loadInitialPosts();
          loadStories();
          return;
        }
        console.error("Auth error:", err);
      }
    };

    init();

    const channel = supabase
      .channel('unified-feed-updates')
      // FEED POSTS REALTIME
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        const newPost = payload.new;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, is_verified, verification_label')
          .eq('id', newPost.user_id)
          .single();
        const mapped = { 
          ...mapPost(newPost, { [newPost.user_id]: profile || {} }),
          unique_key: `${newPost.id}-original`
        };
        
        setPosts(prev => (prev.some(p => p.unique_key === mapped.unique_key) ? prev : [mapped, ...prev]));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts(prev => prev.filter(p => p.id !== payload.old.id && p.unique_key !== payload.old.id));
      })
      // STORIES REALTIME
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, () => {
        loadStories();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'stories' }, (payload) => {
        setStoryGroups(prev => prev.map(group => ({
          ...group,
          stories: group.stories.filter((s: any) => s.id !== payload.old.id)
        })).filter(group => group.stories.length > 0)); 
      })
      // NOTIFICATIONS REALTIME
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications' 
      }, (payload) => {
        if (payload.new.recipient_id === currentUser?.id) {
          setUnreadCount(prev => prev + 1);
        }
      })
      // ROOMS REALTIME (Para o selo de LIVE nos Stories)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rooms' 
      }, () => {
        loadStories();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  const loadUnreadCount = async (id: string) => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', id)
      .eq('is_read', false);
    
    setUnreadCount(count || 0);
  };

  const mapPost = useCallback((post: any, profilesMap: any) => {
    const profile = profilesMap[post.user_id] || {};

    const mapped = {
      id: post.id,
      author_name: profile.full_name || 'FéConecta',
      author_username: profile.username || '@feconecta',
      author_id: post.user_id,
      author_avatar: profile.avatar_url,
      created_date: post.created_at,
      display_date: post.created_at,
      content: (post.content || '').trim(),
      media_url: post.media_url,
      media_type: post.media_type || 'text',
      likes: post.likes || [],
      likes_count: post.likes_count || (post.likes ? post.likes.length : 0),
      comments_count: post.comments_count || 0,
      reposts_count: post.reposts_count || 0,
      views_count: post.views_count || 0,
      is_verified: profile.is_verified,
      verification_label: profile.verification_label,
      background: post.background,
    };

    console.log("🔍 POST MAPEADO →", {
      id: mapped.id,
      content: mapped.content || "(sem conteúdo)",
      media_url: mapped.media_url || "null",
      author: mapped.author_name
    });

    return mapped;
  }, []);

  const loadInitialPosts = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
      setPage(0);
    }

    try {
      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      const { data: repostsData } = await supabase
        .from('reposts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      const postsList = postsData || [];
      const repostsList = repostsData || [];

      const repostedPostIds = repostsList.map((r: any) => r.post_id);
      const missingPostIds = repostedPostIds.filter((id: any) => !postsList.some((p: any) => p.id === id));

      let missingPosts: any[] = [];
      if (missingPostIds.length > 0) {
        const { data } = await supabase.from('posts').select('*').in('id', missingPostIds);
        missingPosts = data || [];
      }

      const feed: any[] = [];
      postsList.forEach((p: any) => feed.push({ ...p, display_date: p.created_at, is_repost: false, uid: `${p.id}-original` }));

      repostsList.forEach((r: any) => {
        const originalPost = postsList.find((p: any) => p.id === r.post_id) || missingPosts.find((p: any) => p.id === r.post_id);
        if (originalPost) {
          feed.push({
            ...originalPost,
            uid: `${originalPost.id}-repost-${r.profile_id}`,
            original_post_id: originalPost.id,
            display_date: r.created_at,
            is_repost: true,
            reposter_id: r.profile_id
          });
        }
      });

      feed.sort((a, b) => new Date(b.display_date).getTime() - new Date(a.display_date).getTime());
      const pagedFeed = feed.slice(0, PAGE_SIZE);

      if (pagedFeed.length === 0) {
        setPosts([]);
        setHasMore(false);
        return;
      }

      const userIds = new Set<string>();
      pagedFeed.forEach(item => {
        if (item.user_id) userIds.add(item.user_id);
        if (item.reposter_id) userIds.add(item.reposter_id);
      });

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, is_verified, verification_label')
        .in('id', Array.from(userIds));

      const profilesMap = (profilesData || []).reduce((acc: any, p: any) => {
        acc[p.id] = p;
        return acc;
      }, {});

      const mappedPosts = pagedFeed.map((item: any) => {
        const profile = profilesMap[item.user_id] || {};
        const reposter = item.is_repost ? profilesMap[item.reposter_id] : null;

        return {
          id: item.original_post_id || item.id,
          unique_key: item.uid || `${item.id}-original`,
          author_name: profile.full_name || 'FéConecta',
          author_username: profile.username || '@feconecta',
          author_id: item.user_id,
          author_avatar: profile.avatar_url,
          created_date: item.created_at,
          display_date: item.display_date,
          content: (item.content || '').trim(),
          media_url: item.media_url,
          media_type: item.media_type || 'text',
          post_type: item.post_type || item.media_type || 'text',
          likes: item.likes || [],
          likes_count: item.likes_count || (item.likes ? item.likes.length : 0),
          comments_count: item.comments_count || 0,
          reposts_count: item.reposts_count || 0,
          is_repost: item.is_repost,
          is_verified: profile.is_verified,
          verification_label: profile.verification_label,
          reposted_by_name: reposter ? reposter.full_name : null,
          reposted_by_id: item.reposter_id,
          background: item.background
        };
      });

      setPosts(prev => {
        const newPosts = [...mappedPosts];
        // Garantir que não haja duplicatas no próprio carregamento inicial
        return newPosts.filter((post, index, self) => 
          index === self.findIndex((p) => (p.unique_key === post.unique_key))
        );
      });
      setHasMore(feed.length > PAGE_SIZE);
    } catch (err) {
      console.error("❌ Erro inesperado:", err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    
    try {
      const { data: morePosts } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(nextPage * PAGE_SIZE, (nextPage + 1) * PAGE_SIZE - 1);

      if (morePosts && morePosts.length > 0) {
        // Coleta profiles dos novos posts para popular o feed
        const userIds = Array.from(new Set(morePosts.map(p => p.user_id)));
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url, is_verified, verification_label')
          .in('id', userIds);
          
        const profilesMap = (profilesData || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});

        const mapped = morePosts.map(p => ({
          ...mapPost(p, profilesMap),
          unique_key: `${p.id}-original`
        }));
        
        setPosts(prev => {
          const newPosts = mapped.filter(m => !prev.some(p => p.unique_key === m.unique_key));
          return [...prev, ...newPosts];
        });
        setPage(nextPage);
        setHasMore(morePosts.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Erro ao carregar mais posts:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore, mapPost, PAGE_SIZE]);

  const loadStories = async () => {
    try {
      // 1. Buscar Stories Ativos
      const { data: storiesData } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      // 2. Buscar Salas Ativas (Live) - Filtro de 12 horas para evitar salas zumbis
      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const { data: activeRooms } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'active')
        .gt('created_at', twelveHoursAgo);
      
      const liveUserIds = activeRooms?.map(r => r.creator_id).filter(Boolean) || [];
      const roomsMap = (activeRooms || []).reduce((acc: any, r: any) => {
        acc[r.creator_id] = r;
        return acc;
      }, {});

      // 3. Unificar todos os IDs válidos
      const storyUserIds = storiesData?.map(s => s.author_id) || [];
      const allDisplayIds = Array.from(new Set([...storyUserIds, ...liveUserIds]))
        .filter(id => id && String(id).length > 20);

      if (allDisplayIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username')
          .in('id', allDisplayIds);

        const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});

        const groups = allDisplayIds.map(uid => {
          const userStories = (storiesData || []).filter(s => s.author_id === uid);
          const author = profilesMap[uid] || {};
          const room = roomsMap[uid];
          
          return {
            author_id: uid,
            author_name: author.full_name || room?.name || 'Usuário',
            author_avatar: author.avatar_url || null,
            stories: userStories,
            is_live: !!room,
            room_id: room?.id,
            room_title: room?.name
          };
        });

        // Ordenação: LIVE primeiro
        groups.sort((a, b) => (a.is_live === b.is_live ? 0 : a.is_live ? -1 : 1));

        setStoryGroups(groups);
      } else {
        setStoryGroups([]);
      }
    } catch (err) {
      console.error("❌ Erro loadStories unificado:", err);
    }
  };

  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore || !hasMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMorePosts(),
      { rootMargin: "300px" }
    );
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, loadMorePosts]);

  return (
    <div suppressHydrationWarning className="min-h-screen bg-transparent">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-[#080808]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMounted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2.5 -ml-2 bg-black/5 dark:bg-white/5 rounded-xl text-gray-400 hover:text-whatsapp-teal transition-all outline-none">
                    <Menu className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px] p-2 rounded-2xl border border-gray-100 dark:border-white/10 shadow-xl bg-white dark:bg-whatsapp-darkLighter z-50">
                  <div className="px-2 py-2.5 mb-1 border-b border-gray-100 dark:border-white/5">
                    <p className="text-sm font-bold truncate dark:text-white">{currentUser?.full_name}</p>
                    <p className="text-[10px] text-gray-400 truncate">@{currentUser?.username}</p>
                  </div>

                  <Link href="/saved">
                    <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <Bookmark className="w-4 h-4 mr-3 text-gray-400" /> Itens Salvos
                    </DropdownMenuItem>
                  </Link>

                  <Link href="/bible">
                    <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm text-emerald-500 hover:bg-emerald-500/5 transition-colors">
                      <ScrollText className="w-4 h-4 mr-3" /> Bíblia Sagrada
                    </DropdownMenuItem>
                  </Link>

                  <Link href="/notes">
                    <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm text-amber-500 hover:bg-amber-500/5 transition-colors">
                      <BookOpen className="w-4 h-4 mr-3" /> Meu Diário
                    </DropdownMenuItem>
                  </Link>

                  <Link href="/room">
                    <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm text-red-500 hover:bg-red-500/5 transition-colors">
                      <Mic className="w-4 h-4 mr-3" /> Sala de Guerra
                    </DropdownMenuItem>
                  </Link>

                  {currentUser?.role === 'admin' && (
                    <Link href="/admin">
                      <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm text-whatsapp-teal hover:bg-whatsapp-teal/10 transition-colors">
                        <LayoutDashboard className="w-4 h-4 mr-3" /> Painel Admin
                      </DropdownMenuItem>
                    </Link>
                  )}

                  <DropdownMenuItem 
                    onClick={(e) => { e.preventDefault(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
                    className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm flex items-center justify-between mt-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center">
                      {theme === 'dark' ? <Sun className="w-4 h-4 mr-3 text-gray-400" /> : <Moon className="w-4 h-4 mr-3 text-gray-400" />} 
                      Tema
                    </div>
                    <span className="text-[10px] uppercase font-bold text-gray-400">{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
                  </DropdownMenuItem>

                  <div className="my-1 border-t border-gray-100 dark:border-white/5" />

                  <Link href="/about">
                    <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <Users className="w-4 h-4 mr-3 text-gray-400" /> Sobre Nós
                    </DropdownMenuItem>
                  </Link>

                  <Link href="/privacy">
                    <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <ShieldCheck className="w-4 h-4 mr-3 text-gray-400" /> Privacidade
                    </DropdownMenuItem>
                  </Link>

                  <Link href="/delete-account">
                    <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm text-red-500 hover:bg-red-500/5 transition-colors">
                      <Trash2 className="w-4 h-4 mr-3" /> Exclusão de Conta
                    </DropdownMenuItem>
                  </Link>

                  <Link href="/terms">
                    <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <ScrollText className="w-4 h-4 mr-3 text-gray-400" /> Termos de Uso
                    </DropdownMenuItem>
                  </Link>

                  <Link href="/cookies">
                    <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <Cookie className="w-4 h-4 mr-3 text-gray-400" /> Cookies
                    </DropdownMenuItem>
                  </Link>

                  <Link href="/advertising">
                    <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                      <Megaphone className="w-4 h-4 mr-3 text-gray-400" /> Publicidade
                    </DropdownMenuItem>
                  </Link>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {isMounted && (
              <div className="w-9 h-9 rounded-2xl bg-whatsapp-teal/20 flex items-center justify-center text-whatsapp-teal">
                <Flame className="w-5 h-5 fill-whatsapp-teal" />
              </div>
            )}
            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">FéConecta</h1>
          </div>

          <div className="flex items-center gap-2">
            {isMounted && (
              <>
                <button 
                  onClick={() => router.push('/explore')}
                  className="p-2.5 bg-black/5 dark:bg-white/5 rounded-xl text-gray-400 hover:text-whatsapp-teal transition-all"
                >
                  <Search className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowNotifications(true)}
                  className="p-2.5 bg-black/5 dark:bg-white/5 rounded-xl text-gray-400 hover:text-whatsapp-teal relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <div className="absolute top-2.5 right-2.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-[#080808] flex items-center justify-center">
                       <span className="text-[10px] text-white font-bold">{unreadCount}</span>
                    </div>
                  )}
                </button>

                <Link href="/bible" className="p-2.5 bg-black/5 dark:bg-white/5 rounded-xl text-gray-400 hover:text-emerald-500 transition-all">
                  <ScrollText className="w-5 h-5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr,672px,1fr] xl:grid-cols-[280px,1fr,320px] gap-0 lg:gap-8 pb-24">
        {/* Lado Esquerdo - Menu/Perfil (Oculto em Mobile, visível em XL) */}
        <div className="hidden xl:block sticky top-20 h-fit p-4 space-y-4">
           <Link href="/profile" className="flex items-center gap-3 p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all group">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 group-hover:scale-105 transition-transform">
                 <img src={currentUser?.avatar_url || "https://github.com/shadcn.png"} className="w-full h-full object-cover" alt="" />
              </div>
              <div className="flex flex-col">
                 <span className="text-sm font-bold dark:text-white">{currentUser?.full_name}</span>
                 <span className="text-[10px] text-gray-500 uppercase font-black tracking-tighter">Ver meu perfil</span>
              </div>
           </Link>
           <nav className="space-y-1">
                             <button onClick={() => router.push('/')} className="w-full flex items-center gap-4 p-4 text-whatsapp-green bg-whatsapp-green/5 rounded-2xl font-bold transition-all"><Flame className="w-5 h-5 fill-current" /> Feed Principal</button>
               <button onClick={() => router.push('/bible')} className="w-full flex items-center gap-4 p-4 text-emerald-500 hover:bg-emerald-500/5 rounded-2xl transition-all font-bold"><ScrollText className="w-5 h-5" /> Bíblia Sagrada</button>

              <button onClick={() => router.push('/notes')} className="w-full flex items-center gap-4 p-4 text-amber-500 hover:bg-amber-500/5 rounded-2xl transition-all font-bold"><BookOpen className="w-5 h-5" /> Meu Diário</button>
              <button onClick={() => router.push('/messages')} className="w-full flex items-center gap-4 p-4 text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all"><MessageSquare className="w-5 h-5" /> Mensagens</button>
              <button onClick={() => router.push('/profile')} className="w-full flex items-center gap-4 p-4 text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all"><Bookmark className="w-5 h-5" /> Salvos</button>
              <button onClick={() => router.push('/room')} className="w-full flex items-center gap-4 p-4 text-red-500 bg-red-500/5 rounded-2xl font-bold transition-all"><Mic className="w-5 h-5" /> Sala de Guerra</button>
           </nav>
        </div>

        {/* Centro - Feed Principal */}
        <div className="w-full max-w-2xl mx-auto lg:mx-0">

        <LiveRoomsBar />

        {/* VERSÍCULO DO DIA - COMPONENTE ISOLADO */}
        <DailyVerseSection currentUser={currentUser} />

        <StoriesBar 
          storyGroups={storyGroups} 
          myStoryGroup={storyGroups.find(g => g.author_id === currentUser?.id)}
          currentUser={currentUser} 
          onAddStory={() => setShowStoryCreator(true)} 
          onViewGroup={(group: any) => {
            if (group.is_live && group.stories.length === 0) {
              router.push(`/room/${group.room_id}`);
            } else {
              setViewingStoryGroup(group);
            }
          }} 
        />

        {/* Create Post Section (Web View Only) */}
        <div className="mt-2 px-4 hidden lg:block">
          <CreatePost user={currentUser} onPostCreated={() => loadInitialPosts(true)} />
        </div>

        <div className="px-4 py-4 space-y-4">
          {posts.length > 0 ? (
            posts.map((post, idx) => (
              <React.Fragment key={post.unique_key || post.id || `feed-post-${idx}`}>
                <div ref={idx === posts.length - 1 ? lastPostRef : null}>
                  <PostCard
                    post={post}
                    currentUser={currentUser}
                    onDeleted={(id: string) => setPosts(prev => prev.filter(p => p.id !== id))}
                    onUpdated={(updated: any) => setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))}
                  />
                </div>

                {/* Sugestões do Instagram: No meio do Feed (Após 2º post) */}
                {idx === 1 && (
                   <FollowSuggestions currentUser={currentUser} />
                )}
              </React.Fragment>
            ))
          ) : !loading && (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
              <p className="text-sm">Nenhuma publicação encontrada</p>
            </div>
          )}

          {(loading || loadingMore) && (
            <div className="flex justify-center py-10">
              <RefreshCw className="w-6 h-6 animate-spin text-whatsapp-teal" />
            </div>
          )}
        </div>
      </div>

     {/* Lado Direito - Contatos Online */}
        <div className="hidden lg:block sticky top-20 h-[calc(100vh-100px)] p-4 overflow-y-auto no-scrollbar">
           <div className="flex items-center justify-between mb-6 px-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Contatos Online</h3>
              <div className="flex gap-2">
                 <Search className="w-4 h-4 text-gray-500 cursor-pointer hover:text-whatsapp-green transition-colors" />
                 <MoreVertical className="w-4 h-4 text-gray-500 cursor-pointer hover:text-whatsapp-green transition-colors" />
              </div>
           </div>

           <div className="space-y-1">
              {/* Simulando contatos online baseada em quem o usuário segue */}
              {storyGroups.filter(g => g.author_id !== currentUser?.id).map(contact => (
                <Link 
                  key={`contact-${contact.author_id}`} 
                  href={`/messages?userId=${contact.author_id}`}
                  className="flex items-center gap-3 p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all group"
                >
                   <div className="relative">
                      <div className="w-9 h-9 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 group-hover:scale-105 transition-transform">
                         <img src={contact.author_avatar || "https://github.com/shadcn.png"} className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-whatsapp-green rounded-full border-2 border-white dark:border-[#080808]" />
                   </div>
                   <span className="text-sm font-medium dark:text-gray-200 group-hover:text-whatsapp-green transition-colors">{contact.author_name}</span>
                </Link>
              ))}
              
              {storyGroups.length <= 1 && (
                 <p className="text-[10px] text-gray-500 px-2 italic uppercase font-bold tracking-tighter">Acompanhe seus amigos aqui</p>
              )}
           </div>
        </div>
      </div>

      {showStoryCreator && <StoryCreator open={showStoryCreator} onClose={() => setShowStoryCreator(false)} user={currentUser} onCreated={loadStories} />}
      {viewingStoryGroup && <StoryViewer storyGroups={storyGroups} startUserIndex={storyGroups.indexOf(viewingStoryGroup)} currentUser={currentUser} onClose={() => setViewingStoryGroup(null)} />}
      <NotificationCenter 
        open={showNotifications} 
        onClose={() => {
          setShowNotifications(false);
          setUnreadCount(0);
        }} 
        userId={currentUser?.id}
      />
    </div>
  );
}