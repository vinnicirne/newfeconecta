"use client";

import React, { useState, useEffect, useMemo } from "react";
import PostCardHeader from "./PostCardHeader";
import { PostCardContext } from "./PostCardContext";
import PostCardMedia from "./PostCardMedia";
import PostCardText from "./PostCardText";
import PostCardActions from "./PostCardActions";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { usePostActions } from "@/hooks/feed/usePostActions";
import { usePostMedia } from "@/hooks/feed/usePostMedia";
import { renderContent } from "@/utils/feed-formatter";
import { Flame } from "lucide-react";

const PostCard = React.memo(function PostCard({
  post,
  currentUser,
  onDeleted,
  onUpdated,
  isPriority = false,
}: any) {
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const router = useRouter();

  // Higienização Atômica e Definições de Base
  const mediaUrl = post.media_url === "null" || !post.media_url ? null : post.media_url;
  const postType = post.post_type === "null" ? "text" : post.post_type;

  const { isAudio, isVideo, isShortText, isMediaPost, isVerseRepost, isDFCH, isDevotional } = useMemo(() => {
    const isVideoBucket = mediaUrl?.includes('/posts/videos/');
    const isAudioBucket = mediaUrl?.includes('/posts/audio/');
    
    const audio = postType === "audio" || post.media_type === "audio" || !!mediaUrl?.match(/\.(mp3|wav|m4a|ogg|aac|flac|opus|weba)/i) || isAudioBucket;
    const video = (postType === "video" || post.media_type === "video" || !!mediaUrl?.match(/\.(mp4|webm|mov|mkv)/i) || isVideoBucket) && postType !== "external_media" && !mediaUrl?.match(/\.(jpg|jpeg|png|gif|webp)/i);
    
    const short = post.content && post.content.length < 90 && !post.content.includes("\n") && !mediaUrl;
    const urlMatch = post.content?.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/);
    const hasExternal = !!urlMatch;
    const media = !!(mediaUrl || video || audio || hasExternal);
    const verse = post.type === "repost_verse" || !!post.content?.startsWith("📖 Recomendo a Palavra");
    const isDevotional = !!post.content?.startsWith("📖 Devocional");
    const dfch = !!(post.is_testimony) || verse;
    return { isAudio: audio, isVideo: video, isShortText: short, isMediaPost: media, isVerseRepost: verse, isDFCH: dfch, isDevotional };
  }, [postType, post.media_type, mediaUrl, post.content, post.type, post.is_testimony]);

  const isLegacyMedia = useMemo(() => {
    if (!mediaUrl || postType === "external_media") return false;
    if (mediaUrl.includes("supabase.co/storage") || mediaUrl.includes("supabase.in/storage")) return false;
    const fileName = mediaUrl.split("/").pop() || "";
    return !fileName.includes(".");
  }, [mediaUrl, postType]);

  const shouldSkipMedia = mediaError || isLegacyMedia;

  const isJustLink = (() => {
    if (!post.content) return false;
    const trimmed = post.content.trim();
    const urlRegex = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i;
    return urlRegex.test(trimmed);
  })();
  const activeBackground = isJustLink ? null : post.background;

  // Custom Hooks Atômicos
  const actions = usePostActions(post, currentUser, onUpdated, onDeleted);
  const media = usePostMedia(post, isVideo, onUpdated);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Trava a rolagem da página de fundo (body) quando o zoom/lightbox do poster estiver aberto
  useEffect(() => {
    if (lightboxUrl) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [lightboxUrl]);

  if (mediaError) return <div style={{ height: 1, opacity: 0, pointerEvents: 'none' }} />;

  return (
    <div
      id={`post-${post.id}`}
      className={cn(
        "bg-white dark:bg-whatsapp-dark transition-all duration-300 relative w-full border-b border-gray-100 dark:border-white/5 mb-2",
        post.is_optimistic && "opacity-60 pointer-events-none grayscale-[0.3]"
      )}
    >
      <PostCardHeader 
        post={post}
        mounted={mounted}
        isAuthor={actions.isAuthor}
        isOwner={actions.isOwner}
        isFollowing={actions.isFollowing}
        toggleFollow={actions.toggleFollow}
        handleShare={actions.handleShare}
        handleDelete={actions.handleDelete}
        handleReport={actions.handleReport}
        isEditing={actions.isEditing}
        setIsEditing={actions.setIsEditing}
        editContent={actions.editContent}
        setEditContent={actions.setEditContent}
        handleSaveEdit={actions.handleSaveEdit}
        isSavingEdit={actions.isSavingEdit}
      />

      {!actions.isEditing && (
        <PostCardContext.Provider value={{
          post, isVideo, isAudio, mediaUrl, shouldSkipMedia, postType, setLightboxUrl,  
          handleDoubleClickLike: actions.handleDoubleClickLike, retryCount, setRetryCount, 
          isPriority, setMediaError, showLikeAnim: actions.showLikeAnim, 
          videoRef: media.videoRef, isMuted: media.isMuted, handlePlayMedia: media.handlePlayMedia,
          setIsMuted: media.setIsMuted, audioRef: media.audioRef, isPlaying: media.isPlaying, 
          toggleAudio: media.toggleAudio, audioProgress: media.audioProgress, mounted, 
          fmtTime: media.fmtTime, setAudioProgress: media.setAudioProgress,
          setIsPlaying: media.setIsPlaying, router, activeBackground, isVerseRepost, 
          isMediaPost, isDFCH, isDevotional, isShortText, renderContent: (content: string) => renderContent(content, isVerseRepost, isExpanded, setIsExpanded, activeBackground),
          isLiked: actions.isLiked, toggleLike: actions.toggleLike, openLikesModal: actions.openLikesModal, 
          likes: actions.likes, showComments, setShowComments, 
          commentCount: actions.commentCount, toggleRepost: actions.toggleRepost,
          isReposted: actions.isReposted, repostsCount: actions.repostsCount, handleShare: actions.handleShare, 
          viewsCount: media.viewsCount, toggleSave: actions.toggleSave, isSaved: actions.isSaved, 
          currentUser, setCommentCount: actions.setCommentCount, lightboxUrl, 
          showLikesModal: actions.showLikesModal, setShowLikesModal: actions.setShowLikesModal, 
          isFetchingLikers: actions.isFetchingLikers, postLikers: actions.postLikers, 
          isShareModalOpen: actions.isShareModalOpen, setIsShareModalOpen: actions.setIsShareModalOpen
        }}>
          <PostCardMedia />
          <PostCardText />
          
          {postType === "journey" && mediaUrl && (
            <div className="px-4 pb-4">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/santuario/${mediaUrl}`);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500/10 text-amber-600 dark:text-amber-500 font-bold rounded-xl border border-amber-500/20 hover:bg-amber-500/20 transition-colors"
              >
                <Flame className="w-5 h-5 fill-amber-500/20" /> Iniciar Jornada Devocional
              </button>
            </div>
          )}

          <PostCardActions />
        </PostCardContext.Provider>
      )}
    </div>
  );
});

export default PostCard;

