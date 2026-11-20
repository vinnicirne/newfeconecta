"use client";

import React, { useState, useEffect } from "react";
import { 
  Bookmark, 
  ArrowLeft,
  RefreshCw 
} from "lucide-react";
import Link from "next/link";
import PostCard from "@/components/feed/PostCard";
import { supabase } from "@/lib/supabase";

export default function SavedPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser(profile || user);
      await loadSavedPosts(user.id);
    } catch {
      setLoadError("Não foi possível acessar suas publicações salvas. Tente novamente.");
      setLoading(false);
    }
  };

  const loadSavedPosts = async (userId: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      // 1. Buscar IDs dos posts salvos
      const { data: savedIds, error: savedError } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', userId);

      if (savedError) throw savedError;

      if (savedIds && savedIds.length > 0) {
        const ids = savedIds.map(s => s.post_id);

        // 2. Buscar dados dos posts da tabela base
        const { data: postsData, error: postsError } = await supabase
          .from('posts')
          .select('*')
          .in('id', ids)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        if (postsData) {
          // 3. Hidratar autores
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

          setPosts(combined.map(mapPost));
        }
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error("Erro ao carregar salvos:", err);
      setLoadError("Não foi possível carregar suas publicações. Verifique sua conexão e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const mapPost = (post: any) => {
    const author = post.author || {};
    return {
      id: post.id,
      author_name: author.full_name || author.username || 'FéConecta',
      author_username: author.username || 'feconecta',
      author_id: post.author_id || post.user_id,
      author_avatar: author.avatar_url,
      created_date: post.created_at,
      display_date: post.display_date || post.created_at,
      is_repost: !!post.is_repost,
      reposted_by_name: post.reposted_by_name,
      reposted_by_username: post.reposted_by_username,
      post_type: post.post_type || post.media_type || 'text',
      content: post.content || '',
      media_url: post.media_url,
      background: (post.post_type === 'text' || post.media_type === 'text')
        ? (post.background || post.background_style || undefined)
        : undefined,
      likes: post.likes || [],
      likes_count: post.likes_count || 0,
      comments_count: post.comments_count || 0,
      shares_count: post.shares_count || 0,
      reposts_count: post.reposts_count || 0
    };
  };

  return (
    <main className="min-h-screen bg-[#080808]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#080808]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" aria-label="Voltar ao Feed" className="p-2 hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-bold text-white">Publicações Salvas</h1>
          </div>
          <div className="w-9 h-9 flex items-center justify-center text-whatsapp-teal">
            <Bookmark className="w-5 h-5 fill-whatsapp-teal" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto py-6">
        {loading ? (
          <div role="status" className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-8 h-8 animate-spin text-whatsapp-teal" />
            <span className="sr-only">Carregando publicações salvas…</span>
          </div>
        ) : loadError ? (
          <div role="alert" className="mx-4 flex flex-col items-center gap-4 py-20 text-center text-gray-300">
            <p>{loadError}</p>
            <button onClick={() => currentUser?.id ? loadSavedPosts(currentUser.id) : checkAuth()} className="rounded-xl bg-whatsapp-teal px-5 py-2.5 text-sm font-bold text-white hover:bg-whatsapp-tealLight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal">Tentar novamente</button>
          </div>
        ) : !currentUser ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 px-10 text-center text-white">
            <Bookmark className="w-14 h-14 text-gray-500" aria-hidden="true" />
            <h2 className="text-xl font-bold">Entre para ver suas publicações salvas</h2>
            <Link href="/login" className="rounded-full bg-whatsapp-teal px-6 py-2.5 font-bold text-white hover:bg-whatsapp-tealLight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal">Entrar</Link>
          </div>
        ) : posts.length > 0 ? (
          <div className="space-y-4 px-4">
            {posts.map((post, idx) => (
              <div key={`${post.id}-${idx}`}>
                <PostCard
                  post={post}
                  currentUser={currentUser}
                  onDeleted={(id: string) => setPosts(prev => prev.filter(p => p.id !== id))}
                  onUpdated={() => loadSavedPosts(currentUser.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 px-10 text-center text-white">
            <Bookmark className="w-16 h-16 mb-6 text-gray-600" />
            <h2 className="text-xl font-bold mb-2">Nada salvo ainda</h2>
              <p className="text-sm text-gray-400">As publicações que você salvar aparecerão aqui para rever depois.</p>
            <Link href="/" className="mt-8 px-6 py-2 bg-whatsapp-teal rounded-full text-white font-bold hover:bg-whatsapp-tealLight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal">
              Voltar para o Feed
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
