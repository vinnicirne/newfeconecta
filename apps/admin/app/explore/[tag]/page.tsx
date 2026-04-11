"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Hash, MessageSquare } from "lucide-react";
import Link from "next/link";
import PostCard from "@/components/feed/PostCard";
import { supabase } from "@/lib/supabase";

export default function ExploreHashtagPage() {
  const params = useParams();
  const router = useRouter();
  const tag = decodeURIComponent(params.tag as string).replace('#', '');
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState(tag);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    const cleanTag = searchQuery.trim().replace(/^#/, '');
    router.push(`/explore/${cleanTag}`);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setCurrentUser({ ...user, ...profile });
      }

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .ilike('content', `%#${tag}%`)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error("❌ Erro ao buscar posts por hashtag:", postsError);
        setLoading(false);
        return;
      }

      if (postsData && postsData.length > 0) {
        // Buscar autores em lote
        const userIds = Array.from(new Set(postsData.map((p: any) => p.author_id || p.user_id).filter(Boolean)));
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, username')
          .in('id', userIds);

        const profilesMap = (profiles || []).reduce((acc: any, p: any) => {
          acc[p.id] = p;
          return acc;
        }, {});

        // Combinar
        const combined = postsData.map(post => ({
          ...post,
          author: profilesMap[post.author_id || post.user_id] || {}
        }));
        
        setPosts(combined);
      } else {
        setPosts([]);
      }
      setLoading(false);
    };

    fetchData();
  }, [tag]);

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#080808]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/')}
              className="p-2 hover:bg-white/5 rounded-xl text-gray-400 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <form onSubmit={handleSearch} className="flex-1 relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-whatsapp-green" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar hashtag..."
                className="w-full bg-white/5 border border-white/5 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-whatsapp-green/50 transition-all"
              />
            </form>
          </div>
          <div className="px-1">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none">
              {posts.length} Resultados para <span className="text-whatsapp-green">#{tag}</span>
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-whatsapp-green/20 border-t-whatsapp-green rounded-full animate-spin" />
            <p className="text-sm text-gray-500 font-medium">Buscando testemunhos...</p>
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-2">
            {posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={{
                  ...post,
                  author_name: post.author?.full_name || post.author?.username || 'Usuário',
                  author_username: post.author?.username || 'user',
                  author_id: post.author_id,
                  author_avatar: post.author?.avatar_url,
                  created_date: post.created_at
                }} 
                currentUser={currentUser} 
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8 text-gray-600" />
            </div>
            <h3 className="text-white font-bold text-lg mb-1">Nenhuma publicação encontrada</h3>
            <p className="text-gray-500 text-sm max-w-xs">
              Ainda não existem posts com a hashtag #{tag}. Que tal ser o primeiro a postar?
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
