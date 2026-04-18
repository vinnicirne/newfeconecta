"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Trash2, 
  MessageSquare, 
  User, 
  Clock, 
  Search, 
  Filter, 
  ExternalLink,
  ShieldAlert,
  Image as ImageIcon,
  Play,
  Type
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { toast } from "sonner";

interface Post {
  id: string;
  content: string;
  post_type: 'text' | 'image' | 'video';
  created_at: string;
  profiles: {
    full_name: string;
    avatar_url: string;
    username: string;
  };
}

export default function PostsManagementPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      setLoading(true);
      // 1. Busca os Posts (sem join quebrado)
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`id, content, post_type, created_at, author_id`)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      if (!postsData) return setPosts([]);

      // 2. Extrai IDs únicos dos autores
      const authorIds = Array.from(new Set(postsData.map(p => p.author_id).filter(Boolean)));
      
      // 3. Busca os Perfis em massa
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .in('id', authorIds);

      if (profilesError) throw profilesError;

      // 4. Mapeia Perfis para fácil acesso
      const profilesMap = (profilesData || []).reduce((acc: any, curr: any) => {
        acc[curr.id] = curr;
        return acc;
      }, {});

      // 5. Combina os dados
      const combined = postsData.map(post => ({
        ...post,
        profiles: profilesMap[post.author_id] || null
      }));

      setPosts(combined as any);
    } catch (err: any) {
      toast.error("Erro ao carregar posts: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deletePost(id: string) {
    if (!confirm("Tem certeza que deseja remover este post permanentemente? Esta ação não pode ser desfeita.")) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setPosts(posts.filter(p => p.id !== id));
      toast.success("Post removido com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao deletar post");
    }
  }

  const filteredPosts = posts.filter(p => {
    const matchesSearch = p.content?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || p.post_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 font-outfit">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-whatsapp-dark dark:text-white flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-whatsapp-teal" />
            Moderador de Posts
          </h1>
          <p className="text-gray-500 font-medium">Controle e moderação da comunidade em tempo real.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-whatsapp-teal/10 px-4 py-2 rounded-2xl border border-whatsapp-teal/20 text-whatsapp-teal font-black text-sm uppercase">
            {posts.length} Posts Totais
          </div>
        </div>
      </div>

      {/* FILTROS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-whatsapp-darkLighter p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm">
        <div className="relative col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            placeholder="Buscar por conteúdo ou autor..."
            className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-whatsapp-teal/20 transition-all font-medium"
            value={searchTerm}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <select 
            className="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-whatsapp-teal/20 appearance-none font-bold"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">Todos os Tipos</option>
            <option value="text">Apenas Texto</option>
            <option value="image">Imagens</option>
            <option value="video">Vídeos (Lumes)</option>
          </select>
        </div>
      </div>

      {/* LISTA DE POSTS */}
      <div className="bg-white dark:bg-whatsapp-darkLighter rounded-[32px] border border-gray-100 dark:border-white/5 shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center animate-pulse">
            <div className="w-12 h-12 bg-whatsapp-teal/20 rounded-full flex items-center justify-center mx-auto mb-4">
               <Clock className="w-6 h-6 text-whatsapp-teal animate-spin" />
            </div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Lendo o Feed...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="py-20 text-center">
            <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 font-bold">Nenhum post encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-50 dark:border-white/5">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Autor</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Conteúdo</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Tipo</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Data</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-whatsapp-teal/10 flex items-center justify-center overflow-hidden border border-whatsapp-teal/20">
                          {post.profiles?.avatar_url ? (
                            <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-whatsapp-teal" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-sm dark:text-white leading-none">
                            {post.profiles?.full_name || "Usuário Anonimo"}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">
                            @{post.profiles?.username || "sem_slug"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6 max-w-md">
                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 font-medium">
                        {post.content || <span className="italic opacity-50">Sem texto</span>}
                      </p>
                    </td>
                    <td className="p-6">
                      {post.post_type === 'video' ? (
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                          <Play className="w-3 h-3" /> Vídeo
                        </span>
                      ) : post.post_type === 'image' ? (
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 text-purple-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                          <ImageIcon className="w-3 h-3" /> Imagem
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                          <Type className="w-3 h-3" /> Texto
                        </span>
                      )}
                    </td>
                    <td className="p-6">
                      <p className="text-[10px] font-bold text-gray-400">
                        {moment(post.created_at).format('DD/MM/YY')}
                      </p>
                      <p className="text-[9px] text-gray-400 opacity-70">
                        {moment(post.created_at).fromNow()}
                      </p>
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 text-whatsapp-teal hover:bg-whatsapp-teal/10 rounded-xl transition-all">
                          <ExternalLink className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => deletePost(post.id)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
