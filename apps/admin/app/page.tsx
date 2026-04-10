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
  List
} from "lucide-react";
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
  const [currentUser, setCurrentUser] = useState<any>(mockCurrentUser);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;
  
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [viewingStoryGroup, setViewingStoryGroup] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setCurrentUser({ ...user, ...profile });
      } else {
        setCurrentUser(mockCurrentUser);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    console.log("Current Posts State:", posts);
  }, [posts]);

  useEffect(() => {
    loadInitialPosts();
    loadStories();

    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          fetchPostAuthor(payload.new).then(postWithAuthor => {
             setPosts(prev => [postWithAuthor, ...prev]);
          });
        } else {
          loadInitialPosts();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchPostAuthor = async (post: any) => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', post.user_id).single();
    return mapPost({ ...post, author: profile });
  };

  const loadInitialPosts = async () => {
    setLoading(true);
    setPage(0);
    try {
      // Simplificado ao máximo para teste: pega tudo da tabela posts
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, PAGE_SIZE - 1);

      if (error) {
        console.error("Supabase Error (Posts):", error);
      } else if (data) {
        console.log("RAW DATA FROM SUPABASE:", data);
        setPosts(data.map(mapPost));
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error("Fetch Catch Error:", err);
    }
    setLoading(false);
  };

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPager = page + 1;
    const from = nextPager * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data } = await supabase
      .from('posts')
      .select('*, author:profiles!posts_user_id_fkey(*)')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (data) {
      setPosts(prev => [...prev, ...data.map(mapPost)]);
      setPage(nextPager);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoadingMore(false);
  };

  const mapPost = (post: any) => {
    // Se o join com author falhar, ainda mostramos o post com nome padrão
    const author = post.author || {};
    return {
      id: post.id,
      author_name: author.full_name || 'Usuário FéConecta',
      author_id: post.user_id,
      author_avatar: author.avatar_url || 'https://github.com/shadcn.png',
      created_date: post.created_at,
      post_type: post.post_type || post.media_type || 'text',
      content: post.content || '',
      media_url: post.media_url,
      background: (post.post_type === 'text' || post.media_type === 'text') ? (post.background_style || undefined) : undefined,
      likes: post.likes || [],
      likes_count: post.likes_count || 0,
      comments_count: post.comments_count || 0,
      shares_count: 0,
      reposts_count: 0
    };
  };

  const loadStories = async () => {
    try {
      const { data } = await supabase
        .from('stories')
        .select('*, author:profiles!stories_user_id_fkey(*)')
        .gt('expires_at', new Date().toISOString());

      if (data) {
         const groups: any[] = [];
         data.forEach(story => {
            let group = groups.find(g => g.author_id === story.user_id);
            if (!group) {
               const author = story.author || {};
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
  const lastPostRef = React.useCallback((node: any) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMorePosts();
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  return (
    <div suppressHydrationWarning className="pb-24 max-w-2xl mx-auto flex flex-col min-h-screen bg-gray-50 dark:bg-whatsapp-dark">
      {/* Search & Top Bar (Mobile Only Style Header) */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-whatsapp-dark/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 p-4 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-whatsapp-teal/10 flex items-center justify-center text-whatsapp-teal">
               <Flame className="w-6 h-6 fill-whatsapp-teal" />
            </div>
            <h1 className="text-xl font-black dark:text-white tracking-tight">FéConecta</h1>
         </div>
         <div className="flex items-center gap-2">
            <button className="p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-whatsapp-teal transition-all">
               <Search className="w-5 h-5" />
            </button>
            <button className="p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-whatsapp-teal transition-all relative">
               <Bell className="w-5 h-5" />
               <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-whatsapp-dark" />
            </button>
         </div>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        {/* Stories Section */}
        <StoriesBar 
          storyGroups={storyGroups}
          currentUser={currentUser}
          onAddStory={() => setShowStoryCreator(true)}
          onViewGroup={(group: any) => setViewingStoryGroup(group)}
        />

        {/* Create Post Section (Desktop View) */}
        <div className="hidden sm:block">
           <CreatePost user={currentUser} onPostCreated={loadInitialPosts} />
        </div>


        {/* Post Feed */}
        <div className={cn(
          "space-y-4 pb-10",
          viewMode === 'grid' && "grid grid-cols-2 gap-2 px-2 space-y-0"
        )}>
          {posts.map((post, idx) => (
            <div key={post.id} ref={idx === posts.length - 1 ? lastPostRef : null}>
              <PostCard 
                post={post} 
                currentUser={currentUser} 
                onDeleted={loadInitialPosts}
                onUpdated={loadInitialPosts}
              />
            </div>
          ))}
          
          {(loading || loadingMore) && (
            <div className="flex flex-col items-center justify-center py-10 opacity-40">
               <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="py-10 text-center opacity-30">
              <p className="text-[10px] font-black uppercase tracking-[0.2em]">Você chegou ao fim</p>
            </div>
          )}

          {posts.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
               <RefreshCw className="w-8 h-8 mb-4 animate-spin-slow" />
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
