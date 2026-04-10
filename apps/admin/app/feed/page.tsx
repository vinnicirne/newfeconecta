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

// Mock User for Feed context
const mockCurrentUser = {
  id: "296f0f37-c8b8-4ad1-855c-4625f3f14731",
  email: "admin@feconecta.com.br",
  full_name: "Admin FéConecta",
  username: "admin",
  avatar_url: "https://github.com/shadcn.png",
  role: "admin"
};

export default function FeedPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [storyGroups, setStoryGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [viewingStoryGroup, setViewingStoryGroup] = useState<any | null>(null);
  const [mobilePostOpen, setMobilePostOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    // In a real app, load from base44
    // setPosts(await base44.entities.Post.filter({}, 'created_date', 20));
    
    // For now, use mocks to show the UI
    setPosts([
      {
        id: "1",
        author_name: "Pastor João Silva",
        author_avatar: "https://i.pravatar.cc/150?u=1",
        created_date: new Date().toISOString(),
        post_type: "text",
        content: "Sejam bem-vindos à FéConecta! Um lugar de paz e adoração.",
        background: "linear-gradient(135deg,#667eea,#764ba2)",
        likes: ["admin@feconecta.com.br"],
        comments_count: 5,
        shares_count: 2,
        reposts_count: 1
      },
      {
        id: "2",
        author_name: "Maria Oliveira",
        author_avatar: "https://i.pravatar.cc/150?u=2",
        created_date: new Date(Date.now() - 3600000).toISOString(),
        post_type: "image",
        media_url: "file:///c:/Users/THINKPAD/.gemini/antigravity/brain/8cf264da-3dc3-49ad-9bd1-cdbaf3529b9d/feconecta_admin_final_check_1775762163372.webp",
        likes: [],
        comments_count: 12,
        shares_count: 5,
        reposts_count: 3
      }
    ]);

    setStoryGroups([
      {
        author_id: "u-1",
        author_name: "Tiago",
        author_avatar: "https://i.pravatar.cc/150?u=3",
        allViewed: false,
        stories: [
          { id: "s1", media_url: "https://images.unsplash.com/photo-1518770660439-4636190af475", media_type: "image" }
        ]
      },
      {
        author_id: "u-2",
        author_name: "Camila",
        author_avatar: "https://i.pravatar.cc/150?u=4",
        allViewed: true,
        stories: [
          { id: "s2", media_url: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4", media_type: "image" }
        ]
      }
    ]);
    
    setLoading(false);
  };

  return (
    <div className="pb-24 max-w-2xl mx-auto flex flex-col h-full bg-gray-50 dark:bg-whatsapp-dark">
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
          currentUser={mockCurrentUser}
          onAddStory={() => setShowStoryCreator(true)}
          onViewGroup={(group: any) => setViewingStoryGroup(group)}
        />

        {/* Create Post Section (Desktop View) */}
        <div className="hidden sm:block">
           <CreatePost user={mockCurrentUser} onPostCreated={loadData} />
        </div>


        {/* Post Feed */}
        <div className={cn(
          "space-y-4",
          viewMode === 'grid' && "grid grid-cols-2 gap-2 px-2 space-y-0"
        )}>
          {posts.map(post => (
            <PostCard 
              key={post.id} 
              post={post} 
              currentUser={mockCurrentUser} 
              onDeleted={loadData}
              onUpdated={loadData}
            />
          ))}
          
          {posts.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
               <RefreshCw className="w-8 h-8 mb-4 animate-spin-slow" />
               <p className="text-sm font-bold uppercase tracking-widest">Nenhuma publicação encontrada</p>
            </div>
          )}
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
        user={mockCurrentUser}
        onPostCreated={loadData}
      />

      <StoryCreator 
        open={showStoryCreator} 
        onClose={() => setShowStoryCreator(false)} 
        user={mockCurrentUser}
        onCreated={loadData}
      />

      {viewingStoryGroup && (
        <StoryViewer 
          storyGroups={storyGroups}
          startUserIndex={storyGroups.indexOf(viewingStoryGroup)}
          currentUser={mockCurrentUser}
          onClose={() => setViewingStoryGroup(null)}
        />
      )}
    </div>
  );
}
