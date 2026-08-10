"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { MessageCircle, Flame, Users, Calendar, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function ChurchFeed({ params }: { params: { slug: string } }) {
  const [church, setChurch] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState("");
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    loadChurchAndFeed();
  }, [params.slug]);

  async function loadChurchAndFeed() {
    // Carrega dados da igreja
    const { data: churchData } = await supabase
      .from('churches')
      .select('*')
      .eq('slug', params.slug)
      .single();

    setChurch(churchData);

    // Verifica se o usuário é membro
    const { data: { user } } = await supabase.auth.getUser();
    if (user && churchData) {
      const { data: member } = await supabase
        .from('church_members')
        .select('approved')
        .eq('church_id', churchData.id)
        .eq('user_id', user.id)
        .maybeSingle();
      setIsMember(!!member?.approved);
    }

    // Carrega posts da igreja
    if (churchData) {
      const { data: feedPosts } = await supabase
        .from('church_posts')
        .select('*, author:profiles(full_name, avatar_url, username)')
        .eq('church_id', churchData.id)
        .order('created_at', { ascending: false });

      setPosts(feedPosts || []);
    }
  }

  async function createPost() {
    if (!newPost.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('church_posts')
      .insert({
        church_id: church.id,
        author_id: user.id,
        content: newPost,
        type: 'text'
      });

    if (error) {
      toast.error("Erro ao publicar");
    } else {
      toast.success("Publicado na Casa!");
      setNewPost("");
      loadChurchAndFeed(); // Atualiza feed
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white pb-24">
      {/* Header da Casa */}
      <div className="sticky top-0 bg-[#111B21] border-b border-[#25D366]/20 z-50 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-black text-xl">{church?.name}</h1>
            <p className="text-xs text-[#25D366]">Casa • Feed da Comunidade</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="bg-[#25D366]/10 px-3 py-1 rounded-full flex items-center gap-1">
              <Flame className="text-orange-400" size={16} />
              <span>Ativa</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6">
        {/* Campo de Novo Post */}
        {isMember && (
          <div className="bg-[#111B21] rounded-3xl p-5 mb-8">
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="O que o Senhor tem falado com nossa casa hoje?"
              className="w-full bg-transparent border-0 focus:ring-0 text-white placeholder:text-gray-500 resize-none h-24 outline-none"
            />
            <button
              onClick={createPost}
              className="mt-3 bg-[#25D366] text-black px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#00A884] transition-all"
            >
              <Send size={18} /> Publicar na Casa
            </button>
          </div>
        )}

        {/* Feed */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              Ainda não há publicações. Seja o primeiro a compartilhar!
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-[#111B21] rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <img 
                    src={post.author?.avatar_url || 'https://via.placeholder.com/40'} 
                    className="w-10 h-10 rounded-full" 
                  />
                  <div>
                    <p className="font-bold">{post.author?.full_name}</p>
                    <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                
                <p className="text-lg leading-relaxed text-white/90">{post.content}</p>
                
                <div className="flex gap-6 mt-6 text-gray-400">
                  <button className="flex items-center gap-2 hover:text-[#25D366] transition-colors">
                    <Flame size={20} /> {post.likes_count || 0}
                  </button>
                  <button className="flex items-center gap-2 hover:text-[#25D366] transition-colors">
                    <MessageCircle size={20} /> {post.comments_count || 0}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
