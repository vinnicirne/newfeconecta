import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { NotificationService } from "@/lib/notifications";
import { toast } from "sonner";
import { mutate } from "swr";
import { useHaptics } from "@/hooks/useHaptics";

export function usePostActions(post: any, currentUser: any, onUpdated?: (post: any) => void, onDeleted?: (id: string) => void) {
  const userId = currentUser?.id;
  const isAuthor = post.author_id === userId;
  const isAdmin = currentUser?.role === "admin";
  const isOwner = isAuthor || isAdmin;
  const { impactLight, impactMedium } = useHaptics();

  // States
  const [likes, setLikes] = useState<string[]>(Array.isArray(post.likes) ? post.likes : []);
  const [likesCount, setLikesCount] = useState(Math.max(Number(post.likes_count) || 0, Array.isArray(post.likes) ? post.likes.length : 0));
  const [likedByMe, setLikedByMe] = useState(Boolean(post.viewer_state?.liked ?? (userId && post.likes?.includes(userId))));
  const [repostsCount, setRepostsCount] = useState(Number(post.reposts_count) || 0);
  const [isReposted, setIsReposted] = useState(Boolean(post.viewer_state?.reposted ?? post.is_reposted));
  const [isSaved, setIsSaved] = useState(Boolean(post.viewer_state?.saved ?? post.is_saved));
  const [isFollowing, setIsFollowing] = useState(post.viewer_state?.following || false);
  const [commentCount, setCommentCount] = useState(Number(post.comments_count) || 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content || "");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showLikeAnim, setShowLikeAnim] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Likes Modal
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [postLikers, setPostLikers] = useState<any[]>([]);
  const [isFetchingLikers, setIsFetchingLikers] = useState(false);
  const likeRequestRef = useRef(false);
  const repostRequestRef = useRef(false);
  const saveRequestRef = useRef(false);

  const isLiked = Boolean(userId && likedByMe);

  useEffect(() => {
    const postLikes = Array.isArray(post.likes) ? post.likes : [];
    setLikes(postLikes);
    setLikesCount(Math.max(Number(post.likes_count) || 0, postLikes.length));
    setLikedByMe(Boolean(post.viewer_state?.liked ?? (userId && postLikes.includes(userId))));
    setIsSaved(Boolean(post.viewer_state?.saved ?? post.is_saved));
    setIsReposted(Boolean(post.viewer_state?.reposted ?? post.is_reposted));
    setCommentCount(Number(post.comments_count) || 0);
  }, [post.id, post.likes, post.likes_count, post.viewer_state?.liked, post.viewer_state?.saved, post.viewer_state?.reposted, post.is_saved, post.is_reposted, post.comments_count, userId]);

  useEffect(() => {
    setRepostsCount(Number(post.reposts_count) || 0);
  }, [post.reposts_count]);

  useEffect(() => {
    // Sincronização Global de Seguidores (Real-time UI sync)
    const handleSync = (e: any) => {
      if (e.detail.userId === post.author_id) {
        setIsFollowing(e.detail.isFollowing);
      }
    };
    window.addEventListener("user-follow-changed", handleSync);
    return () => window.removeEventListener("user-follow-changed", handleSync);
  }, [post.id, userId, post.author_id]);

  const toggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) {
      toast.error("Faça login para seguir");
      return;
    }
    if (isOwner || !post.author_id) return;

    const oldFollowing = isFollowing;
    setIsFollowing(!oldFollowing);

    try {
      const { data: newStatus, error } = await supabase.rpc('toggle_follow', {
        p_follower_id: userId,
        p_following_id: post.author_id
      });

      if (error) throw error;
      
      setIsFollowing(newStatus);

      if (newStatus) {
        await NotificationService.notify({
          recipientId: post.author_id,
          senderId: userId,
          type: "follow",
        });
      }

      window.dispatchEvent(
        new CustomEvent("user-follow-changed", {
          detail: { userId: post.author_id, isFollowing: newStatus },
        }),
      );
    } catch (err: any) {
      setIsFollowing(oldFollowing);
      toast.error(`Erro ao atualizar seguidor: ${err.message || 'Erro desconhecido'}`);
    }
  };

  const toggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!userId) {
      toast.error("Faça login para salvar");
      return;
    }
    if (saveRequestRef.current) return;
    saveRequestRef.current = true;

    const oldSaved = isSaved;
    setIsSaved(!oldSaved);
    try {
      if (oldSaved) {
        const { error } = await supabase.from("saved_posts").delete().eq("post_id", post.id).eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("saved_posts").insert({ post_id: post.id, user_id: userId });
        if (error) throw error;
      }
      onUpdated?.({ ...post, viewer_state: { ...post.viewer_state, saved: !oldSaved } });
      mutate(`profile_full:${userId}`);
    } catch (err) {
      setIsSaved(oldSaved);
      toast.error("Erro ao salvar publicação.");
    } finally {
      saveRequestRef.current = false;
    }
  };

  const toggleRepost = async () => {
    if (!userId) {
      toast.error("Faça login para republicar");
      return;
    }
    if (repostRequestRef.current) return;
    repostRequestRef.current = true;

    const oldReposted = isReposted;
    const oldLocalCount = repostsCount;

    setIsReposted(!oldReposted);
    setRepostsCount(oldReposted ? Math.max(0, oldLocalCount - 1) : oldLocalCount + 1);

    try {
      if (oldReposted) {
        const { error } = await supabase.from("reposts").delete().eq("post_id", post.id).eq("profile_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("reposts").insert({ post_id: post.id, profile_id: userId });
        if (error) throw error;

        const isVerse = !!post.type?.includes("repost") || !!post.content?.startsWith("📖");

        await NotificationService.notify({
          recipientId: post.author_id,
          senderId: userId,
          type: isVerse ? "verse_day" : "repost",
          postId: post.id,
          content: isVerse ? `recomendou a Palavra do Dia: "${post.content?.substring(0, 30)}..."` : undefined,
        });
      }
      onUpdated?.({
        ...post,
        reposts_count: oldReposted ? Math.max(0, oldLocalCount - 1) : oldLocalCount + 1,
        viewer_state: { ...post.viewer_state, reposted: !oldReposted },
      });
    } catch (err) {
      console.error("Error toggling repost:", err);
      setIsReposted(oldReposted);
      setRepostsCount(oldLocalCount);
      toast.error("Erro ao processar republicação.");
    } finally {
      repostRequestRef.current = false;
    }
  };

  const toggleLike = async () => {
    if (!userId) {
      toast.error("Faça login para curtir");
      return;
    }
    if (likeRequestRef.current) return;
    likeRequestRef.current = true;

    const wasLiked = isLiked;
    const oldLikes = [...likes];
    const newLikes = wasLiked ? likes.filter((id: string) => id !== userId) : [...likes, userId];
    const nextCount = Math.max(0, likesCount + (wasLiked ? -1 : 1));

    setLikes(newLikes);
    setLikedByMe(!wasLiked);
    setLikesCount(nextCount);
    
    if (!wasLiked) {
      impactLight(); // Vibração leve (Amém)
    }

    try {
      const { data: isNowLiked, error } = await supabase.rpc("toggle_like", {
        p_post_id: post.id,
        p_profile_id: userId,
      });

      if (error) throw error;

      const confirmedLikes = isNowLiked ? Array.from(new Set([...newLikes, userId])) : newLikes.filter((id) => id !== userId);
      const confirmedCount = Math.max(0, likesCount + (Boolean(isNowLiked) === wasLiked ? 0 : isNowLiked ? 1 : -1));
      setLikes(confirmedLikes);
      setLikedByMe(Boolean(isNowLiked));
      setLikesCount(confirmedCount);

      if (isNowLiked) {
        await NotificationService.notify({
          recipientId: post.author_id,
          senderId: userId,
          type: "like",
          postId: post.id,
        });
      }

      onUpdated?.({
        ...post,
        likes: confirmedLikes,
        likes_count: confirmedCount,
        viewer_state: { ...post.viewer_state, liked: Boolean(isNowLiked) },
      });
    } catch (err) {
      console.error("Error updating likes:", err);
      setLikes(oldLikes);
      setLikedByMe(wasLiked);
      setLikesCount(likesCount);
      toast.error("Não foi possível processar sua curtida");
    } finally {
      likeRequestRef.current = false;
    }
  };

  const handleDoubleClickLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLiked) toggleLike();
    else impactLight(); // vibra mesmo se já estiver curtido no double click
    setShowLikeAnim(true);
    setTimeout(() => setShowLikeAnim(false), 800);
  };

  const openLikesModal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (likesCount === 0) return;
    setShowLikesModal(true);
    setIsFetchingLikers(true);
    try {
      let likerIds = likes;
      if (likerIds.length === 0) {
        const { data: postData, error: postError } = await supabase.from("posts").select("likes").eq("id", post.id).maybeSingle();
        if (postError) throw postError;
        likerIds = Array.isArray(postData?.likes) ? postData.likes.filter((id: unknown): id is string => typeof id === "string") : [];
      }
      const { data, error } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", likerIds);
      if (error) throw error;
      setPostLikers(data || []);
    } catch (err) {
      console.error("Erro ao buscar quem curtiu:", err);
    } finally {
      setIsFetchingLikers(false);
    }
  };

  const handleDelete = async () => {
    toast("Deseja excluir esta publicação?", {
      action: {
        label: "Excluir",
        onClick: async () => {
          try {
            const mediaUrl = post.media_url;
            
            const { error } = await supabase.from("posts").delete().eq("id", post.id);
            if (error) throw error;
            
            // Garbage Collection (Background)
            if (mediaUrl && mediaUrl.includes('supabase.co/storage/v1/object/public/')) {
               const parts = mediaUrl.split('/public/');
               if (parts.length > 1) {
                  const pathWithQuery = parts[1];
                  const fullPath = pathWithQuery.split('?')[0].split('#')[0]; // Remove query params and hashes
                  const [bucketName, ...fileParts] = fullPath.split('/');
                  const filePath = fileParts.join('/');
                  
                  if (bucketName && filePath) {
                     supabase.storage.from(bucketName).remove([filePath]).catch(e => console.error("GC Error:", e));
                  }
               }
            }

            toast.success("Publicação excluída!");
            onDeleted?.(post.id);
          } catch (err: any) {
            console.error("Error deleting post:", err);
            toast.error("Erro ao excluir publicação: " + err.message);
          }
        },
      },
    });
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) {
      toast.error("O conteúdo não pode estar vazio");
      return;
    }

    setIsSavingEdit(true);
    try {
      const { error } = await supabase.from("posts").update({ content: editContent }).eq("id", post.id);
      if (error) throw error;
      onUpdated?.({ ...post, content: editContent });
      setIsEditing(false);
      toast.success("Publicação atualizada! 🙌");
    } catch (err: any) {
      console.error("Erro ao editar post:", err);
      toast.error("Erro ao salvar edição: " + err.message);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleShare = () => setIsShareModalOpen(true);

  const handleReport = async () => {
    try {
      const { error } = await supabase.from("system_errors").insert({
        module: "system",
        error_message: `[DENÚNCIA] Publicação ${post.id} sinalizada por conteúdo impróprio.`,
        user_id: currentUser?.id,
        metadata: { post_id: post.id, author: post.author_username, snippet: post.content?.substring(0, 100) },
      });
      if (error) throw error;
      toast.success("Denúncia enviada para análise da moderação.");
    } catch (err) {
      toast.error("Erro ao enviar denúncia.");
    }
  };

  return {
    isOwner, isAuthor, isAdmin,
    likes, isLiked, toggleLike, handleDoubleClickLike, showLikeAnim,
    likesCount, repostsCount, isReposted, toggleRepost,
    isSaved, toggleSave,
    isFollowing, toggleFollow,
    commentCount, setCommentCount,
    isEditing, setIsEditing, editContent, setEditContent, isSavingEdit, handleSaveEdit,
    handleDelete, handleShare, handleReport,
    showLikesModal, setShowLikesModal, postLikers, isFetchingLikers, openLikesModal,
    isShareModalOpen, setIsShareModalOpen
  };
}
