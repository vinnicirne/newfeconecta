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
      // Filtramos por posts que tenham o prefixo de versículo 📖 ou marcador de testemunho
      const { data, error } = await supabase
        .from("posts")
        .select(`
          *,
          profiles:author_id (*),
          interactions:post_interactions (id, type, user_id),
          comments:post_comments (id)
        `)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Filtro local simples para simular a aba DFCH (posts com bíblia ou curtos de reflexão)
      const dfchOnly = data?.filter((p: any) => 
        p.content.includes("📖") || p.is_testimony === true
      );

      setPosts(dfchOnly || []);
    } catch (error) {
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
                onClick={() => router.push('/bible')}
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
        onClick={() => router.push('/bible')}
        className="fixed bottom-24 right-6 w-16 h-16 bg-whatsapp-teal text-white rounded-3xl shadow-2xl shadow-whatsapp-teal/40 flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-40 animate-bounce"
      >
        <Plus size={32} />
      </button>

    </div>
  );
}
