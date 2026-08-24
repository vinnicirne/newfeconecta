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
  Calendar,
  Sprout,
  Church,
  Heart,
  Music,
  HelpCircle,
  Gamepad2
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Virtuoso } from 'react-virtuoso';
import dynamic from "next/dynamic";

const CreatePost = dynamic(() => import("@/components/feed/CreatePost"), { ssr: false });
import PostCard from "@/components/feed/PostCard";
import FollowSuggestions from "@/components/feed/FollowSuggestions";

const StoriesBar = dynamic(() => import("@/components/feed/StoriesBar"), { ssr: false });
const StoryCreator = dynamic(() => import("@/components/feed/StoryCreator"), { ssr: false });
const StoryViewer = dynamic(() => import("@/components/feed/StoryViewer"), { ssr: false });
const NotificationCenter = dynamic(() => import("@/components/feed/NotificationCenter"), { ssr: false });
const LiveRoomsBar = dynamic(() => import("@/components/room/LiveRoomsBar"), { ssr: false });
const DailyVerseSection = dynamic(() => import("@/components/feed/DailyVerseSection"), { ssr: false });
const FenamoroBanner = dynamic(() => import("@/components/feed/FenamoroBanner"), { ssr: false });
const GlobalSearch = dynamic(() => import("@/components/feed/GlobalSearch"), { ssr: false });

import { supabase } from "@/lib/supabase";
import { NotificationService } from "@/lib/notifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { getStoredProfile, setStoredProfile } from "@/lib/profile-cache";
import CommentsSection from "@/components/feed/CommentsSection";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import moment from "moment";
import PostSkeleton from "@/components/feed/PostSkeleton";

