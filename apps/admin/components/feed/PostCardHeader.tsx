import React from "react";
import Link from "next/link";
import Image from "next/image";
import moment from "moment";
import { VerificationBadge } from "@/components/verification-badge";
import { Repeat, MoreHorizontal, Share2, Pencil, Trash2, ShieldAlert } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// Mock function se não estiver exportada
const getOptimizedUrl = (url: string, width = 800) => {
  if (!url || !url.includes('supabase.co/storage')) return url;
  return url;
};

export default function PostCardHeader({
  post,
  mounted,
  isAuthor,
  isOwner,
  isFollowing,
  toggleFollow,
  handleShare,
  handleDelete,
  handleReport,
  isEditing,
  setIsEditing,
  editContent,
  setEditContent,
  handleSaveEdit,
  isSavingEdit
}: any) {
  return (
    <>
      {/* Indicador de Publicação Pendente */}
      {post.is_optimistic && (
        <div className="absolute top-0 left-0 w-full h-1 bg-whatsapp-green/20 overflow-hidden z-50">
          <div className="w-full h-full bg-whatsapp-green animate-progress-fast" />
        </div>
      )}

      {post.is_optimistic && (
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          <div className="w-2 h-2 bg-whatsapp-green rounded-full animate-pulse shadow-[0_0_8px_rgba(37,211,102,1)]" />
          <span className="text-[10px] font-black text-white uppercase tracking-widest">Publicando...</span>
        </div>
      )}

      {/* Header */}
      {post.is_repost && (
        <div className="px-4 pt-2 -mb-1 flex items-center gap-1.5 text-[10px] text-whatsapp-green font-bold uppercase tracking-wider">
          <Repeat className="w-3 h-3" />
          <span>{post.reposted_by_name || "Alguém"} republicou</span>
        </div>
      )}

      <div className="flex items-center gap-3 px-4 py-3">
        <Link
          href={`/profile/${post.author_username || "usuario"}`}
          className="w-9 h-9 rounded-full overflow-hidden bg-muted flex-shrink-0 border border-gray-100 dark:border-white/10 hover:opacity-80 transition-opacity"
        >
          {post.author_avatar && !post.author_avatar.includes('vercel.sh') ? (
            <Image
              src={getOptimizedUrl(post.author_avatar, 100)}
              width={36}
              height={36}
              unoptimized
              className="w-full h-full object-cover"
              alt=""
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-emerald-600 flex items-center justify-center text-white font-black text-[10px] uppercase shadow-inner">
              {(() => {
                const name = post.author_name || post.author_username || "U";
                const parts = name.trim().split(/\s+/);
                return parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : parts[0][0].toUpperCase();
              })()}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            href={`/profile/${post.author_username}`}
            className="block group/name"
          >
            <div className="text-sm font-bold leading-tight truncate flex items-center gap-1.5 transition-colors">
              {post.author_name}
              <VerificationBadge
                role={post.verification_label || "Verificado"}
                size="sm"
                className="ml-1"
              />
            </div>
          </Link>
          <div className="flex items-center gap-1.5">
            <Link
              href={`/profile/${post.author_username}`}
              className="text-[10px] text-whatsapp-teal dark:text-whatsapp-green font-medium hover:underline"
            >
              @{post.author_username}
            </Link>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              •
            </span>
            <p className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">
              {mounted
                ? moment(post.created_date || post.created_at).fromNow()
                : "..."}
            </p>
          </div>
        </div>

        {!isAuthor && (
          <button
            onClick={toggleFollow}
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border transition-all active:scale-95",
              isFollowing
                ? "border-gray-300 dark:border-white/20 text-gray-400 dark:text-gray-500"
                : "border-whatsapp-teal text-whatsapp-teal dark:border-whatsapp-green dark:text-whatsapp-green hover:bg-whatsapp-teal hover:text-white dark:hover:bg-whatsapp-green dark:hover:text-whatsapp-dark",
            )}
          >
            {isFollowing ? "Seguindo" : "Seguir"}
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all">
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" /> Compartilhar
            </DropdownMenuItem>
            {isOwner && (
              <>
                <DropdownMenuItem
                  onClick={() => setIsEditing(true)}
                  className="text-blue-500"
                >
                  <Pencil className="w-4 h-4 mr-2" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-red-500"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </DropdownMenuItem>
              </>
            )}
            {!isOwner && (
              <DropdownMenuItem
                onClick={handleReport}
                className="text-orange-500"
              >
                <ShieldAlert className="w-4 h-4 mr-2" /> Denunciar Publicação
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Editor de Post (Modo Edição) */}
      {isEditing && (
        <div className="px-4 pb-4 animate-in fade-in zoom-in-95 duration-200">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full min-h-[120px] bg-gray-50 dark:bg-white/5 rounded-2xl p-4 text-sm font-medium outline-none border border-whatsapp-teal/20 focus:border-whatsapp-teal transition-all resize-none dark:text-white"
            placeholder="No que você está pensando?"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isSavingEdit}
              className="px-6 py-2 bg-whatsapp-teal text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-whatsapp-teal/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSavingEdit ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando
                </>
              ) : "Salvar"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
