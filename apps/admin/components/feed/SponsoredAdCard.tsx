"use client";

import React, { useState, useEffect } from "react";
import { 
  Megaphone, 
  ExternalLink, 
  ShieldCheck, 
  Flame, 
  MessageCircle, 
  Share2,
  Sparkles,
  Send,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import ShareModal from "@/components/feed/ShareModal";
import { toast } from "sonner";

interface AdComment {
  id: string;
  content: string;
  parent_id?: string | null;
  profile_id: string;
  created_at: string;
  author: {
    id?: string;
    full_name?: string;
    avatar_url?: string | null;
    username?: string;
  };
}

interface SponsoredAdCardProps {
  campaign: {
    id: string;
    nome: string;
    texto?: string | null;
    criativo_url?: string | null;
    criativo_tipo?: "imagem" | "video" | null;
    call_to_action?: string | null;
    profiles?: {
      id?: string;
      full_name?: string;
      username?: string;
      avatar_url?: string;
      is_verified?: boolean;
    } | null;
    partner_id?: string;
    tracking_url_impression?: string;
    tracking_url_click?: string;
  };
  currentUser?: any;
}

export default function SponsoredAdCard({ campaign, currentUser }: SponsoredAdCardProps) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<AdComment[]>([]);
  const [commentsCount, setCommentsCount] = useState(0);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const getAuthHeaders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
    } catch {
      return { "Content-Type": "application/json" };
    }
  };

  // 📡 Carrega Likes e Comentários do Banco de Dados
  useEffect(() => {
    let isMounted = true;
    async function loadInteractions() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/ads/interactions?campaign_id=${campaign.id}`, {
          headers,
        });
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data) {
          setLiked(!!data.liked);
          setLikesCount(data.likes_count ?? 0);
          setComments(data.comments ?? []);
          setCommentsCount(data.comments_count ?? (data.comments?.length ?? 0));
        }
      } catch (err) {
        console.error("Erro ao carregar interações do anúncio:", err);
      }
    }
    loadInteractions();
    return () => {
      isMounted = false;
    };
  }, [campaign.id]);

  // 📡 Dispara o pixel de impressão de forma silenciosa e resiliente
  useEffect(() => {
    if (campaign.tracking_url_impression) {
      try {
        fetch(campaign.tracking_url_impression, { method: "POST" }).catch(() => {});
      } catch {}
    }
  }, [campaign.tracking_url_impression]);

  // ❤️ Curtir / Descurtir no Banco de Dados
  const handleLike = async () => {
    if (!currentUser) {
      toast.error("Faça login para curtir anúncios!");
      return;
    }

    const previousLiked = liked;
    const previousCount = likesCount;

    // UI Otimista
    setLiked(!previousLiked);
    setLikesCount(previousLiked ? Math.max(0, previousCount - 1) : previousCount + 1);

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/ads/interactions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "toggle_like",
          campaign_id: campaign.id,
        }),
      });

      if (!res.ok) {
        // Rollback
        setLiked(previousLiked);
        setLikesCount(previousCount);
        return;
      }

      const data = await res.json();
      setLiked(data.liked);
      setLikesCount(data.likes_count);
    } catch {
      setLiked(previousLiked);
      setLikesCount(previousCount);
    }
  };

  // 💬 Adicionar Comentário no Banco de Dados
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;
    if (!currentUser) {
      toast.error("Faça login para comentar!");
      return;
    }

    const textToSend = newCommentText.trim();
    setIsSendingComment(true);

    // Comentário Otimista
    const tempId = `temp-${Date.now()}`;
    const optimistic: AdComment = {
      id: tempId,
      content: textToSend,
      profile_id: currentUser.id,
      created_at: new Date().toISOString(),
      author: {
        id: currentUser.id,
        full_name: currentUser.full_name || "Você",
        avatar_url: currentUser.avatar_url,
        username: currentUser.username,
      },
    };

    setComments((prev) => [...prev, optimistic]);
    setCommentsCount((prev) => prev + 1);
    setNewCommentText("");

    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/ads/interactions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "add_comment",
          campaign_id: campaign.id,
          content: textToSend,
        }),
      });

      if (!res.ok) {
        toast.error("Erro ao enviar comentário.");
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setCommentsCount((prev) => Math.max(0, prev - 1));
        return;
      }

      const data = await res.json();
      if (data.comment) {
        setComments((prev) => prev.map((c) => (c.id === tempId ? data.comment : c)));
        if (data.comments_count !== undefined) {
          setCommentsCount(data.comments_count);
        }
      }
    } catch {
      toast.error("Falha ao salvar comentário.");
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setCommentsCount((prev) => Math.max(0, prev - 1));
    } finally {
      setIsSendingComment(false);
    }
  };

  // 🗑️ Excluir Comentário
  const handleDeleteComment = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setCommentsCount((prev) => Math.max(0, prev - 1));

    try {
      const headers = await getAuthHeaders();
      await fetch("/api/ads/interactions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "delete_comment",
          campaign_id: campaign.id,
          comment_id: commentId,
        }),
      });
    } catch (err) {
      console.error("Erro ao excluir comentário:", err);
    }
  };

  const partner = campaign.profiles || {
    full_name: "FéConecta Parceiros",
    username: "parceiro",
    avatar_url: "/placeholder-avatar.png",
    is_verified: true,
  };

  const adText = campaign.texto?.trim() || campaign.nome;
  const isVideo = campaign.criativo_tipo === "video" || !!campaign.criativo_url?.match(/\.(mp4|webm|mov)/i);

  // Suporte a formato "Label|URL" ou extração inteligente de link
  const rawCta = campaign.call_to_action?.trim() || "";
  let ctaText = "Saiba Mais";
  let targetUrl = "https://feconecta.com.br";

  if (rawCta.includes("|")) {
    const parts = rawCta.split("|");
    ctaText = parts[0]?.trim() || "Saiba Mais";
    targetUrl = parts[1]?.trim() || targetUrl;
  } else if (rawCta.startsWith("http://") || rawCta.startsWith("https://") || rawCta.startsWith("wa.me") || rawCta.startsWith("api.whatsapp.com")) {
    targetUrl = rawCta;
    ctaText = "Acessar";
  } else if (rawCta) {
    ctaText = rawCta;
    const textMatch = (campaign.texto || "")?.match(/(https?:\/\/[^\s]+|wa\.me\/[^\s]+)/i);
    if (textMatch) {
      targetUrl = textMatch[0];
    }
  }

  // Garante que a URL comece com protocolo válido
  if (targetUrl.startsWith("wa.me") || targetUrl.startsWith("api.whatsapp.com")) {
    targetUrl = `https://${targetUrl}`;
  } else if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = `https://${targetUrl}`;
  }

  const handleCtaClick = () => {
    if (campaign.tracking_url_click) {
      try {
        fetch(campaign.tracking_url_click, { method: "POST" }).catch(() => {});
      } catch {}
    }
  };

  return (
    <article className="rounded-2xl border border-emerald-500/20 bg-card text-card-foreground shadow-md shadow-emerald-950/5 overflow-hidden transition-all hover:border-emerald-500/30 mb-4">
      {/* ─── HEADER: PARCEIRO + PATROCINADO ─── */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full overflow-hidden border border-emerald-500/30 bg-muted">
              {partner.avatar_url ? (
                <img
                  src={partner.avatar_url}
                  alt={partner.full_name || "Parceiro"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-sm">
                  {(partner.full_name || "P")[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-emerald-600 text-white shadow-sm" title="Anunciante Verificado">
              <Sparkles className="w-2.5 h-2.5" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm text-foreground hover:underline cursor-pointer">
                {partner.full_name || "FéConecta Parceiro"}
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-500 fill-emerald-500/20 shrink-0" />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Megaphone className="w-3 h-3" /> Patrocinado
              </span>
              <span className="text-muted-foreground text-[10px]">• FéAds</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Anúncio
          </span>
        </div>
      </div>

      {/* ─── COPY DO ANÚNCIO (TEXTO) ─── */}
      {adText && (
        <div className="px-4 pb-3">
          <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed font-normal">
            {adText}
          </p>
        </div>
      )}

      {/* ─── CRIATIVO (IMAGEM OU VÍDEO) ─── */}
      {campaign.criativo_url && (
        <div className="relative w-full bg-black/5 dark:bg-black/40 overflow-hidden group">
          {isVideo ? (
            <video
              src={campaign.criativo_url}
              controls
              playsInline
              className="w-full max-h-[500px] object-cover"
            />
          ) : (
            <a 
              href={targetUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              onClick={handleCtaClick}
              className="block relative cursor-pointer"
            >
              <img
                src={campaign.criativo_url}
                alt={campaign.nome}
                className="w-full max-h-[500px] object-cover transition-transform duration-300 group-hover:scale-[1.01]"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
            </a>
          )}
        </div>
      )}

      {/* ─── CALL TO ACTION BANNER ─── */}
      <div className="p-3 bg-muted/40 border-t border-border flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider block truncate">
            {partner.full_name || "FéConecta"}
          </span>
          <span className="text-xs font-semibold text-foreground truncate block">
            {campaign.nome}
          </span>
        </div>

        <a
          href={targetUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleCtaClick}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/20 active:scale-95 transition-all shrink-0"
        >
          <span>{ctaText}</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* ─── FOOTER DE ENGAJAMENTO (Flame Like, Comentários, Compartilhar Externo) ─── */}
      <div className="px-4 py-2.5 border-t border-border/60 flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-4">
          {/* Like com Ícone de Fogo (Padrão FéConecta com Persistência no Banco) */}
          <div className="flex items-center">
            <button
              onClick={handleLike}
              className={cn(
                "flex items-center justify-center p-1.5 transition-all active:scale-125 rounded-full",
                liked
                  ? "text-whatsapp-green"
                  : "text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5"
              )}
              title="Abençoar / Curtir Anúncio"
            >
              <Flame className={cn("w-5 h-5 transition-all", liked && "fill-whatsapp-green text-whatsapp-green scale-110 drop-shadow-[0_0_10px_rgba(37,211,102,0.6)]")} />
            </button>
            <span
              className={cn(
                "px-1 text-xs font-bold transition-colors",
                liked ? "text-whatsapp-green" : "text-gray-500 dark:text-gray-400"
              )}
            >
              {likesCount}
            </span>
          </div>

          {/* Comentários Padrão FéConecta */}
          <button 
            onClick={() => setShowComments((prev) => !prev)}
            className={cn(
              "flex items-center gap-1.5 text-xs font-medium transition-all hover:text-whatsapp-teal active:scale-110",
              showComments ? "text-whatsapp-teal font-bold" : "text-gray-500 dark:text-gray-400"
            )}
          >
            <MessageCircle className="w-5 h-5" />
            <span>{commentsCount > 0 ? commentsCount : "Comentar"}</span>
          </button>
        </div>

        {/* Compartilhar Externo com Modal Completo (WhatsApp, Redes, Copiar Link) */}
        <button 
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-whatsapp-teal text-gray-500 dark:text-gray-400 active:scale-125"
          title="Compartilhar Anúncio Externamente"
        >
          <Share2 className="w-4 h-4" />
          <span>Compartilhar</span>
        </button>
      </div>

      {/* ─── SEÇÃO EXPANSÍVEL DE COMENTÁRIOS NATIVOS GRAVADOS NO BANCO ─── */}
      {showComments && (
        <div className="border-t border-border/60 bg-muted/20 p-4 animate-in slide-in-from-top-2 duration-200">
          {/* Formulário de Novo Comentário */}
          <form onSubmit={handleAddComment} className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Escreva um comentário no anúncio..."
              className="flex-1 bg-background border border-border rounded-xl px-3.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              disabled={isSendingComment}
            />
            <button
              type="submit"
              disabled={isSendingComment || !newCommentText.trim()}
              className="flex items-center justify-center p-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 transition-all shrink-0"
              title="Publicar Comentário"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Lista de Comentários */}
          {comments.length === 0 ? (
            <p className="text-center text-[11px] text-muted-foreground py-2">
              Seja o primeiro a abençoar e comentar neste anúncio!
            </p>
          ) : (
            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start justify-between gap-2.5 p-2 rounded-xl bg-background/50 border border-border/40">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="h-6 w-6 rounded-full overflow-hidden bg-muted border border-border shrink-0 mt-0.5">
                      {comment.author?.avatar_url ? (
                        <img src={comment.author.avatar_url} alt="Autor" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-emerald-600/20 text-emerald-400 font-bold text-[10px]">
                          {(comment.author?.full_name || "U")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold text-foreground block truncate">
                        {comment.author?.full_name || "Usuário"}
                      </span>
                      <p className="text-xs text-foreground/90 break-words leading-snug mt-0.5">
                        {comment.content}
                      </p>
                    </div>
                  </div>

                  {currentUser && currentUser.id === comment.profile_id && (
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-muted-foreground hover:text-red-400 p-1 transition-colors shrink-0"
                      title="Excluir Comentário"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── MODAL DE COMPARTILHAMENTO EXTERNO (WHATSAPP, FACEBOOK, COPIAR LINK) ─── */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={targetUrl}
        title={campaign.nome}
        postContent={adText}
      />
    </article>
  );
}
