"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { 
  Rss, 
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

export default function FeedPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [storyGroups, setStoryGroups] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid'|'list'>('list');
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [viewingStoryGroup, setViewingStoryGroup] = useState<any>(null);
  const [mobilePostOpen, setMobilePostOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single()
          .then(({ data }) => setCurrentUser(data || user));
      }
    });
    
    // Inscrição Realtime para novos posts
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        loadData(true);
      })
      .subscribe();

    loadData();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async (reset = false) => {
    if (loading && !reset) return;
    setLoading(true);
    
    const currentPage = reset ? 1 : page;
    const limit = 20;
    const from = (currentPage - 1) * limit;
    const to = from + limit - 1;

    const { data: postsData } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);
    
    const { data: repostsData } = await supabase
      .from('reposts')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    const postsList = postsData || [];
    const repostsList = repostsData || [];

    // Checar se carregou todos os posts
    if (postsList.length < limit && repostsList.length < limit) {
      setHasMore(false);
    }

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
          id: `${originalPost.id}-repost-${r.profile_id}`,
          original_post_id: originalPost.id,
          display_date: r.created_at,
          is_repost: true,
          reposter_id: r.profile_id
        });
      }
    });

    feed.sort((a, b) => new Date(b.display_date).getTime() - new Date(a.display_date).getTime());

    const userIds = new Set<string>();
    feed.forEach(item => {
      if (item.user_id || item.author_id) userIds.add(item.user_id || item.author_id);
      if (item.reposter_id) userIds.add(item.reposter_id);
    });

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, username, is_verified, verification_label')
      .in('id', Array.from(userIds));

    const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.id] = p;
      return acc;
    }, {});

    const newPosts = feed.map(item => {
      const profile = profilesMap[item.author_id || item.user_id] || {};
      const reposter = item.is_repost ? profilesMap[item.reposter_id] : null;
      return {
        ...item,
        author_name: profile.full_name || 'Usuário',
        author_avatar: profile.avatar_url,
        author_username: profile.username || 'usuario',
        is_verified: profile.is_verified,
        verification_label: profile.verification_label,
        post_type: item.post_type || item.media_type || 'text',
        reposted_by_name: reposter ? reposter.full_name : null
      };
    });

    if (reset) {
      setPosts(newPosts);
      setPage(1);
      setHasMore(true);
    } else {
      setPosts(prev => [...prev, ...newPosts]);
      setPage(prev => prev + 1);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading && hasMore) {
        loadData();
      }
    }, { threshold: 0.5 });

    const sensor = document.getElementById('feed-sensor');
    if (sensor) observer.observe(sensor);

    return () => observer.disconnect();
  }, [loading, hasMore, page]);

  return (
    <div className="pb-24 max-w-2xl mx-auto flex flex-col h-full">
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
           <CreatePost user={currentUser} onPostCreated={() => loadData(true)} />
        </div>


        {/* Post Feed */}
        <div className={cn(
          "space-y-4 pt-4",
          viewMode === 'grid' && "grid grid-cols-2 gap-2 px-2 space-y-0"
        )}>
          {posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              currentUser={currentUser} 
              onDeleted={() => loadData(true)}
              onUpdated={() => loadData(true)}
            />
          ))}
          
          {posts.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
               <RefreshCw className="w-8 h-8 mb-4 animate-spin-slow" />
               <p className="text-sm font-bold uppercase tracking-widest">Nenhuma publicação encontrada</p>
            </div>
          )}

          {/* Sensor de Rolagem Infinita */}
          <div id="feed-sensor" className="h-20 flex items-center justify-center">
             {loading && hasMore && (
               <div className="w-6 h-6 border-2 border-whatsapp-teal border-t-transparent rounded-full animate-spin" />
             )}
          </div>
        </div>
      </div>

      {/* Floating Action Button (Mobile Only) */}
      <button 
        onClick={() => setMobilePostOpen(true)}
        className="sm:hidden fixed bottom-6 right-6 w-16 h-16 rounded-[24px] bg-whatsapp-teal text-white flex items-center justify-center shadow-2xl shadow-whatsapp-teal/40 active:scale-90 transition-transform z-40 border-4 border-white dark:border-whatsapp-dark"
      >
        <PlusCircle className="w-8 h-8" />
      </button>

      {/* Modals & Sheets */}
      <MobilePostSheet 
        open={mobilePostOpen} 
        onClose={() => setMobilePostOpen(false)} 
        user={currentUser}
        onPostCreated={() => loadData(true)}
      />

      <StoryCreator 
        open={showStoryCreator} 
        onClose={() => setShowStoryCreator(false)} 
        user={currentUser}
        onCreated={() => loadData(true)}
      />

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
