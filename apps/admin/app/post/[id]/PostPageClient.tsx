"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import PostCard from "@/components/feed/PostCard";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function PostPageClient({ postId }: { postId: string }) {
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      try {
        // 1. Get User (Protected with cache to avoid AbortError)
        try {
          const cached = localStorage.getItem('fc_profile_cache');
          if (cached) {
            const profile = JSON.parse(cached);
            setCurrentUser(profile);
          } else {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
              const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle();
              setCurrentUser(profile);
            }
          }
        } catch (authErr) {
          console.warn("Auth check skipped due to lock contention/strict mode.");
        }

        // 2. Fetch Post
        const { data: postData, error } = await supabase
          .from('posts')
          .select('*')
          .eq('id', postId)
          .maybeSingle();

        if (error || !postData) throw new Error("Publicação não encontrada");

        // 3. Fetch Author Profile separately
        const authorId = postData.author_id || postData.user_id;
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, username, is_verified, verification_label')
          .eq('id', authorId)
          .maybeSingle();

        // Map post data to match PostCard expectations
        const mappedPost = {
          ...postData,
          author_name: profile?.full_name || 'FéConecta',
          author_username: profile?.username || 'feconecta',
          author_id: authorId,
          author_avatar: profile?.avatar_url,
          created_date: postData.created_at,
          display_date: postData.created_at,
          likes: postData.likes || [],
          likes_count: postData.likes_count || (postData.likes ? postData.likes.length : 0),
          is_verified: profile?.is_verified,
          verification_label: profile?.verification_label
        };

        setPost(mappedPost);
      } catch (err) {
        console.error("Post loading error:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [postId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0c0c0c] flex items-center justify-center">
        <RefreshCw className="animate-spin text-whatsapp-teal w-8 h-8" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0c0c0c] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-black dark:text-white uppercase tracking-widest mb-4">Publicação não encontrada</h1>
        <button 
          onClick={() => router.push('/')}
          className="px-8 py-3 bg-whatsapp-teal text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0c0c0c] pb-10">
      {/* Header Fixo de Navegação */}
      <div className="sticky top-0 z-50 bg-white/90 dark:bg-[#0c0c0c]/90 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 px-4 py-3 flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95"
        >
          <ArrowLeft className="w-5 h-5 dark:text-white" />
        </button>
        <div>
          <h2 className="text-sm font-black dark:text-white uppercase tracking-tighter">Publicação</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Ver detalhes</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pt-6 px-4 lg:px-0">
        <PostCard 
          post={post} 
          currentUser={currentUser}
          isPriority={true}
          onDeleted={() => router.push('/')}
          onUpdated={(updated: any) => setPost((prev: any) => ({ ...prev, ...updated }))}
        />
      </div>

      {/* Guest Paywall Overlay */}
      {!currentUser && (
        <div className="fixed bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/90 to-transparent pt-32 pb-8 px-6 z-50 animate-in slide-in-from-bottom duration-500">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h3 className="text-2xl font-black text-white">Participe da conversa</h3>
            <p className="text-gray-300 text-sm">
              Faça login para curtir, comentar e interagir com esta e outras milhares de publicações da comunidade FéConecta.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button 
                onClick={() => router.push('/login')}
                className="px-8 py-3 bg-whatsapp-teal text-white rounded-2xl font-black text-sm hover:opacity-90 transition-all shadow-lg shadow-whatsapp-teal/20"
              >
                Fazer Login
              </button>
              <button 
                onClick={() => router.push('/register')}
                className="px-8 py-3 bg-white/10 text-white rounded-2xl font-bold text-sm hover:bg-white/20 transition-all border border-white/10"
              >
                Criar Conta Gratuita
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
