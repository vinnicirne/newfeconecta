import { useState, useEffect } from "react";
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
  const [repostsCount, setRepostsCount] = useState(Number(post.reposts_count) || 0);
  const [isReposted, setIsReposted] = useState(post.is_reposted || false);
  const [isSaved, setIsSaved] = useState(post.viewer_state?.saved || false);
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

  const isLiked = userId ? likes.includes(userId) : false;

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
      mutate(`profile_full:${userId}`);
    } catch (err) {
      setIsSaved(oldSaved);
      toast.error("Erro ao salvar publicação.");
    }
  };

  const toggleRepost = async () => {
    if (!userId) {
      toast.error("Faça login para republicar");
      return;
    }

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
      });
    } catch (err) {
      console.error("Error toggling repost:", err);
      setIsReposted(oldReposted);
      setRepostsCount(oldLocalCount);
      toast.error("Erro ao processar republicação.");
    }
  };

  const toggleLike = async () => {
    if (!userId) {
      toast.error("Faça login para curtir");
      return;
    }

    const wasLiked = isLiked;
    const oldLikes = [...likes];
    const newLikes = wasLiked ? likes.filter((id: string) => id !== userId) : [...likes, userId];

    setLikes(newLikes);
    
    if (!wasLiked) {
      impactLight(); // Vibração leve (Amém)
    }

    try {
      const { data: isNowLiked, error } = await supabase.rpc("toggle_like", {
        p_post_id: post.id,
        p_profile_id: userId,
      });

      if (error) throw error;

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
        likes: newLikes,
        likes_count: newLikes.length,
      });
    } catch (err) {
      console.error("Error updating likes:", err);
      setLikes(oldLikes);
      toast.error("Não foi possível processar sua curtida");
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
    if (likes.length === 0) return;
    setShowLikesModal(true);
    setIsFetchingLikers(true);
    try {
      const { data, error } = await supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", likes);
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
    repostsCount, isReposted, toggleRepost,
    isSaved, toggleSave,
    isFollowing, toggleFollow,
    commentCount, setCommentCount,
    isEditing, setIsEditing, editContent, setEditContent, isSavingEdit, handleSaveEdit,
    handleDelete, handleShare, handleReport,
    showLikesModal, setShowLikesModal, postLikers, isFetchingLikers, openLikesModal,
    isShareModalOpen, setIsShareModalOpen
  };
}