export default function RootPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [storyGroups, setStoryGroups] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
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
  const profilesCacheRef = useRef<Record<string, any>>({});
  const [streak, setStreak] = useState(0);
  const [userChurches, setUserChurches] = useState<any[]>([]);

  const loadStreak = async (id: string) => {
    try {
      const { data, error } = await supabase.rpc('ping_daily_streak', { p_user_id: id });
      if (!error && data) {
        setStreak(data.streak || 0);
      }
    } catch (e) {
      console.error("Erro ao carregar streak:", e);
    }
  };

  const loadUserChurches = async (id: string) => {
    try {
      const { data } = await supabase
        .from('church_members')
        .select('role, church:churches(slug, name)')
        .eq('user_id', id)
        .eq('approved', true);
      if (data) {
        setUserChurches(data);
      }
    } catch (e) {
      console.error("Erro ao carregar igrejas:", e);
    }
  };


  const loadUnreadCount = async (id: string) => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', id)
      .eq('is_read', false);

    setUnreadCount(count || 0);
  };

  const loadFriends = async (userId: string) => {
    try {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id, profiles:following_id(id, full_name, avatar_url, username)')
        .eq('follower_id', userId);

      if (follows) {
        setFriends(follows.map((f: any) => ({
          ...f.profiles,
          id: f.following_id
        })).filter((p: any) => p && p.id));
      }
    } catch (e) {
      console.error("Erro ao carregar amigos:", e);
    }
  };

  const mapPost = useCallback((post: any, profilesMap: any, myFollowingSet?: Set<string>, mySavedSet?: Set<string>) => {
    const profile = profilesMap[post.user_id] || {};

    const mapped = {
      id: post.id,
      author_name: profile.full_name || 'FéConecta',
      author_username: profile.username || post.user_id,
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
      viewer_state: {
        following: myFollowingSet ? myFollowingSet.has(post.user_id) : false,
        saved: mySavedSet ? mySavedSet.has(post.id) : false
      }
    };


    return mapped;
  }, []);

  const loadInitialPosts = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
      setPage(0);
    }

    try {
      const [postsRes, repostsRes] = await Promise.all([
        supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('reposts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const postsData = postsRes.data;
      const repostsData = repostsRes.data;

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
            uid: `${originalPost.id}-repost-${r.profile_id}-${r.id}`,
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

      const myFollowingSet = new Set<string>();
      const mySavedSet = new Set<string>();
      try {
        const cached = localStorage.getItem('fc_profile_cache');
        const authUser = cached ? JSON.parse(cached) : null;
        if (authUser?.id) {
          const [{ data: follows }, { data: saved }] = await Promise.all([
            supabase.from('follows').select('following_id').eq('follower_id', authUser.id),
            supabase.from('saved_posts').select('post_id').eq('user_id', authUser.id)
          ]);
          follows?.forEach(f => myFollowingSet.add(f.following_id));
          saved?.forEach(s => mySavedSet.add(s.post_id));
        }
      } catch (e) { }

      const mappedPosts = pagedFeed.map((item: any, idx: number) => {
        const profile = profilesMap[item.user_id] || {};
        const reposter = item.is_repost ? profilesMap[item.reposter_id] : null;

        return {
          id: item.original_post_id || item.id,
          unique_key: item.uid || `${item.id}-${item.is_repost ? 'repost' : 'original'}-${idx}`,
          author_name: profile.full_name || 'Usuário FéConecta',
          author_username: profile.username || item.user_id, // Fallback para ID se username for nulo
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
          background: item.background,
          viewer_state: {
            following: myFollowingSet.has(item.user_id),
            saved: mySavedSet.has(item.original_post_id || item.id)
          }
        };
      });

      setPosts(prev => {
        const newPosts = [...mappedPosts];
        // Alimentar o cache de perfis
        mappedPosts.forEach(p => {
          if (p.author_id) {
            profilesCacheRef.current[p.author_id] = {
              full_name: p.author_name,
              username: p.author_username,
              avatar_url: p.author_avatar,
              is_verified: p.is_verified,
              verification_label: p.verification_label
            };
          }
        });
        // Garantir que não haja duplicatas no próprio carregamento inicial
        const uniquePosts = newPosts.filter((post, index, self) =>
          index === self.findIndex((p) => (p.unique_key === post.unique_key))
        );
        return uniquePosts;
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

        const myFollowingSet = new Set<string>();
        const mySavedSet = new Set<string>();
        try {
          const cached = localStorage.getItem('fc_profile_cache');
          const authUser = cached ? JSON.parse(cached) : null;
          if (authUser?.id) {
            const [{ data: follows }, { data: saved }] = await Promise.all([
              supabase.from('follows').select('following_id').eq('follower_id', authUser.id),
              supabase.from('saved_posts').select('post_id').eq('user_id', authUser.id).in('post_id', morePosts.map(p => p.id))
            ]);
            follows?.forEach(f => myFollowingSet.add(f.following_id));
            saved?.forEach(s => mySavedSet.add(s.post_id));
          }
        } catch (e) { }

        const mapped = morePosts.map(p => ({
          ...mapPost(p, profilesMap, myFollowingSet, mySavedSet),
          unique_key: `${p.id}-original`
        }));

        setPosts(prev => {
          const combined = [...prev, ...mapped];
          // Deduplicação rigorosa por unique_key
          const uniqueMap = new Map();
          combined.forEach(p => {
            if (!uniqueMap.has(p.unique_key)) {
              uniqueMap.set(p.unique_key, p);
            }
          });
          return Array.from(uniqueMap.values());
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
      const { data: storiesData } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: true });

      const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const [{ data: rawRooms }, followsRes] = await Promise.all([
        supabase
          .from('rooms')
          .select('*')
          .eq('status', 'active')
          .gt('created_at', twelveHoursAgo),
        currentUser?.id ? supabase
          .from('follows')
          .select('following_id, profiles:following_id(id, full_name, avatar_url, username)')
          .eq('follower_id', currentUser.id) : Promise.resolve({ data: [] })
      ]);

      const activeRooms = (rawRooms || []).filter(room => {
        const end = moment(room.created_at).add(room.duration_minutes || 60, 'minutes');
        return end.isAfter(moment());
      });

      const liveUserIds = activeRooms.map(r => r.creator_id).filter(Boolean);
      const roomsMap = activeRooms.reduce((acc: any, r: any) => {
        acc[r.creator_id] = r;
        return acc;
      }, {});

      const storyUserIds = storiesData?.map(s => s.author_id) || [];
      const friendIds = followsRes?.data?.map(f => f.following_id) || [];

      const allDisplayIds = Array.from(new Set([...storyUserIds, ...liveUserIds, ...friendIds]))
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
        }).filter(group => group.stories.length > 0 || group.is_live);

        groups.sort((a, b) => (a.is_live === b.is_live ? 0 : a.is_live ? -1 : 1));
        setStoryGroups(groups);
      } else {
        setStoryGroups([]);
      }
    } catch (err) {
      console.error("❌ Erro loadStories unificado:", err);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const cached = getStoredProfile();
      if (cached) {
        setCurrentUser(cached);
      }
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    let mounted = true;
    
    const handleHydration = (e: any) => {
      if (e?.detail) {
        setCurrentUser((prev: any) => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('profile-hydrated', handleHydration);

    const init = async () => {
      try {
        let authUser = getStoredProfile();

        // Se o cache local ainda estiver vazio, consulta a sessão e perfil no Supabase imediatamente
        if (!authUser) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();
            if (profile) {
              authUser = setStoredProfile(profile);
            }
          }
        }

        if (!mounted) return;

        if (authUser) {
          setCurrentUser(authUser);

          // FASE 1: Feed Crítico (Máxima prioridade)
          await loadInitialPosts();

          // FASE 2: Conteúdo secundário (Background)
          loadStories();
          loadUnreadCount(authUser.id);
          loadFriends(authUser.id);
          loadStreak(authUser.id);
          loadUserChurches(authUser.id);

          // FASE 3: Serviços de Background
          requestPermission(authUser.id);
          listenToForegroundMessages();

          // Heartbeat de Presença no Banco (atualiza updated_at)
          supabase.from('profiles').update({ updated_at: new Date().toISOString() }).eq('id', authUser.id).then();
        } else {
          await loadInitialPosts();
          loadStories();
        }
      } catch (err: any) {
        console.error("Init error:", err);
      }
    };

    init();

    // Heartbeat contínuo a cada 3 minutos para usuários ativos
    const heartbeatInterval = setInterval(() => {
      const cached = localStorage.getItem('fc_profile_cache');
      const authUser = cached ? JSON.parse(cached) : null;
      if (authUser?.id) {
        supabase.from('profiles').update({ updated_at: new Date().toISOString() }).eq('id', authUser.id).then();
      }
    }, 180000);

    const handlePresenceSync = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setOnlineUsers(new Set(e.detail));
      }
    };
    window.addEventListener('presence-sync', handlePresenceSync);

    const channel = supabase
      .channel('unified-feed-updates')
      // FEED POSTS REALTIME
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        const newPost = payload.new;
        const postUserId = newPost.user_id || newPost.author_id;

        let profile = profilesCacheRef.current[postUserId];

        if (!profile && postUserId) {
          const { data } = await supabase
            .from('profiles')
            .select('id, full_name, username, avatar_url, is_verified, verification_label')
            .eq('id', postUserId)
            .single();

          if (data) {
            profile = data;
            profilesCacheRef.current[postUserId] = data;
          }
        }

        const normalizedPost = {
          ...newPost,
          user_id: postUserId,
          author_id: postUserId
        };

        const mapped = {
          ...mapPost(normalizedPost, { [postUserId]: profile || {} }),
          unique_key: `${newPost.id}-original`
        };

        setPosts(prev => (prev.some(p => p.unique_key === mapped.unique_key) ? prev : [mapped, ...prev]));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts(prev => prev.filter(p => p.id !== payload.old.id && p.unique_key !== payload.old.id));
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'posts' }, (payload) => {
        const updatedPost = payload.new;
        setPosts(prev => prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost, likes: updatedPost.likes || [], likes_count: updatedPost.likes?.length || 0 } : p));
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'stories' }, () => {
        loadStories();
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
      clearInterval(heartbeatInterval);
      supabase.removeChannel(channel);
      window.removeEventListener('presence-sync', handlePresenceSync);
    };
  }, [currentUser?.id || 'guest']);

  // Observador de Interseção único e correto (via lastPostRef)

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

  // ── PULL TO REFRESH LOGIC ──
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartRef = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0) touchStartRef.current = e.touches[0].clientY;
    else touchStartRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current > 0 && window.scrollY <= 0) {
      const diff = e.touches[0].clientY - touchStartRef.current;
      if (diff > 0 && diff < 120) setPullY(diff);
    }
  };

  const handleTouchEnd = async () => {
    if (pullY > 60 && !isRefreshing) {
      setIsRefreshing(true);
      setPullY(60);
      await Promise.all([loadInitialPosts(false), loadStories()]);
      setIsRefreshing(false);
    }
    setPullY(0);
    touchStartRef.current = 0;
  };

  return (
    <div
      suppressHydrationWarning
      className="min-h-screen bg-transparent overflow-x-hidden transition-transform duration-200"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform: pullY > 0 ? `translateY(${pullY}px)` : 'none' }}
    >
      {pullY > 0 && (
        <div className="absolute top-0 left-0 w-full flex justify-center pointer-events-none z-[999]" style={{ marginTop: '-60px' }}>
          <div className={cn("p-2 rounded-full shadow-lg bg-white dark:bg-black border border-black/5 dark:border-white/5 transition-all", isRefreshing ? "animate-spin scale-110" : "")} style={{ opacity: Math.min(pullY / 60, 1) }}>
            <RefreshCw className="w-5 h-5 text-whatsapp-teal" />
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="sticky top-0 z-[200] bg-white/90 dark:bg-[#080808]/95 backdrop-blur-xl border-b border-black/5 dark:border-white/5 transition-all duration-300"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 0px)' }}
      >
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          
          {/* LOGO — esquerda, largura igual ao sidebar no desktop */}
          <div className="flex items-center gap-2.5 xl:w-[280px]">
            {/* Hamburguer mobile only */}
            {isMounted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="md:hidden p-2 -ml-1 bg-black/5 dark:bg-white/5 rounded-xl text-gray-400 hover:text-whatsapp-teal transition-all outline-none active:scale-95">
                    <Menu className="w-5 h-5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[280px] p-2 rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl max-h-[85vh] overflow-y-auto overflow-x-hidden" style={{ backgroundColor: theme === 'dark' ? '#0c0c0c' : '#FDFCF8', zIndex: 99999 }}>
                  <div className="px-2 py-2 mb-2">
                    <p className="text-sm font-bold truncate text-gray-900 dark:text-white">{currentUser?.full_name}</p>
                    <p className="text-[10px] text-gray-400 truncate">@{currentUser?.username}</p>
                  </div>

                  <div className="px-2 py-1 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Atalhos</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <Link href="/messages" className="flex flex-col items-center justify-center p-3 rounded-xl bg-whatsapp-teal/10 dark:bg-whatsapp-green/10 hover:bg-whatsapp-teal/20 dark:hover:bg-whatsapp-green/20 transition-colors border border-whatsapp-teal/20 dark:border-whatsapp-green/20">
                      <MessageSquare className="w-6 h-6 mb-1 text-whatsapp-teal dark:text-whatsapp-green" />
                      <span className="text-[11px] font-bold text-whatsapp-teal dark:text-whatsapp-green">Mensagens</span>
                    </Link>
                    <Link href="/jogos" className="flex flex-col items-center justify-center p-3 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 hover:bg-indigo-500/20 dark:hover:bg-indigo-500/30 transition-colors border border-indigo-500/20">
                      <Gamepad2 className="w-6 h-6 mb-1 text-indigo-500 dark:text-indigo-400" />
                      <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300">Jogos & Quiz</span>
                    </Link>
                    <Link href="/bible" className="flex flex-col items-center justify-center p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                      <ScrollText className="w-6 h-6 mb-1 text-emerald-500" />
                      <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Bíblia</span>
                    </Link>
                    <Link href="/notes" className="flex flex-col items-center justify-center p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                      <BookOpen className="w-6 h-6 mb-1 text-amber-500" />
                      <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Notas</span>
                    </Link>
                    <Link href="/music" className="flex flex-col items-center justify-center p-3 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                      <Music className="w-6 h-6 mb-1 text-pink-500" />
                      <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Música</span>
                    </Link>
                    <Link href="/santuario" className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500/20 dark:hover:bg-amber-500/30 transition-colors border border-amber-500/20">
                      <Flame className="w-6 h-6 mb-1 text-amber-600 dark:text-amber-500 fill-amber-500/20" />
                      <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Lugar Secreto</span>
                    </Link>
                  </div>

                  {currentUser?.role === 'admin' && (
                    <>
                      <div className="my-2 border-t border-gray-100 dark:border-white/5" />
                      <div className="px-3 py-1 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Admin</span>
                      </div>
                      <Link href="/admin">
                        <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm text-whatsapp-teal hover:bg-whatsapp-teal/10 transition-colors">
                          <LayoutDashboard className="w-4 h-4 mr-3" /> Painel Admin
                        </DropdownMenuItem>
                      </Link>
                    </>
                  )}

                  <div className="my-2 border-t border-gray-100 dark:border-white/5" />
                  <div className="px-3 py-1 mt-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">Igrejas</span>
                  </div>
                  <Link href="/igreja">
                    <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm text-gray-900 dark:text-white hover:bg-white/10 transition-colors">
                      <Church className="w-4 h-4 mr-3 text-indigo-500" /> Igrejas
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/igreja/criar">
                    <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm text-gray-900 dark:text-white hover:bg-white/10 transition-colors mt-1">
                      <Church className="w-4 h-4 mr-3 text-indigo-500" /> Criar Minha Igreja
                    </DropdownMenuItem>
                  </Link>
                  <div className="my-2 border-t border-gray-100 dark:border-white/5" />

                  <Link href="/saved">
                    <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm text-gray-900 dark:text-white hover:bg-white/10 transition-colors">
                      <Bookmark className="w-4 h-4 mr-3 text-blue-500" /> Salvos
                    </DropdownMenuItem>
                  </Link>

                  <Link href="/semei">
                    <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm text-gray-900 dark:text-white hover:bg-white/10 transition-colors mt-1">
                      <Sprout className="w-4 h-4 mr-3 text-rose-500" /> Semear 🌱
                    </DropdownMenuItem>
                  </Link>

                  <Link href="/suporte">
                    <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm text-gray-900 dark:text-white hover:bg-white/5 transition-colors mt-1">
                      <HelpCircle className="w-4 h-4 mr-3 text-sky-500" /> Suporte
                    </DropdownMenuItem>
                  </Link>

                  <DropdownMenuItem
                    onClick={(e) => { e.preventDefault(); setTheme(theme === 'dark' ? 'light' : 'dark'); }}
                    className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm flex items-center justify-between mt-1 hover:bg-black/5 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    <div className="flex items-center">
                      {theme === 'dark' ? <Sun className="w-4 h-4 mr-3 text-gray-400" /> : <Moon className="w-4 h-4 mr-3 text-gray-400" />}
                      Tema
                    </div>
                    <span className="text-[10px] uppercase font-bold text-gray-900 dark:text-white">{theme === 'dark' ? 'Claro' : 'Escuro'}</span>
                  </DropdownMenuItem>

                  {userChurches.length > 0 && (
                    <>
                      <div className="my-2 border-t border-gray-100 dark:border-white/5" />
                      <div className="px-3 py-1 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-white">Minhas Igrejas</span>
                      </div>
                      {userChurches.map((uc: any) => (
                        <Link href={`/igreja/${uc.church.slug}`} key={uc.church.slug}>
                          <DropdownMenuItem className="py-2.5 px-3 cursor-pointer rounded-xl font-medium text-sm text-gray-900 dark:text-white hover:bg-white/10 transition-colors">
                            <Church className="w-4 h-4 mr-3 text-indigo-400" /> {uc.church.name}
                          </DropdownMenuItem>
                        </Link>
                      ))}
                    </>
                  )}

                  <div className="my-2 border-t border-gray-100 dark:border-white/5" />

                  <div className="grid grid-cols-2 gap-x-2 gap-y-2 p-2 px-3 pb-3">
                    <Link href="/about" className="text-[10px] text-gray-900 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">Sobre Nós</Link>
                    <Link href="/privacy" className="text-[10px] text-gray-900 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">Privacidade</Link>
                    <Link href="/terms" className="text-[10px] text-gray-900 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">Termos de Uso</Link>
                    <Link href="/cookies" className="text-[10px] text-gray-900 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">Cookies</Link>
                    <Link href="/advertising" className="text-[10px] text-gray-900 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors">Publicidade</Link>
                    <Link href="/delete-account" className="text-[10px] text-red-500/70 hover:text-red-500 transition-colors">Deletar Conta</Link>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Logo + Nome */}
            <Link href="/" className="flex items-center gap-2 group">
              {isMounted && (
                <div className="w-9 h-9 rounded-2xl bg-whatsapp-teal/20 flex items-center justify-center text-whatsapp-teal group-hover:bg-whatsapp-teal/30 transition-colors">
                  <Flame className="w-5 h-5 fill-whatsapp-teal" />
                </div>
              )}
              <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">FéConecta</span>
            </Link>
          </div>

          {/* CENTRO — Busca Global */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-0 h-full items-center justify-center w-full max-w-lg pointer-events-none">
            <div className="w-full pointer-events-auto">
              <GlobalSearch />
            </div>
          </div>

          {/* AÇÕES — direita */}
          <div className="flex items-center gap-2">
            {isMounted && (
              <>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="hidden xl:flex p-2.5 bg-black/5 dark:bg-white/5 rounded-xl text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 transition-all"
                  title="Alterar Tema"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => router.push('/explore')}
                  className="md:hidden p-2.5 bg-black/5 dark:bg-white/5 rounded-xl text-gray-400 hover:text-whatsapp-teal transition-all"
                >
                  <Search className="w-5 h-5" />
                </button>
                <Link
                  href="/messages"
                  className="p-2.5 bg-black/5 dark:bg-white/5 rounded-xl text-gray-400 hover:text-whatsapp-teal transition-all relative"
                  title="Chat"
                >
                  <MessageSquare className="w-5 h-5" />
                </Link>

                <button
                  onClick={() => setShowNotifications(true)}
                  className="p-2.5 bg-black/5 dark:bg-white/5 rounded-xl text-gray-400 hover:text-whatsapp-teal relative"
                  title="Notificações"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <div className="absolute top-2.5 right-2.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-[#080808] flex items-center justify-center">
                      <span className="text-[10px] text-white font-bold">{unreadCount}</span>
                    </div>
                  )}
                </button>

                <Link href="/bible" className="p-2.5 bg-black/5 dark:bg-white/5 rounded-xl text-gray-400 hover:text-emerald-500 transition-all" title="Bíblia Sagrada">
                  <ScrollText className="w-5 h-5" />
                </Link>
              </>
            )}
          </div>

        </div>
      </div>

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[280px,1fr,320px] gap-0 lg:gap-8 pb-24">
        {/* Lado Esquerdo - Menu/Perfil (Oculto em Mobile, visível em LG+) */}
        <div className="hidden lg:flex lg:flex-col sticky top-14 self-start p-4 space-y-2" suppressHydrationWarning>
          {/* Perfil */}
          <Link href="/profile" className="flex items-center gap-3 p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all group">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 group-hover:scale-105 transition-transform bg-whatsapp-teal/10">
              {currentUser?.avatar_url && !currentUser.avatar_url.includes('vercel.sh') && !currentUser.avatar_url.includes('shadcn.png') ? (
                <img src={currentUser.avatar_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-whatsapp-teal to-emerald-600 text-white font-black text-sm uppercase shadow-inner">
                  {(() => {
                    const name = currentUser?.full_name || currentUser?.username || "U";
                    const parts = name.trim().split(/\s+/);
                    return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0][0].toUpperCase();
                  })()}
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold dark:text-white truncate max-w-[170px]">
                {currentUser?.full_name || currentUser?.username || "Meu Perfil"}
              </span>
              <span className="text-[10px] text-gray-500 uppercase font-black tracking-tighter">
                {currentUser?.username ? `@${currentUser.username}` : "Ver meu perfil"}
              </span>
            </div>
          </Link>

          {/* Navegação Principal */}
          <nav className="space-y-0.5">
            <Link href="/" className="w-full flex items-center gap-3 px-4 py-3 text-whatsapp-green bg-whatsapp-green/5 rounded-2xl font-bold transition-all"><Flame className="w-5 h-5 fill-current" /> Feed Principal</Link>
            <Link href="/bible" className="w-full flex items-center gap-3 px-4 py-3 text-emerald-500 hover:bg-emerald-500/5 rounded-2xl transition-all font-bold"><ScrollText className="w-5 h-5" /> Bíblia Sagrada</Link>
            <Link href="/notes" className="w-full flex items-center gap-3 px-4 py-3 text-amber-500 hover:bg-amber-500/5 rounded-2xl transition-all font-bold"><BookOpen className="w-5 h-5" /> Notas</Link>
            <Link href="/music" className="w-full flex items-center gap-3 px-4 py-3 text-purple-500 hover:bg-purple-500/5 rounded-2xl transition-all font-bold"><Music className="w-5 h-5" /> Música</Link>
            <Link href="/messages" className="w-full flex items-center justify-between px-4 py-3 text-whatsapp-teal dark:text-whatsapp-green hover:bg-whatsapp-teal/5 rounded-2xl transition-all font-bold">
              <span className="flex items-center gap-3"><MessageSquare className="w-5 h-5" /> Chat</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-whatsapp-teal/10 dark:bg-whatsapp-green/10 text-whatsapp-teal dark:text-whatsapp-green">Direto</span>
            </Link>
            <Link href="/saved" className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all font-bold"><Bookmark className="w-5 h-5" /> Salvos</Link>
            <Link href="/room" className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/5 rounded-2xl font-bold transition-all"><Mic className="w-5 h-5" /> Sala de Guerra</Link>
            <Link href="/tribo" className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl font-bold transition-all"><Users className="w-5 h-5" /> Tribo</Link>
            <Link href="/suporte" className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl font-bold transition-all"><HelpCircle className="w-5 h-5 text-sky-500" /> Suporte</Link>
          </nav>

          {/* Lugar Secreto */}
          <Link href="/santuario" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 transition-colors border border-amber-500/20 font-bold text-amber-700 dark:text-amber-400">
            <Flame className="w-5 h-5 fill-amber-500/30" /> Lugar Secreto
          </Link>

          {/* Igrejas */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-2 py-2">Igrejas</p>
            <nav className="space-y-0.5">
              <Link href="/igreja" className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all font-bold"><Church className="w-5 h-5 text-indigo-500" /> Igrejas</Link>
              <Link href="/igreja/criar" className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all font-bold"><Church className="w-5 h-5 text-indigo-400" /> Criar Minha Igreja</Link>
            </nav>
          </div>

          <Link href="/semei" className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl font-bold transition-all"><Sprout className="w-5 h-5 text-rose-500" /> Semear 🌱</Link>

          {/* Admin */}
          {isMounted && currentUser?.role === 'admin' && (
            <div className="pt-1">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-2 pb-1">Admin</p>
              <Link href="/admin" className="w-full flex items-center gap-3 px-4 py-3 text-whatsapp-teal hover:bg-whatsapp-teal/10 rounded-2xl font-bold transition-all"><LayoutDashboard className="w-5 h-5" /> Painel Admin</Link>
            </div>
          )}

          {/* FéNamoro — link simples sem blur */}
          <a
            href="https://fenamoro.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 font-bold text-pink-600 dark:text-pink-400 transition-colors"
          >
            <Heart className="w-5 h-5 fill-pink-500/30" /> FéNamoro 💕
          </a>


          {/* Minhas Igrejas */}
          {userChurches.length > 0 && (
            <div className="pt-2 border-t border-black/5 dark:border-white/5 mt-2">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 px-2 pb-1">Minhas Igrejas</p>
              <nav className="space-y-0.5">
                {userChurches.map((uc: any) => (
                  <Link key={uc.church.slug} href={`/igreja/${uc.church.slug}`} className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all font-bold">
                    <Church className="w-5 h-5 text-indigo-400" /> {uc.church.name}
                  </Link>
                ))}
              </nav>
            </div>
          )}

          {/* Links Legais */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 px-2 pt-1 pb-3 border-t border-black/5 dark:border-white/5">
            <Link href="/about" className="text-[10px] text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">Sobre Nós</Link>
            <Link href="/privacy" className="text-[10px] text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">Privacidade</Link>
            <Link href="/terms" className="text-[10px] text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">Termos de Uso</Link>
            <Link href="/cookies" className="text-[10px] text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">Cookies</Link>
            <Link href="/advertising" className="text-[10px] text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">Publicidade</Link>
            <Link href="/delete-account" className="text-[10px] text-red-500/70 hover:text-red-500 transition-colors">Deletar Conta</Link>
          </div>
        </div>

        {/* Centro - Feed Principal */}
        <div className="w-full max-w-2xl mx-auto lg:mx-0 flex flex-col">

          {/* Stories — desktop: 1º / mobile: 4º */}
          <div className="order-4 lg:order-1">
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
          </div>

          {/* CreatePost — desktop: 2º / mobile: oculto */}
          <div className="order-5 lg:order-2 mt-2 px-4 hidden lg:block">
            <CreatePost user={currentUser} onPostCreated={() => loadInitialPosts(true)} />
          </div>

          {/* LiveRoomsBar — desktop: 3º / mobile: 1º */}
          <div className="order-1 lg:order-3">
            <LiveRoomsBar />
          </div>

          {/* VERSÍCULO DO DIA — desktop: 4º / mobile: 2º */}
          <div className="order-2 lg:order-4">
            <DailyVerseSection currentUser={currentUser} />
          </div>

          {/* CROSS-PROMOTION FÉNAMORO — desktop: 5º / mobile: 3º */}
          <div className="order-3 lg:order-5">
            <FenamoroBanner currentUser={currentUser} />
          </div>

          <div className="order-6 px-4 py-4 space-y-4">
            {posts.length > 0 ? (
              <Virtuoso
                data={posts}
                useWindowScroll
                endReached={loadMorePosts}
                itemContent={(idx, post) => (
                  <div key={`${post.unique_key || post.id}-${idx}`}>
                    <PostCard
                      post={post}
                      currentUser={currentUser}
                      isPriority={idx < 2}
                      onDeleted={(id: string) => setPosts(prev => prev.filter(p => p.id !== id))}
                      onUpdated={(updated: any) => setPosts(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))}
                    />
                    {idx === 1 && (
                      <FollowSuggestions currentUser={currentUser} />
                    )}
                  </div>
                )}
              />
            ) : !loading && (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
                <Flame className="w-12 h-12 mb-4 animate-pulse text-whatsapp-teal opacity-50" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Tudo calmo por aqui</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-[250px]">Seja o primeiro a compartilhar uma benção ou encontre novos irmãos na aba explorar.</p>
                <Link href="/explore" className="px-6 py-2.5 bg-whatsapp-teal text-white rounded-xl font-bold shadow-lg shadow-whatsapp-teal/20 hover:scale-105 transition-transform">
                  Explorar
                </Link>
              </div>
            )}

            {loading && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <PostSkeleton key={i} />
                ))}
              </div>
            )}

            {loadingMore && (
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
            {friends.map(contact => {
              const isOnline = onlineUsers.has(contact.id);
              return (
                <Link
                  key={`contact-${contact.id}`}
                  href={`/messages?userId=${contact.id}`}
                  className={cn("flex items-center gap-3 p-3 hover:bg-black/5 dark:hover:bg-white/5 rounded-2xl transition-all group", !isOnline && "opacity-50 grayscale")}
                >
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 group-hover:scale-105 transition-transform bg-zinc-800 flex items-center justify-center">
                      {contact.avatar_url ? (
                        <img src={contact.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="text-white font-bold text-xs uppercase">
                          {(contact.full_name || contact.username || "C")[0]}
                        </span>
                      )}
                    </div>
                    {isOnline && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-whatsapp-green rounded-full border-2 border-white dark:border-[#080808]" />}
                  </div>
                  <span className="text-sm font-medium dark:text-gray-200 group-hover:text-whatsapp-green transition-colors">{contact.full_name || contact.username}</span>
                </Link>
              )
            })}

            {friends.length === 0 && (
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