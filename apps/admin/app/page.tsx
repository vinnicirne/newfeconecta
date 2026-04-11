"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Bell,
  PlusCircle,
  Filter,
  RefreshCw,
  Flame,
  LayoutGrid,
  List,
  UserCircle2,
  LayoutDashboard,
  Bookmark
} from "lucide-react";
import Link from "next/link";
import CreatePost from "@/components/feed/CreatePost";
import PostCard from "@/components/feed/PostCard";
import StoriesBar from "@/components/feed/StoriesBar";
import StoryCreator from "@/components/feed/StoryCreator";
import StoryViewer from "@/components/feed/StoryViewer";
import MobilePostSheet from "@/components/feed/MobilePostSheet";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

// Mock User for Feed context
const mockCurrentUser = {
  id: "296f0f37-c8b8-4ad1-855c-4625f3f14731",
  email: "admin@feconecta.com.br",
  full_name: "Admin FéConecta",
  username: "admin",
  avatar_url: "https://github.com/shadcn.png",
  role: "admin"
};

export default function RootPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [storyGroups, setStoryGroups] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [viewingStoryGroup, setViewingStoryGroup] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!mounted) return;

        if (authUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (mounted) {
            setCurrentUser(profile ? { ...authUser, ...profile } : authUser);
          }
        } else if (mounted) {
          setCurrentUser(mockCurrentUser);
        }
      } catch (err) {
        console.error("Auth error:", err);
        if (mounted) setCurrentUser(mockCurrentUser);
      }
    };

    checkAuth();
    loadInitialPosts();
    loadStories();

    const channel = supabase
      .channel('feed-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => loadInitialPosts(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reposts' },
        () => loadInitialPosts(true)
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isMounted) {
      console.log("Current Posts State:", posts.length, posts);
    }
  }, [posts, isMounted]);

  const fetchPostAuthor = async (post: any) => {
    const userId = post.author_id || post.user_id || post.profile_id;

    if (!userId) {
      console.warn("Post sem qualquer ID de usuário:", post.id);
      return mapPost(post);
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, username')
      .eq('id', userId)
      .single();

    if (error) {
      console.error(`Erro ao buscar profile para ${userId}:`, error);
    }

    // Injetamos o autor manualmente para o mapPost processar
    return mapPost({ ...post, author: profile || {} });
  };

  const loadInitialPosts = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
      setPage(0);
    }
    try {
      // 1. Buscar os posts primeiro (sem o join que requer FK)
      const { data: postsData, error: postsError } = await supabase
        .from('feed_posts')
        .select('*')
        .order('display_date', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (postsError) {
        console.error("❌ Erro ao buscar posts:", postsError);
        setLoading(false);
        return;
      }

      if (postsData && postsData.length > 0) {
        // 2. Extrair todos os IDs de usuários únicos
        const userIds = Array.from(new Set(postsData.map((p: any) => p.author_id || p.user_id || p.profile_id).filter(Boolean)));
        
        // 3. Buscar perfis em lote
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username')
          .in('id', userIds);

        if (profilesError) {
          console.error("❌ Erro ao buscar perfis:", profilesError);
        }

        // 4. Mapa de perfis para busca rápida
        const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});

        // 5. Combinar e mapear
        const combined = postsData.map(post => ({
          ...post,
          author: profilesMap[post.author_id || post.user_id || post.profile_id] || {}
        }));

        setPosts(combined.map(mapPost));
        setHasMore(postsData.length === PAGE_SIZE);
      } else {
        setPosts([]);
        setHasMore(false);
      }
    } catch (err) {
      console.error("❌ Fetch Catch Error:", err);
    }
    setLoading(false);
  };

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPager = page + 1;
    const from = nextPager * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      // 1. Buscar próximos posts
      const { data: postsData, error: postsError } = await supabase
        .from('feed_posts')
        .select('*')
        .order('display_date', { ascending: false })
        .range(from, to);

      if (postsError) {
        console.error("❌ Erro ao carregar mais posts:", postsError);
      } else if (postsData && postsData.length > 0) {
        // 2. Buscar perfis para os novos posts
        const userIds = Array.from(new Set(postsData.map((p: any) => p.author_id || p.user_id || p.profile_id).filter(Boolean)));
        
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username')
          .in('id', userIds);

        const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});

        const combined = postsData.map(post => ({
          ...post,
          author: profilesMap[post.author_id || post.user_id || post.profile_id] || {}
        }));

        const newPosts = combined.map(mapPost);
        setPosts(prev => [...prev, ...newPosts]);
        setPage(nextPager);
        setHasMore(postsData.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error("❌ Fetch More Catch Error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [page, hasMore, loadingMore]);

  const mapPost = (post: any) => {
    const author = post.author || {};

    const authorName = author.full_name || author.username || 'FéConecta';
    const authorUsername = author.username || 'feconecta';
    const authorAvatar = author.avatar_url;

    console.log(`📝 Mapeando post ${post.id}:`, {
      post_type: post.post_type,
      media_type: post.media_type,
      url: post.media_url?.substring(0, 50)
    });

    return {
      id: post.id,
      author_name: authorName,
      author_username: authorUsername,
      author_id: post.author_id || post.user_id,
      author_avatar: authorAvatar,
      created_date: post.created_at,
      display_date: post.display_date || post.created_at,
      is_repost: !!post.is_repost,
      reposted_by_name: post.reposted_by_name,
      reposted_by_username: post.reposted_by_username,
      post_type: post.post_type || post.media_type || 'text',
      media_type: post.media_type || post.post_type,
      content: post.content || '',
      media_url: post.media_url,
      background: (post.post_type === 'text' || post.media_type === 'text')
        ? (post.background_style || undefined)
        : undefined,
      likes: post.likes || [],
      likes_count: post.likes_count || 0,
      comments_count: post.comments_count || 0,
      shares_count: post.shares_count || 0,
      reposts_count: post.reposts_count || 0
    };
  };

  const loadStories = async () => {
    try {
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString());

      if (storiesError) throw storiesError;

      if (storiesData && storiesData.length > 0) {
        const userIds = [...new Set(storiesData.map(s => s.user_id).filter(Boolean))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});

        const groups: any[] = [];
        storiesData.forEach(story => {
          let group = groups.find(g => g.author_id === story.user_id);
          if (!group) {
            const author = profilesMap[story.user_id] || {};
            group = {
              author_id: story.user_id,
              author_name: author.full_name || 'Usuário',
              author_avatar: author.avatar_url,
              stories: []
            };
            groups.push(group);
          }
          group.stories.push({ id: story.id, media_url: story.media_url, media_type: 'image' });
        });
        setStoryGroups(groups);
      }
    } catch (err) {
      console.error("Error loading stories:", err);
    }
  };

  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore || !hasMore) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        loadMorePosts();
      }
    }, { rootMargin: "250px" });

    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore, loadMorePosts]);

  return (
    <div suppressHydrationWarning className="min-h-screen bg-[#080808] dark:bg-[#080808]">
      {/* Header Container (Full Width) */}
      <div className="sticky top-0 z-50 bg-[#080808]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMounted && (
              <div className="w-9 h-9 rounded-2xl bg-whatsapp-teal/20 flex items-center justify-center text-whatsapp-teal shadow-inner shadow-white/5">
                <Flame className="w-5 h-5 fill-whatsapp-teal" />
              </div>
            )}
            <h1 className="text-xl font-black text-white tracking-tight">FéConecta</h1>
          </div>
          <div className="flex items-center gap-2">
            {isMounted && (
              <>
                <button className="p-2.5 bg-white/5 rounded-xl text-gray-400 hover:text-whatsapp-teal transition-all">
                  <Search className="w-5 h-5" />
                </button>
                <button className="p-2.5 bg-white/5 rounded-xl text-gray-400 hover:text-whatsapp-teal transition-all relative">
                  <Bell className="w-5 h-5" />
                  <div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#080808]" />
                </button>
                <Link href="/saved" className="p-2.5 bg-white/5 rounded-xl text-gray-400 hover:text-whatsapp-teal transition-all" title="Salvos">
                  <Bookmark className="w-5 h-5" />
                </Link>
                {currentUser?.role === 'admin' && (
                  <Link href="/admin" className="p-2.5 bg-whatsapp-teal/10 rounded-xl text-whatsapp-teal hover:bg-whatsapp-teal hover:text-white transition-all active:scale-95" title="Painel Admin">
                    <LayoutDashboard className="w-5 h-5" />
                  </Link>
                )}
                <Link href="/profile" className="ml-1 w-9 h-9 rounded-xl overflow-hidden border border-white/10 hover:opacity-80 transition-all active:scale-90" title="Ver Perfil">
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} className="w-full h-full object-cover" alt="Perfil" />
                  ) : (
                    <div className="w-full h-full bg-whatsapp-teal/10 flex items-center justify-center">
                      <UserCircle2 className="w-6 h-6 text-whatsapp-teal" />
                    </div>
                  )}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content (Centered) */}
      <div className="max-w-2xl mx-auto pb-24">
        {/* Stories Section */}
        <div className="bg-[#080808]">
          <StoriesBar
            storyGroups={storyGroups}
            currentUser={currentUser}
            onAddStory={() => setShowStoryCreator(true)}
            onViewGroup={(group: any) => setViewingStoryGroup(group)}
          />
        </div>

        {/* Create Post Section (Desktop View) */}
        <div className="hidden sm:block mt-2">
          <CreatePost user={currentUser} onPostCreated={loadInitialPosts} />
        </div>

        {/* Post Feed */}
        <div className={cn(
          "space-y-4 px-4 py-4",
          viewMode === 'grid' && "grid grid-cols-2 gap-2 space-y-0"
        )}>
          {posts.map((post, idx) => (
            <div key={`${post.id}-${post.is_repost ? 'repost' : 'post'}-${idx}`} ref={idx === posts.length - 1 ? lastPostRef : null}>
              <PostCard
                post={post}
                currentUser={currentUser}
                onDeleted={(id: string) => setPosts(prev => prev.filter(p => p.id !== id))}
                onUpdated={(updatedPost: any) => setPosts(prev => prev.map(p => p.id === updatedPost.id ? mapPost(updatedPost) : p))}
              />
            </div>
          ))}

          {(loading || loadingMore) && (
            <div className="flex flex-col items-center justify-center py-10 opacity-40 text-white">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="py-10 text-center opacity-20">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.5em]">Fim do Feed</p>
            </div>
          )}

          {posts.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 opacity-40 text-white">
              <RefreshCw className="w-8 h-8 mb-4 animate-spin-slow text-whatsapp-teal" />
              <p className="text-sm font-bold uppercase tracking-widest">Nenhuma publicação encontrada</p>
            </div>
          )}
        </div>
      </div>

      {showStoryCreator && (
        <StoryCreator
          open={showStoryCreator}
          onClose={() => setShowStoryCreator(false)}
          user={currentUser}
          onCreated={loadStories}
        />
      )}

      {viewingStoryGroup && (
        <StoryViewer
          storyGroups={storyGroups}
          startUserIndex={storyGroups.indexOf(viewingStoryGroup)}
          currentUser={currentUser}
          onClose={() => setViewingStoryGroup(null)}
        />
      )}
    </div>
  );
}
