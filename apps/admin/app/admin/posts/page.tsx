"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Trash2, MessageSquare, User, Clock, Search, Filter, 
  ExternalLink, ShieldAlert, Image as ImageIcon, Play, 
  Type, X, Eye, Heart, RefreshCw, ChevronLeft, ChevronRight,
  TrendingUp, Sparkles, AlertCircle, CheckCircle2
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import moment from "moment";
import "moment/locale/pt-br";
import { toast } from "sonner";

moment.locale("pt-br");

interface PostData {
  id: string;
  content: string;
  post_type: "text" | "image" | "video";
  media_url?: string | null;
  media_type?: string | null;
  background?: string | null;
  created_at: string;
  author_id?: string;
  user_id?: string;
  likes?: number | any[];
  views_count?: number;
  profiles?: {
    id?: string;
    full_name?: string;
    avatar_url?: string;
    username?: string;
    email?: string;
  };
}

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 12;

  // Modal de Detalhes do Post
  const [previewPost, setPreviewPost] = useState<PostData | null>(null);

  // Estatísticas do Topo
  const [stats, setStats] = useState({
    totalPosts: 0,
    postsToday: 0,
    mediaPosts: 0,
    totalEngagement: 0,
  });

  useEffect(() => {
    fetchPosts();
    fetchStats();
  }, [page, search, filterType]);

  const fetchStats = async () => {
    try {
      const todayStart = moment().startOf("day").toISOString();

      const [
        totalRes,
        todayRes,
        mediaRes,
        likesRes
      ] = await Promise.allSettled([
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }).gt("created_at", todayStart),
        supabase.from("posts").select("*", { count: "exact", head: true }).in("post_type", ["image", "video"]),
        supabase.from("likes").select("*", { count: "exact", head: true }),
      ]);

      const tCount = totalRes.status === "fulfilled" ? (totalRes.value.count || 0) : 0;
      const todayCount = todayRes.status === "fulfilled" ? (todayRes.value.count || 0) : 0;
      const mCount = mediaRes.status === "fulfilled" ? (mediaRes.value.count || 0) : 0;
      const lCount = likesRes.status === "fulfilled" ? (likesRes.value.count || 0) : 0;

      setStats({
        totalPosts: tCount,
        postsToday: todayCount,
        mediaPosts: mCount,
        totalEngagement: lCount,
      });
    } catch (err) {
      console.error("[Posts] Erro ao carregar métricas de moderação:", err);
    }
  };

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("posts")
        .select(`
          id, content, post_type, created_at, author_id, user_id, 
          media_url, media_type, background, likes, views_count
        `, { count: "exact" })
        .order("created_at", { ascending: false });

      if (filterType !== "all") {
        query = query.eq("post_type", filterType);
      }

      if (search.trim()) {
        query = query.ilike("content", `%${search}%`);
      }

      const { data: postsData, count, error: postsError } = await query.range(from, to);

      if (postsError) throw postsError;
      if (!postsData) {
        setPosts([]);
        setTotalCount(0);
        return;
      }

      setTotalCount(count || 0);

      // Buscar perfis dos autores de forma agrupada e segura
      const authorIds = Array.from(
        new Set(postsData.map((p) => p.author_id || p.user_id).filter(Boolean))
      );

      let profilesMap: Record<string, any> = {};
      if (authorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, username, email")
          .in("id", authorIds);

        profilesMap = (profilesData || []).reduce((acc: any, curr: any) => {
          acc[curr.id] = curr;
          return acc;
        }, {});
      }

      const formattedPosts = postsData.map((post) => {
        const cleanMediaUrl = post.media_url === "null" || !post.media_url ? null : post.media_url;
        const authorKey = post.author_id || post.user_id;

        return {
          ...post,
          media_url: cleanMediaUrl,
          profiles: authorKey ? profilesMap[authorKey] || null : null,
        };
      });

      setPosts(formattedPosts as any);
    } catch (err: any) {
      console.error("[Posts] Erro ao buscar publicações:", err);
      toast.error("Erro ao carregar publicações: " + (err.message || "Erro de conexão"));
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm("TEM CERTEZA? Deseja excluir permanentemente este post? Esta ação removerá a publicação e suas curtidas.")) {
      return;
    }

    const toastId = toast.loading("Excluindo publicação...");
    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setPosts((prev) => prev.filter((p) => p.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      if (previewPost?.id === id) setPreviewPost(null);
      toast.success("Publicação removida com sucesso!", { id: toastId });
      fetchStats();
    } catch (err: any) {
      toast.error("Erro ao deletar post: " + err.message, { id: toastId });
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* ─── HEADER PRINCIPAL ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Moderação de Publicações & Feed
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Monitore o conteúdo publicado pela comunidade, audite mídias e modere postagens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPage(0); fetchPosts(); fetchStats(); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-whatsapp-green")} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* ─── 4 CARDS DE MÉTRICAS (STATS GRID) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Posts */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total de Posts</span>
            <div className="p-2 rounded-lg bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.totalPosts.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] text-muted-foreground">publicações</span>
          </div>
        </div>

        {/* Posts Hoje */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Publicados Hoje</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.postsToday}
            </span>
            {stats.postsToday > 0 && (
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                ▲ Atividade recente
              </span>
            )}
          </div>
        </div>

        {/* Publicações com Mídia */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Com Imagem / Vídeo</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ImageIcon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.mediaPosts.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
              {stats.totalPosts > 0 ? Math.round((stats.mediaPosts / stats.totalPosts) * 100) : 0}% com mídia
            </span>
          </div>
        </div>

        {/* Total de Curtidas */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Curtidas da Comunidade</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Heart className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.totalEngagement.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
              Interações
            </span>
          </div>
        </div>
      </div>

      {/* ─── PAINEL PRINCIPAL COM TABELA DE POSTS ─── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
        {/* Barra de Filtros e Busca */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div>
            <h2 className="text-sm font-bold text-foreground">Feed de Publicações</h2>
            <p className="text-xs text-muted-foreground">Audite o texto, imagens e vídeos publicados pelos membros</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Buscar no conteúdo do post..."
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-muted/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(0); }}
              className="h-8 px-2.5 rounded-lg border border-border bg-card text-xs text-muted-foreground focus:outline-none"
            >
              <option value="all">Tipo: Todos</option>
              <option value="text">Apenas Texto</option>
              <option value="image">Imagens</option>
              <option value="video">Vídeos (Tribo)</option>
            </select>
          </div>
        </div>

        {/* Tabela de Posts */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border uppercase tracking-wider text-[10px] text-muted-foreground font-semibold">
              <tr>
                <th className="px-5 py-3">Autor</th>
                <th className="px-5 py-3">Conteúdo / Prévia</th>
                <th className="px-5 py-3 text-center">Tipo</th>
                <th className="px-5 py-3 hidden md:table-cell">Publicado</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    Carregando publicações...
                  </td>
                </tr>
              ) : posts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    Nenhuma publicação encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                posts.map((post) => {
                  const likesCount = Array.isArray(post.likes) 
                    ? post.likes.length 
                    : (typeof post.likes === "number" ? post.likes : 0);

                  return (
                    <tr key={post.id} className="hover:bg-muted/30 transition-colors">
                      {/* Autor */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3 min-w-[160px]">
                          <div className="h-8 w-8 rounded-full bg-whatsapp-teal/20 text-whatsapp-teal dark:text-whatsapp-green flex items-center justify-center font-bold text-xs overflow-hidden border border-border shrink-0">
                            {post.profiles?.avatar_url ? (
                              <Image
                                src={post.profiles.avatar_url}
                                alt=""
                                width={32}
                                height={32}
                                unoptimized
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (post.profiles?.full_name || post.profiles?.username || "M")[0]?.toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground truncate block">
                              {post.profiles?.full_name || "Membro da Rede"}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate block">
                              @{post.profiles?.username || "usuario"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Prévia do Conteúdo & Mídia */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3 max-w-md">
                          {/* Miniatura de Mídia */}
                          <div className="h-11 w-11 rounded-lg bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center relative">
                            {post.media_url ? (
                              post.post_type === "video" ? (
                                <div className="relative w-full h-full bg-black/40 flex items-center justify-center">
                                  <Play className="h-4 w-4 text-white fill-current opacity-80" />
                                </div>
                              ) : (
                                <Image
                                  src={post.media_url}
                                  alt=""
                                  width={44}
                                  height={44}
                                  unoptimized
                                  className="h-full w-full object-cover"
                                />
                              )
                            ) : post.background ? (
                              <div className="w-full h-full rounded" style={{ background: post.background }} />
                            ) : (
                              <Type className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>

                          {/* Texto do Post */}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-foreground font-medium line-clamp-2 leading-relaxed">
                              {post.content || <span className="italic text-muted-foreground">Sem legenda</span>}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-0.5 text-rose-500">
                                <Heart className="h-2.5 w-2.5 fill-current" /> {likesCount}
                              </span>
                              <span>·</span>
                              <span>{(post.views_count || 0).toLocaleString("pt-BR")} views</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="px-5 py-3.5 text-center">
                        {post.post_type === "video" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Play className="h-2.5 w-2.5 fill-current" /> Vídeo
                          </span>
                        ) : post.post_type === "image" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            <ImageIcon className="h-2.5 w-2.5" /> Imagem
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                            <Type className="h-2.5 w-2.5" /> Texto
                          </span>
                        )}
                      </td>

                      {/* Data */}
                      <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground whitespace-nowrap">
                        {post.created_at ? moment(post.created_at).fromNow() : "—"}
                      </td>

                      {/* Ações */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewPost(post)}
                            title="Inspecionar publicação"
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" /> Ver
                          </button>
                          <button
                            onClick={() => deletePost(post.id)}
                            title="Excluir postagem"
                            className="p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé e Paginação */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-muted/20 text-xs">
          <span className="text-muted-foreground">
            Mostrando <strong className="text-foreground">{posts.length}</strong> de <strong className="text-foreground">{totalCount.toLocaleString("pt-BR")}</strong> publicações
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="h-8 px-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-foreground">
              {page + 1} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) >= totalPages || loading}
              className="h-8 px-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL DE DETALHES / PREVIEW DO POST ─── */}
      <DialogPrimitive.Root open={!!previewPost} onOpenChange={(open) => !open && setPreviewPost(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 animate-in fade-in" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-card rounded-2xl z-50 border border-border shadow-2xl animate-in zoom-in-95 text-foreground overflow-hidden flex flex-col md:flex-row max-h-[85vh]">
            {previewPost && (
              <>
                {/* Lado Esquerdo: Mídia / Preview */}
                <div className="flex-1 bg-black/20 dark:bg-black/50 flex items-center justify-center p-4 min-h-[260px] overflow-hidden relative border-b md:border-b-0 md:border-r border-border">
                  {previewPost.post_type === "image" && previewPost.media_url && (
                    <img
                      src={previewPost.media_url}
                      alt=""
                      className="max-h-[380px] w-full object-contain rounded-lg"
                    />
                  )}

                  {previewPost.post_type === "video" && previewPost.media_url && (
                    <div className="w-full flex items-center justify-center">
                      {(() => {
                        const ytId = previewPost.media_url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i)?.[1];
                        if (ytId) {
                          return (
                            <iframe
                              className="w-full aspect-video rounded-lg shadow-lg"
                              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          );
                        }
                        return (
                          <video
                            src={previewPost.media_url}
                            controls
                            className="max-h-[380px] w-full rounded-lg"
                            autoPlay
                          />
                        );
                      })()}
                    </div>
                  )}

                  {!previewPost.media_url && (
                    previewPost.background ? (
                      <div
                        className="w-full h-full min-h-[220px] flex items-center justify-center p-6 text-center rounded-lg"
                        style={{ background: previewPost.background }}
                      >
                        <p className="text-white text-base sm:text-lg font-extrabold whitespace-pre-wrap drop-shadow">
                          {previewPost.content}
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground p-8">
                        <Type className="h-10 w-10 opacity-30" />
                        <span className="text-xs uppercase font-semibold tracking-wider">Publicação de Texto</span>
                      </div>
                    )
                  )}
                </div>

                {/* Lado Direito: Informações e Ações */}
                <div className="w-full md:w-[320px] p-5 flex flex-col justify-between space-y-4">
                  {/* Autor e Header */}
                  <div>
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-full bg-whatsapp-teal/20 text-whatsapp-teal dark:text-whatsapp-green flex items-center justify-center font-bold text-xs overflow-hidden border border-border">
                          {previewPost.profiles?.avatar_url ? (
                            <Image
                              src={previewPost.profiles.avatar_url}
                              alt=""
                              width={36}
                              height={36}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            (previewPost.profiles?.full_name || "M")[0]?.toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-foreground truncate">
                            {previewPost.profiles?.full_name || "Membro da Rede"}
                          </h4>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            @{previewPost.profiles?.username || "usuario"}
                          </p>
                        </div>
                      </div>
                      <DialogPrimitive.Close className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                        <X className="h-4 w-4" />
                      </DialogPrimitive.Close>
                    </div>

                    {/* Conteúdo do Texto */}
                    <div className="pt-3 max-h-[160px] overflow-y-auto pr-1">
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                        {previewPost.content || <span className="italic text-muted-foreground">Sem conteúdo de texto</span>}
                      </p>
                    </div>
                  </div>

                  {/* Detalhes & Botão Excluir */}
                  <div className="space-y-3 pt-3 border-t border-border text-xs">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {moment(previewPost.created_at).format("DD/MM/YYYY [às] HH:mm")}
                      </span>
                      <span className="flex items-center gap-1 text-rose-500 font-semibold">
                        <Heart className="h-3 w-3 fill-current" />
                        {Array.isArray(previewPost.likes) ? previewPost.likes.length : (previewPost.likes || 0)} likes
                      </span>
                    </div>

                    <button
                      onClick={() => deletePost(previewPost.id)}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir Permanentemente
                    </button>
                  </div>
                </div>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
