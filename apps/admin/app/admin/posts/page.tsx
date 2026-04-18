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
  Type,
  X,
  Eye,
  Maximize2
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import { toast } from "sonner";

interface Post {
  id: string;
  content: string;
  post_type: 'text' | 'image' | 'video';
  media_url?: string;
  media_type?: string;
  created_at: string;
  author_id: string;
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
  const [previewPost, setPreviewPost] = useState<Post | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      setLoading(true);
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`id, content, post_type, created_at, author_id, media_url, media_type`)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      if (!postsData) return setPosts([]);

      const authorIds = Array.from(new Set(postsData.map(p => p.author_id).filter(Boolean)));
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, username')
        .in('id', authorIds);

      if (profilesError) throw profilesError;

      const profilesMap = (profilesData || []).reduce((acc: any, curr: any) => {
        acc[curr.id] = curr;
        return acc;
      }, {});

      const combined = postsData.map(post => {
        // Higienização Atômica (Previne renderização de strings 'null' do banco)
        const cleanMediaUrl = (post.media_url === 'null' || !post.media_url) ? null : post.media_url;
        
        return {
          ...post,
          media_url: cleanMediaUrl,
          profiles: profilesMap[post.author_id] || null
        };
      });

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
      setPreviewPost(null);
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
      {/* MODAL DE PREVIEW PREMIUM */}
      {previewPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <button 
            onClick={() => setPreviewPost(null)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all z-[110]"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="bg-white dark:bg-[#080808] w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
            <div className="flex-1 bg-black/5 dark:bg-[#111] flex items-center justify-center overflow-hidden min-h-[300px] relative">
              {previewPost.post_type === 'image' && previewPost.media_url && (
                <img src={previewPost.media_url} className="w-full h-full object-contain" alt="" />
              )}
              {previewPost.post_type === 'video' && previewPost.media_url && (
                <div className="w-full h-full flex items-center justify-center">
                  {/* Motor Universal (Suporte YouTube no Admin) */}
                  {(() => {
                    const ytId = previewPost.media_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
                    if (ytId) {
                      return (
                        <iframe
                          className="w-full aspect-video rounded-2xl shadow-2xl"
                          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      );
                    }
                    return <video src={previewPost.media_url} controls className="w-full h-full" autoPlay />;
                  })()}
                </div>
              )}
              {!previewPost.media_url && (
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <Type className="w-12 h-12 opacity-20" />
                  <span className="text-[10px] uppercase font-black tracking-widest">Sem Mídia (Apenas Texto)</span>
                </div>
              )}
            </div>

            <div className="w-full md:w-[380px] p-8 flex flex-col border-l border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full bg-whatsapp-teal/10 overflow-hidden">
                  {previewPost.profiles?.avatar_url && <img src={previewPost.profiles.avatar_url} className="w-full h-full object-cover" />}
                </div>
                <div>
                  <h3 className="font-black dark:text-white uppercase text-xs tracking-widest">{previewPost.profiles?.full_name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold">@{(previewPost.profiles?.username || 'anon').toLowerCase()}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">
                  {previewPost.content}
                </p>
              </div>

              <div className="pt-8 border-t border-gray-100 dark:border-white/5 space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-[10px] font-black uppercase text-gray-400">Publicado {moment(previewPost.created_at).fromNow()}</span>
                </div>
                <button 
                  onClick={() => deletePost(previewPost.id)}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  <Trash2 className="w-4 h-4" /> Excluir Publicação
                </button>
                <button 
                  onClick={() => setPreviewPost(null)}
                  className="w-full py-4 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 rounded-2xl font-black text-xs uppercase hover:opacity-80 transition-all"
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-whatsapp-dark dark:text-white flex items-center gap-3 font-outfit">
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
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Prévia</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Tipo</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-whatsapp-teal/10 flex items-center justify-center overflow-hidden border border-whatsapp-teal/20 flex-shrink-0">
                          {post.profiles?.avatar_url ? (
                            <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-5 h-5 text-whatsapp-teal" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-bold text-sm dark:text-white leading-none truncate">
                            {post.profiles?.full_name || "Usuário Anonimo"}
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">@{post.profiles?.username || "sem_slug"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gray-100 dark:bg-white/5 overflow-hidden flex-shrink-0 border border-black/5 flex items-center justify-center">
                          {post.media_url ? (
                            post.post_type === 'video' ? (
                               <div className="relative w-full h-full">
                                 <video src={post.media_url} className="w-full h-full object-cover opacity-50" />
                                 <Play className="absolute inset-0 m-auto w-4 h-4 text-white fill-current" />
                               </div>
                            ) : (
                               <img src={post.media_url} className="w-full h-full object-cover" alt="" />
                            )
                          ) : (
                            <Type className="w-5 h-5 text-gray-300" />
                          )}
                        </div>
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 font-medium">
                            {post.content || <span className="italic opacity-50">Sem texto</span>}
                          </p>
                          <span className="text-[9px] font-bold text-gray-400 mt-1 block uppercase tracking-tighter">
                            Publicado {moment(post.created_at).fromNow()}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-6">
                      {post.post_type === 'video' ? (
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-[10px] font-black uppercase tracking-widest w-fit">
                          <Play className="w-3 h-3" /> Lume
                        </span>
                      ) : post.post_type === 'image' ? (
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-purple-500/10 text-purple-500 rounded-lg text-[10px] font-black uppercase tracking-widest w-fit">
                          <ImageIcon className="w-3 h-3" /> Imagem
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-white/5 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest w-fit">
                          <Type className="w-3 h-3" /> Texto
                        </span>
                      )}
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setPreviewPost(post)}
                          className="p-2 text-whatsapp-teal hover:bg-whatsapp-teal/10 rounded-xl transition-all"
                          title="Visualizar Detalhes"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => deletePost(post.id)}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                          title="Excluir Post"
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
