import React, { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Flame, MessageCircle, Share2, Repeat, Eye, Bookmark, AlertCircle } from "lucide-react";
import { usePostCardContext } from "./PostCardContext";
import dynamic from "next/dynamic";

const CommentsSection = dynamic(() => import("./CommentsSection"), { ssr: false });
const ShareModal = dynamic(() => import("./ShareModal"), { ssr: false });

import { VerificationBadge } from "@/components/verification-badge";
import { cn } from "@/lib/utils";

export default function PostCardActions() {
  const {
    isLiked,
    toggleLike,
    openLikesModal,
    likes,
    showComments,
    setShowComments,
    commentCount,
    toggleRepost,
    isReposted,
    repostsCount,
    handleShare,
    isAudio,
    isVideo,
    viewsCount,
    toggleSave,
    isSaved,
    post,
    currentUser,
    setCommentCount,
    lightboxUrl,
    setLightboxUrl,
    handleDoubleClickLike,
    showLikeAnim,
    showLikesModal,
    setShowLikesModal,
    isFetchingLikers,
    postLikers,
    isShareModalOpen,
    setIsShareModalOpen
  } = usePostCardContext();

  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  // Reset error state when lightbox closes
  React.useEffect(() => {
    if (!lightboxUrl) {
      setImageLoadFailed(false);
    }
  }, [lightboxUrl]);

  return (
    <>
      {/* Interactions */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-gray-50 dark:border-white/5 mt-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <button
              onClick={toggleLike}
              className={cn(
                "flex items-center justify-center p-1.5 transition-all active:scale-125 rounded-full",
                isLiked
                  ? "text-whatsapp-green"
                  : "text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5",
              )}
            >
              <Flame className={cn("w-5 h-5", isLiked && "fill-whatsapp-green")} />
            </button>
            <button 
              onClick={openLikesModal}
              className={cn(
                "px-1.5 py-1 text-xs font-bold transition-colors hover:text-whatsapp-teal cursor-pointer",
                isLiked ? "text-whatsapp-green" : "text-gray-500 dark:text-gray-400"
              )}
            >
              {likes?.length || 0}
            </button>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowComments((prev: boolean) => !prev);
            }}
            className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-whatsapp-teal transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs font-bold">{commentCount}</span>
          </button>

          <button
            onClick={toggleRepost}
            className={cn(
              "flex items-center gap-1.5 transition-all active:scale-125",
              isReposted
                ? "text-whatsapp-green"
                : "text-gray-500 dark:text-gray-400",
            )}
          >
            <Repeat className="w-5 h-5" />
            <span className="text-xs font-bold">{repostsCount}</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 hover:text-whatsapp-teal transition-all active:scale-125"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {(isAudio || isVideo) && (
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-white/10 pl-4 ml-1">
              <Eye className="w-5 h-5" />
              <span className="text-xs font-bold">{viewsCount}</span>
            </div>
          )}
        </div>

        <button
          onClick={toggleSave}
          className={cn(
            "flex items-center gap-1.5 transition-all active:scale-125",
            isSaved
              ? "text-whatsapp-teal"
              : "text-gray-500 dark:text-gray-400 font-bold",
          )}
        >
          <Bookmark
            className={cn("w-5 h-5", isSaved && "fill-whatsapp-teal")}
          />
        </button>
      </div>

      {showComments && (
        <CommentsSection
          postId={post.id}
          postAuthorId={post.author_id}
          user={currentUser}
          onCommentAdded={() => setCommentCount((prev: number) => prev + 1)}
          onCommentDeleted={() =>
            setCommentCount((prev: number) => Math.max(0, prev - 1))
          }
        />
      )}

      {/* Lightbox / Media Expansion (Portal de Alto Nível com Fundo 100% Opaco) */}
      {lightboxUrl && typeof lightboxUrl === 'string' && lightboxUrl.trim() !== '' && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999] bg-black w-screen h-screen flex flex-col items-center justify-center animate-in fade-in duration-200 touch-none overscroll-contain select-none"
          onClick={() => setLightboxUrl(null)}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
                <img
                  src={post.author_avatar || "https://github.com/shadcn.png"}
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <div className="font-black text-sm text-white truncate">
                    {post.author_name}
                  </div>
                  {post.is_verified && (
                    <VerificationBadge
                      role={post.verification_label || "Verificado"}
                      size="xs"
                    />
                  )}
                </div>
                <span className="text-[10px] text-whatsapp-green font-bold uppercase tracking-tighter">
                  @{post.author_username}
                </span>
              </div>
            </div>
            <button
              className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all backdrop-blur-md border border-white/10"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxUrl(null);
              }}
            >
              <span className="text-xl">✕</span>
            </button>
          </div>

          <div className="relative w-full h-full max-w-full max-h-[85vh] flex items-center justify-center p-4">
            {lightboxUrl && !imageLoadFailed ? (
              <img
                src={lightboxUrl}
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl animate-in zoom-in duration-300 pointer-events-auto cursor-default select-none"
                alt="Expanded view"
                onClick={(e) => e.stopPropagation()}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  handleDoubleClickLike(e);
                }}
                onError={(e) => {
                  const currentSrc = (e.target as HTMLImageElement).src;
                  if (!currentSrc.includes('sw=bypass')) {
                    (e.target as HTMLImageElement).src = `${lightboxUrl}${lightboxUrl.includes('?') ? '&' : '?'}sw=bypass`;
                  } else {
                    setImageLoadFailed(true);
                  }
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-white gap-6 animate-in fade-in duration-300">
                <div className="w-24 h-24 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                  {imageLoadFailed ? (
                    <AlertCircle className="w-12 h-12 text-red-400" />
                  ) : (
                    <span className="text-5xl">📷</span>
                  )}
                </div>
                <p className="text-lg font-bold">
                  {imageLoadFailed ? "Erro ao carregar imagem" : "Imagem não disponível"}
                </p>
                {imageLoadFailed && (
                  <p className="text-sm text-white/60 max-w-xs text-center">
                    A imagem pode ter sido removida ou estar temporariamente indisponível.
                  </p>
                )}
              </div>
            )}

            {showLikeAnim && (
              <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                <Flame className="w-32 h-32 text-whatsapp-green fill-whatsapp-green drop-shadow-[0_0_30px_rgba(37,211,102,0.8)] animate-in zoom-in duration-300" />
                <Flame className="absolute w-32 h-32 text-whatsapp-green/50 animate-ping duration-700" />
              </div>
            )}
          </div>

          <div
            className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl flex items-center gap-8 shadow-2xl animate-in slide-in-from-bottom duration-500 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleLike();
              }}
              className={cn(
                "flex flex-col items-center gap-1 transition-all active:scale-125",
                isLiked ? "text-whatsapp-green" : "text-white",
              )}
            >
              <Flame
                className={cn("w-6 h-6", isLiked && "fill-whatsapp-green")}
              />
              <span className="text-[10px] font-bold">{likes?.length || 0}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightboxUrl(null);
                setShowComments(true);
              }}
              className="flex flex-col items-center gap-1 text-white hover:text-whatsapp-teal transition-all"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-[10px] font-bold">{commentCount}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleRepost();
              }}
              className={cn(
                "flex flex-col items-center gap-1 transition-all active:scale-125",
                isReposted ? "text-whatsapp-green" : "text-white",
              )}
            >
              <Repeat className="w-6 h-6" />
              <span className="text-[10px] font-bold">{repostsCount}</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="flex flex-col items-center gap-1 text-white hover:text-whatsapp-teal transition-all"
            >
              <Share2 className="w-6 h-6" />
              <span className="text-[10px] font-bold italic uppercase tracking-tighter">
                Share
              </span>
            </button>

            <div className="w-px h-8 bg-white/10 mx-2" />

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleSave(e);
              }}
              className={cn(
                "flex flex-col items-center gap-1 transition-all active:scale-125",
                isSaved ? "text-whatsapp-teal" : "text-white",
              )}
            >
              <Bookmark
                className={cn("w-6 h-6", isSaved && "fill-whatsapp-teal")}
              />
              <span className="text-[10px] uppercase font-bold">
                {isSaved ? "Salvo" : "Save"}
              </span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {showLikesModal && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200"
          onClick={() => setShowLikesModal(false)}
        >
          <div 
            className="w-[90%] max-w-sm bg-white dark:bg-whatsapp-dark rounded-[24px] overflow-hidden shadow-2xl flex flex-col max-h-[70vh] border border-gray-100 dark:border-white/10"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
              <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-whatsapp-green fill-whatsapp-green" /> Curtidas
              </h3>
              <button 
                onClick={() => setShowLikesModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-all text-gray-500 dark:text-gray-300"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {isFetchingLikers ? (
                <div className="p-8 flex justify-center">
                  <div className="w-6 h-6 border-2 border-whatsapp-green border-t-transparent rounded-full animate-spin" />
                </div>
              ) : postLikers?.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                  Nenhuma curtida encontrada.
                </div>
              ) : (
                <div className="space-y-1">
                  {postLikers?.map((user: any) => (
                    <Link 
                      key={user.id} 
                      href={`/profile/${user.username}`}
                      onClick={() => setShowLikesModal(false)}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                    >
                      <div className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 overflow-hidden shrink-0">
                        <img src={user.avatar_url || "https://github.com/shadcn.png"} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold dark:text-white truncate">{user.full_name || user.username}</span>
                        <span className="text-xs text-gray-500 truncate">@{user.username}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        url={typeof window !== "undefined" ? (window.location.hostname === 'localhost' || window.location.protocol === 'capacitor:' ? `https://newfeconecta.vercel.app/post/${post.id}` : `${window.location.origin}/post/${post.id}`) : ""}
        title={`Post de ${post.author_name || "FéConecta"}`}
        postContent={post.content}
      />
    </>
  );
}
