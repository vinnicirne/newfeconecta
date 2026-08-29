"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Megaphone, 
  ExternalLink, 
  ShieldCheck, 
  Flame, 
  MessageCircle, 
  Share2,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import CommentsSection from "@/components/feed/CommentsSection";
import { toast } from "sonner";

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
  const [commentsCount, setCommentsCount] = useState(0);

  const handleLike = () => {
    setLiked(!liked);
    setLikesCount((prev) => (liked ? Math.max(0, prev - 1) : prev + 1));
  };

  // 📡 Dispara o pixel de impressão de forma silenciosa e resiliente
  React.useEffect(() => {
    if (campaign.tracking_url_impression) {
      try {
        fetch(campaign.tracking_url_impression, { method: "POST" }).catch(() => {});
      } catch {}
    }
  }, [campaign.tracking_url_impression]);

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

      {/* ─── FOOTER DE ENGAJAMENTO (Flame Like, Comentários, Compartilhar) ─── */}
      <div className="px-4 py-2.5 border-t border-border/60 flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-4">
          {/* Like com Ícone de Fogo (Padrão FéConecta) */}
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

        {/* Compartilhar */}
        <button 
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: campaign.nome, text: adText, url: targetUrl }).catch(() => {});
            } else {
              navigator.clipboard.writeText(targetUrl);
              toast.success("Link do anúncio copiado!");
            }
          }}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-whatsapp-teal text-gray-500 dark:text-gray-400 active:scale-125"
          title="Compartilhar Anúncio"
        >
          <Share2 className="w-4 h-4" />
          <span>Compartilhar</span>
        </button>
      </div>

      {/* ─── SEÇÃO EXPANSÍVEL DE COMENTÁRIOS NATIVA ─── */}
      {showComments && (
        <div className="border-t border-border/60 bg-muted/20 p-4 animate-in slide-in-from-top-2 duration-200">
          <CommentsSection 
            postId={campaign.id} 
            user={currentUser} 
            postAuthorId={campaign.partner_id} 
            onCommentAdded={() => setCommentsCount((prev) => prev + 1)}
            onCommentDeleted={() => setCommentsCount((prev) => Math.max(0, prev - 1))}
          />
        </div>
      )}
    </article>
  );
}
