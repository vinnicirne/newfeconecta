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
  List,
  Menu
} from "lucide-react";
import CreatePost from "@/components/feed/CreatePost";
import PostCard from "@/components/feed/PostCard";
import StoriesBar from "@/components/feed/StoriesBar";
import StoryCreator from "@/components/feed/StoryCreator";
import StoryViewer from "@/components/feed/StoryViewer";
import MobilePostSheet from "@/components/feed/MobilePostSheet";
import NotificationCenter from "@/components/feed/NotificationCenter";
import MobileMenu from "@/components/feed/MobileMenu";
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
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          // Busca perfil com fallback imediato para o objeto de auth
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
          const identity = profile || { 
            id: authUser.id, 
            full_name: authUser.user_metadata?.full_name || 'Usuário',
            username: authUser.user_metadata?.username || 'user',
            avatar_url: authUser.user_metadata?.avatar_url
          };
          setCurrentUser(identity);
          loadUnreadCount(identity.id);
        }
      } catch (err: any) {
        console.error("Auth error in Feed:", err);
      }
    };

    initAuth();
    
    // Inscrição Realtime com Blindagem de Canal
    const postChannel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        loadData(true);
      })
      .subscribe((status) => {
        if (status === 'TIMED_OUT' || status === 'CLOSED') {
          console.warn("⚠️ Conexão do Feed perdida. Reiniciando...");
          postChannel.track({}); // Tentativa de re-track
        }
      });

    // Inscrição de Notificações com Vínculo de ID
    const notifChannel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications' 
      }, (payload) => {
        if (payload.new.recipient_id === currentUser?.id) {
          setUnreadCount(prev => prev + 1);
        }
      })
      .subscribe();

    // Só dispara o carregamento se já tivermos tentado o Auth ou se for o primeiro mount
    if (loading) loadData();

    return () => {
      supabase.removeChannel(postChannel);
      supabase.removeChannel(notifChannel);
    };
  }, [currentUser?.id]);

  useEffect(() => {
    // Escutar por mudanças na URL para Scroll Automático (Deep Linking)
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    
    if (postId) {
      // GARANTIA TOTAL: Se estamos vindo de notificação, NADA de câmera aberta.
      setShowStoryCreator(false);
      setMobilePostOpen(false);
      setViewingStoryGroup(null);
      setShowNotifications(false);
      
      if (posts.length > 0) {
        setTimeout(() => {
          const element = document.getElementById(`post-${postId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-2', 'ring-whatsapp-green', 'ring-offset-2', 'dark:ring-offset-whatsapp-dark');
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-whatsapp-green', 'ring-offset-2', 'dark:ring-offset-whatsapp-dark');
            }, 3000);
          }
        }, 500);
      }
    }
  }, [posts]);

  const loadUnreadCount = async (id: string) => {
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', id)
      .eq('is_read', false);
    
    setUnreadCount(count || 0);
  };

  const loadData = async (reset = false) => {
    if (loading && !reset) return;
    setLoading(true);
    
    try {
      const currentPage = reset ? 1 : page;
      const limit = 15;
      const from = (currentPage - 1) * limit;
      const to = from + limit - 1;

      // 1. CARREGAR STORIES REAIS (Últimas 24h)
      if (reset) {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: storiesData } = await supabase
          .from('stories')
          .select('*, profiles(id, full_name, avatar_url, username)')
          .gt('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: false });

        if (storiesData) {
          const grouped: Record<string, any> = {};
          storiesData.forEach((s: any) => {
            const uid = s.user_id;
            if (!grouped[uid]) {
              grouped[uid] = {
                user_id: uid,
                user_name: s.profiles?.full_name || s.profiles?.username || "Usuário",
                user_avatar: s.profiles?.avatar_url,
                stories: []
              };
            }
            grouped[uid].stories.push(s);
          });
          setStoryGroups(Object.values(grouped));
        }
      }

      // 2. CARREGAR POSTS E REPOSTS
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

      if (postsList.length < limit && repostsList.length < limit) {
        setHasMore(false);
      }

      const repostedPostIds = repostsList.map((r: any) => r.post_id);
      const existingIdsInPage = new Set(postsList.map((p: any) => p.id));
      const missingPostIds = repostedPostIds.filter((id: any) => !existingIdsInPage.has(id));

      let missingPosts: any[] = [];
      if (missingPostIds.length > 0) {
        const { data } = await supabase.from('posts').select('*').in('id', missingPostIds);
        missingPosts = data || [];
      }

      const feed: any[] = [];
      postsList.forEach((p: any) => feed.push({ ...p, display_date: p.created_at, is_repost: false, feed_uid: `post-${p.id}` }));
      
      repostsList.forEach((r: any) => {
        const originalPost = postsList.find((p: any) => p.id === r.post_id) || missingPosts.find((p: any) => p.id === r.post_id);
        if (originalPost) {
          feed.push({
            ...originalPost,
            feed_uid: `repost-${originalPost.id}-${r.profile_id}`,
            original_post_id: originalPost.id,
            display_date: r.created_at,
            is_repost: true,
            reposter_id: r.profile_id
          });
        }
      });

      let finalFeed = feed;
      if (searchTerm.trim()) {
        const lowerSearch = searchTerm.toLowerCase();
        finalFeed = feed.filter(item => 
          item.content?.toLowerCase().includes(lowerSearch) || 
          item.author_name?.toLowerCase().includes(lowerSearch) ||
          item.author_username?.toLowerCase().includes(lowerSearch)
        );
      }

      finalFeed.sort((a, b) => new Date(b.display_date).getTime() - new Date(a.display_date).getTime());

      // 3. MAPEAR PERFIS (OTIMIZADO)
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
        setPage(2);
        setHasMore(true);
      } else {
        // Blindagem contra duplicatas entre páginas
        const existingGlobalIds = new Set(posts.map(p => p.feed_uid));
        const filteredNewPosts = newPosts.filter(p => !existingGlobalIds.has(p.feed_uid));
        setPosts(prev => [...prev, ...filteredNewPosts]);
        setPage(prev => prev + 1);
      }
    } catch (err) {
      console.error("Feed Critical Error:", err);
    } finally {
      setLoading(false);
    }
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
            <button 
              onClick={() => setShowMobileMenu(true)}
              className="w-10 h-10 rounded-2xl bg-whatsapp-teal/10 flex items-center justify-center text-whatsapp-teal active:scale-90 transition-transform"
            >
               <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-black dark:text-white tracking-tight">FéConecta</h1>
         </div>
         <div className="flex items-center gap-2">
            {isSearching ? (
               <div className="relative animate-in slide-in-from-right-2 duration-300">
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Buscar no feed..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onBlur={() => !searchTerm && setIsSearching(false)}
                    className="w-40 sm:w-64 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl py-2 pl-4 pr-10 text-xs focus:outline-none focus:ring-1 focus:ring-whatsapp-teal"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-whatsapp-teal" />
               </div>
            ) : (
               <button 
                 onClick={() => setIsSearching(true)}
                 className="p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-whatsapp-teal transition-all"
               >
                  <Search className="w-5 h-5" />
               </button>
            )}
            
            <button 
              onClick={() => setShowNotifications(true)}
              className="p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-whatsapp-teal transition-all relative"
            >
               <Bell className="w-5 h-5" />
               {unreadCount > 0 && (
                 <div className="absolute top-2 right-2 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-whatsapp-dark flex items-center justify-center">
                    <span className="text-[10px] text-white font-bold">{unreadCount}</span>
                 </div>
               )}
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

        {/* Create Post Section (Web View Only) */}
        <div className="hidden lg:block">
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

      <NotificationCenter 
        open={showNotifications} 
        onClose={() => {
          setShowNotifications(false);
          setUnreadCount(0);
        }} 
        userId={currentUser?.id}
      />

      <MobileMenu 
        open={showMobileMenu} 
        onClose={() => setShowMobileMenu(false)} 
        user={currentUser}
      />
    </div>
  );
}
