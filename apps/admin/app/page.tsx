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
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { useTheme } from "next-themes";
import CreatePost from "@/components/feed/CreatePost";
import PostCard from "@/components/feed/PostCard";
import StoriesBar from "@/components/feed/StoriesBar";
import FollowSuggestions from "@/components/feed/FollowSuggestions";
import StoryCreator from "@/components/feed/StoryCreator";
import StoryViewer from "@/components/feed/StoryViewer";
import { supabase } from "@/lib/supabase";

export default function RootPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [storyGroups, setStoryGroups] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;
  const { theme, setTheme } = useTheme();

  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [viewingStoryGroup, setViewingStoryGroup] = useState<any | null>(null);

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    let mounted = true;

    const init = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!mounted) return;

        if (authUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          setCurrentUser(profile ? { ...authUser, ...profile } : authUser);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }

      loadInitialPosts();
      loadStories();
    };

    init();

    const channel = supabase
      .channel('unified-feed-updates')
      // FEED POSTS REALTIME
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        const newPost = payload.new;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, username, avatar_url')
          .eq('id', newPost.user_id)
          .single();
        const mapped = mapPost(newPost, { [newPost.user_id]: profile || {} });
        setPosts(prev => (prev.some(p => p.id === mapped.id) ? prev : [mapped, ...prev]));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' }, (payload) => {
        setPosts(prev => prev.filter(p => (p.id !== payload.old.id && p.unique_key !== payload.old.id)));
      })
      // STORIES REALTIME
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, () => {
        loadStories(); // Recarrega grupos de stories na inserção
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'stories' }, (payload) => {
        setStoryGroups(prev => prev.map(group => ({
          ...group,
          stories: group.stories.filter((s: any) => s.id !== payload.old.id)
        })).filter(group => group.stories.length > 0)); 
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

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
      postsList.forEach((p: any) => feed.push({ ...p, display_date: p.created_at, is_repost: false }));

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
        .select('id, full_name, username, avatar_url')
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
          unique_key: item.uid || item.id,
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
          reposted_by_name: reposter ? reposter.full_name : null,
          reposted_by_id: item.reposter_id
        };
      });

      setPosts(mappedPosts);
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
          .select('id, full_name, username, avatar_url')
          .in('id', userIds);
          
        const profilesMap = (profilesData || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});

        const mapped = morePosts.map(p => ({
          ...mapPost(p, profilesMap),
          unique_key: `${p.id}-${nextPage}`
        }));
        
        setPosts(prev => [...prev, ...mapped]);
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

      if (storiesData && storiesData.length > 0) {
        const userIds = Array.from(new Set(storiesData.map(s => s.author_id)));
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username')
          .in('id', userIds);

        const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});

        const groups = userIds.map(uid => {
          const userStories = storiesData.filter(s => s.author_id === uid);
          const author = profilesMap[uid] || {};
          return {
            author_id: uid,
            author_name: author.full_name || 'Usuário',
            author_avatar: author.avatar_url,
            stories: userStories
          };
        });

        setStoryGroups(groups);
      } else {
        setStoryGroups([]);
      }
    } catch (err) {
      console.error("Erro stories:", err);
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
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            {isMounted && <div className="w-9 h-9 rounded-2xl bg-whatsapp-teal/20 flex items-center justify-center text-whatsapp-teal"><Flame className="w-5 h-5 fill-whatsapp-teal" /></div>}
            <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">FéConecta</h1>
          </div>

          <div className="flex items-center gap-2">
            {isMounted && (
              <>
                <button className="p-2.5 bg-black/5 dark:bg-white/5 rounded-xl text-gray-400 hover:text-whatsapp-teal"><Search className="w-5 h-5" /></button>
                <button className="p-2.5 bg-black/5 dark:bg-white/5 rounded-xl text-gray-400 hover:text-whatsapp-teal relative"><Bell className="w-5 h-5" /><div className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#080808]" /></button>

                <Link href="/profile" className="ml-1 w-9 h-9 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 hover:opacity-80">
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} className="w-full h-full object-cover" alt="Perfil" />
                  ) : (
                    <div className="w-full h-full bg-whatsapp-teal/10 flex items-center justify-center"><UserCircle2 className="w-6 h-6 text-whatsapp-teal" /></div>
                  )}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-24">
        <StoriesBar 
          storyGroups={storyGroups} 
          myStoryGroup={storyGroups.find(g => g.author_id === currentUser?.id)}
          currentUser={currentUser} 
          onAddStory={() => setShowStoryCreator(true)} 
          onViewGroup={(group: any) => setViewingStoryGroup(group)} 
        />

        <div className="hidden sm:block mt-2 px-4">
          <CreatePost user={currentUser} onPostCreated={() => loadInitialPosts(true)} />
        </div>

        <div className="px-4 py-4 space-y-4">
          {posts.length > 0 ? (
            posts.map((post, idx) => (
              <React.Fragment key={post.uid || post.unique_key || post.id}>
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

      {showStoryCreator && <StoryCreator open={showStoryCreator} onClose={() => setShowStoryCreator(false)} user={currentUser} onCreated={loadStories} />}
      {viewingStoryGroup && <StoryViewer storyGroups={storyGroups} startUserIndex={storyGroups.indexOf(viewingStoryGroup)} currentUser={currentUser} onClose={() => setViewingStoryGroup(null)} />}
    </div>
  );
}