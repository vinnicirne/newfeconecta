"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Sparkles, MessageCircle, Heart, Share2, 
  ArrowLeft, Search, BookOpen, Quote, 
  Flame, Send, Plus
} from "lucide-react";
import { useRouter } from "next/navigation";
import PostCard from "@/components/feed/PostCard";
import { toast } from "sonner";

export default function DFCHPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetchUserData();
    fetchDFCHPosts();
  }, []);

  async function fetchUserData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);
    }
  }

  async function fetchDFCHPosts() {
    try {
      setLoading(true);
      // Busca simplificada para não violar chaves estrangeiras que não existem neste projeto
      const { data, error } = await supabase
        .from("posts")
        .select(`*`)
        .order("created_at", { ascending: false })
        .limit(50); // Ampliado pois o filtro é local

      if (error) throw error;

      // Filtro local simples para simular a aba DFCH (posts com bíblia ou curtos de reflexão)
      const dfchOnly = data?.filter((p: any) => 
        (p.content && p.content.includes("📖")) || p.is_testimony === true
      ) || [];

      // Carrega perfis
      const userIds = Array.from(new Set(dfchOnly.map((p: any) => p.user_id || p.author_id))).filter(Boolean);
      let profilesMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("*")
          .in("id", userIds);
          
        if (profilesData) {
          profilesMap = profilesData.reduce((acc: any, prof: any) => {
            acc[prof.id] = prof;
            return acc;
          }, {});
        }
      }

      // Mapeia posts pro formato que o PostCard entende (O mesmo do feed principal)
      const mappedPosts = dfchOnly.map((post: any) => {
        const profile = profilesMap[post.user_id || post.author_id] || {};
        return {
          id: post.id,
          author_name: profile.full_name || 'FéConecta',
          author_username: profile.username || '@feconecta',
          author_id: post.user_id || post.author_id,
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
        };
      });

      setPosts(mappedPosts);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar revelações");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0A]">
      
      {/* HEADER DINÂMICO */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <button 
                onClick={() => router.back()}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 dark:text-white" />
              </button>
              <h1 className="text-lg font-black dark:text-white font-outfit tracking-tight">Deus falou comigo!</h1>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-whatsapp-teal/10 flex items-center justify-center text-whatsapp-teal">
                 <Sparkles className="w-4 h-4" />
              </div>
           </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto py-8 px-4 pb-32">
        
        {/* BANNER DE INCENTIVO */}
        <div className="mb-10 text-center space-y-4">
           <div className="inline-flex items-center gap-2 px-4 py-2 bg-whatsapp-teal/10 rounded-full text-whatsapp-teal">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest">O que você aprendeu hoje?</span>
           </div>
           <h2 className="text-3xl font-black dark:text-white leading-none">
              Compartilhe sua <br/> <span className="text-whatsapp-teal">Revelação Diária</span>
           </h2>
           <p className="text-gray-500 text-sm font-medium">Leia o versículo do dia e inspire a comunidade com sua reflexão.</p>
           
           <div className="pt-4">
              <button 
                onClick={() => router.push('/bible/search')}
                className="px-8 py-4 bg-whatsapp-teal text-white rounded-3xl font-black text-sm shadow-xl shadow-whatsapp-teal/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto"
              >
                <Plus className="w-5 h-5" /> Publicar Revelação
              </button>
           </div>
        </div>

        {/* FEED ESPECÍFICO */}
        <div className="space-y-6">
           {loading ? (
             Array.from({ length: 3 }).map((_, i) => (
               <div key={i} className="bg-white dark:bg-[#111] rounded-[32px] p-6 animate-pulse space-y-4 shadow-sm border border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                     <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5" />
                     <div className="space-y-2">
                        <div className="w-32 h-4 bg-gray-100 dark:bg-white/5 rounded-full" />
                        <div className="w-20 h-3 bg-gray-100 dark:bg-white/5 rounded-full" />
                     </div>
                  </div>
                  <div className="w-full h-32 bg-gray-100 dark:bg-white/5 rounded-3xl" />
               </div>
             ))
           ) : posts.length > 0 ? (
             posts.map(post => (
               <div key={post.id} className="relative group">
                  <div className="absolute -left-2 top-8 w-1 h-32 bg-whatsapp-teal rounded-full blur-sm opacity-50 group-hover:opacity-100 transition-opacity" />
                  <PostCard 
                    post={post} 
                    currentUser={currentUser}
                    onUpdate={fetchDFCHPosts}
                  />
               </div>
             ))
           ) : (
             <div className="py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-300">
                   <Quote className="w-10 h-10" />
                </div>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Nenhuma revelação ainda...</p>
                <p className="text-gray-400 text-sm px-10">Seja o primeiro a contar o que Deus falou com você!</p>
             </div>
           )}
        </div>

      </div>

      {/* FAB MOBILE */}
      <button 
        onClick={() => router.push('/bible/search')}
        className="fixed bottom-24 right-6 w-16 h-16 bg-whatsapp-teal text-white rounded-3xl shadow-2xl shadow-whatsapp-teal/40 flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-40 animate-bounce"
      >
        <Plus size={32} />
      </button>

    </div>
  );
}
