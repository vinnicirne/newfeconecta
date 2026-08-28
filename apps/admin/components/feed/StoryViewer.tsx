"use client";

import { useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import type { StoryGroup } from "@/types/stories";
import {
  useStoryViewerReducer,
  PHOTO_DURATION,
  VIDEO_DURATION,
} from "@/hooks/useStoryViewerReducer";
import { StoryViewerContext } from "./StoryViewerContext";
import StoryViewerMedia from "./StoryViewerMedia";
import StoryViewerHeader from "./StoryViewerHeader";
import StoryViewerControls from "./StoryViewerControls";
import StoryViewerFooter from "./StoryViewerFooter";
import StoryViewerStats from "./StoryViewerStats";
import StoryViewerHighlightModal from "./StoryViewerHighlightModal";

const viewedStoriesCache = new Set<string>();
const likesCache = new Map<string, boolean>();

type Props = {
  storyGroups: StoryGroup[];
  startUserIndex?: number;
  currentUser: { id: string; full_name?: string; avatar_url?: string } | null;
  onClose: () => void;
};

export default function StoryViewer({
  storyGroups,
  startUserIndex = 0,
  currentUser,
  onClose,
}: Props) {
  const {
    state,
    dispatch,
    elapsed,
    lastTick,
    timerRef,
    hasAdvancedRef,
    isBufferingRef,
    videoRef,
    audioRef,
    clearTimer,
  } = useStoryViewerReducer(startUserIndex);

  const { uploadMedia, isUploading: isUploadingCover } = useMediaUpload();

  const group = storyGroups[state.userIdx];
  const story = group?.stories[state.storyIdx];

  // Trava o scroll da página de fundo (Feed) enquanto o StoryViewer estiver aberto
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, []);

  // ─── Navigation ───────────────────────────────────────────
  const advance = useCallback(() => {
    if (hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;

    if (state.storyIdx < (group?.stories.length ?? 0) - 1) {
      dispatch({ type: "SET_STORY_IDX", payload: state.storyIdx + 1 });
    } else if (state.userIdx < storyGroups.length - 1) {
      dispatch({ type: "SET_USER_IDX", payload: state.userIdx + 1 });
      dispatch({ type: "SET_STORY_IDX", payload: 0 });
    } else {
      onClose();
    }
  }, [state.storyIdx, state.userIdx, group, storyGroups, onClose, dispatch, hasAdvancedRef]);

  const prev = useCallback(() => {
    hasAdvancedRef.current = false;
    if (state.storyIdx > 0) {
      dispatch({ type: "SET_STORY_IDX", payload: state.storyIdx - 1 });
    } else if (state.userIdx > 0) {
      const prevGroup = storyGroups[state.userIdx - 1];
      dispatch({ type: "SET_USER_IDX", payload: state.userIdx - 1 });
      dispatch({ type: "SET_STORY_IDX", payload: prevGroup.stories.length - 1 });
    } else {
      dispatch({ type: "SET_STORY_IDX", payload: 0 });
      dispatch({ type: "SET_PROGRESS", payload: 0 });
      elapsed.current = 0;
    }
  }, [state.storyIdx, state.userIdx, storyGroups, dispatch, elapsed, hasAdvancedRef]);

  // ─── Timer ────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    clearTimer();
    const duration =
      story?.media_type === "video" || story?.media_type === "audio"
        ? state.currentMediaDuration
        : PHOTO_DURATION;

    lastTick.current = Date.now();
    timerRef.current = setInterval(() => {
      if (!lastTick.current || state.paused || isBufferingRef.current) {
        lastTick.current = Date.now();
        return;
      }
      const now = Date.now();
      elapsed.current += now - lastTick.current;
      lastTick.current = now;
      const pct = Math.min((elapsed.current / duration) * 100, 100);
      dispatch({ type: "SET_PROGRESS", payload: pct });
      if (pct >= 100) {
        clearTimer();
        advance();
      }
    }, 50);
  }, [
    clearTimer,
    story?.media_type,
    state.currentMediaDuration,
    state.paused,
    advance,
    dispatch,
    elapsed,
    lastTick,
    timerRef,
    isBufferingRef,
  ]);

  // Reset when story changes
  useEffect(() => {
    if (!story?.id) return;
    hasAdvancedRef.current = false;
    elapsed.current = 0;
    dispatch({ type: "RESET_FOR_STORY" });

    let viewTimeout: ReturnType<typeof setTimeout> | undefined;
    if (currentUser?.id && story.author_id !== currentUser.id) {
      const viewKey = `${story.id}-${currentUser.id}`;
      if (!viewedStoriesCache.has(viewKey)) {
        viewTimeout = setTimeout(() => {
          viewedStoriesCache.add(viewKey);
          supabase
            .from("story_views")
            .upsert(
              { story_id: story.id, viewer_id: currentUser.id },
              { onConflict: "story_id,viewer_id", ignoreDuplicates: true }
            )
            .then(({ error }) => {
              if (error) console.error("Erro ao registrar visualização:", error.message);
            });
        }, 1500);
      }
    }
    return () => {
      if (viewTimeout) clearTimeout(viewTimeout);
    };
  }, [story?.id]);

  // Timer control
  useEffect(() => {
    if (!story) return;
    startTimer();
    return clearTimer;
  }, [state.userIdx, state.storyIdx, state.currentMediaDuration, startTimer, state.paused]);

  // Native media play/pause
  useEffect(() => {
    if (story?.media_type === "video" && videoRef.current) {
      if (state.paused) {
        videoRef.current.pause();
      } else {
        const p = videoRef.current.play();
        if (p !== undefined) {
          p.catch(() => {
            if (videoRef.current) {
              videoRef.current.muted = true;
              dispatch({ type: "SET_MUTED", payload: true });
              videoRef.current.play().catch(console.error);
            }
          });
        }
      }
    }
    if (story?.media_type === "audio" && audioRef.current) {
      if (state.paused) audioRef.current.pause();
      else audioRef.current.play().catch(() => {});
    }
  }, [state.paused, story?.media_type, state.storyIdx]);

  // Duration + fragment seeking
  useEffect(() => {
    if (!story) return;
    const mediaRef =
      story.media_type === "video"
        ? videoRef.current
        : story.media_type === "audio"
        ? audioRef.current
        : null;
    if (!mediaRef) return;

    const match = story.media_url?.match(/#t=(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)/);

    const handleMetadata = () => {
      if (match) {
        const start = parseFloat(match[1]);
        const end = parseFloat(match[2]);
        dispatch({
          type: "SET_MEDIA_DURATION",
          payload: Math.min((end - start) * 1000, VIDEO_DURATION),
        });
        if (Math.abs(mediaRef.currentTime - start) > 1.5) {
          mediaRef.currentTime = start;
        }
      } else {
        dispatch({
          type: "SET_MEDIA_DURATION",
          payload: Math.min((mediaRef.duration || 30) * 1000, VIDEO_DURATION),
        });
      }
    };

    if (mediaRef.readyState >= 1) handleMetadata();
    else {
      mediaRef.addEventListener("loadedmetadata", handleMetadata);
      return () => mediaRef.removeEventListener("loadedmetadata", handleMetadata);
    }
  }, [story?.id]);

  // Like sync
  useEffect(() => {
    if (!story?.id || !currentUser?.id) return;
    const cacheKey = `${story.id}-${currentUser.id}`;
    if (likesCache.has(cacheKey)) {
      dispatch({ type: "SET_LIKED", payload: likesCache.get(cacheKey) || false });
      return;
    }
    supabase
      .from("story_likes")
      .select("id")
      .eq("story_id", story.id)
      .eq("user_id", currentUser.id)
      .maybeSingle()
      .then(({ data }) => {
        const liked = !!data;
        likesCache.set(cacheKey, liked);
        dispatch({ type: "SET_LIKED", payload: liked });
      });
  }, [story?.id, currentUser?.id]);

  // ─── Handlers ─────────────────────────────────────────────
  const togglePause = () => {
    dispatch({ type: "TOGGLE_PAUSE" });
    lastTick.current = state.paused ? Date.now() : null;
  };

  const handlePointerDown = () => {
    dispatch({ type: "SET_PAUSED", payload: true });
    lastTick.current = null;
  };

  const handlePointerUp = (action?: "prev" | "next") => {
    dispatch({ type: "SET_PAUSED", payload: false });
    lastTick.current = Date.now();
    if (action === "prev") prev();
    if (action === "next") advance();
  };

  const touchStartY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent | React.PointerEvent) => {
    touchStartY.current = "touches" in e ? e.touches[0].clientY : e.clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent | React.PointerEvent) => {
    if (touchStartY.current === null) return;
    const clientY = "changedTouches" in e ? e.changedTouches[0].clientY : e.clientY;
    if (touchStartY.current - clientY > 50) {
      dispatch({ type: "SET_PAUSED", payload: true });
      lastTick.current = null;
      const input = document.getElementById("story-comment-input");
      input?.focus();
    }
    touchStartY.current = null;
  };

  const handleLike = async () => {
    if (!currentUser || state.isLiking || !story) return;
    dispatch({ type: "SET_LIKING", payload: true });
    const old = state.isLiked;
    const next = !old;
    dispatch({ type: "SET_LIKED", payload: next });
    const cacheKey = `${story.id}-${currentUser.id}`;
    likesCache.set(cacheKey, next);

    try {
      if (next) {
        const emojis = ["🔥", "❤️", "🙌", "✨", "👏"];
        const newEmoji = {
          id: Date.now(),
          char: emojis[Math.floor(Math.random() * emojis.length)],
          left: Math.random() * 80 + 10,
        };
        dispatch({ type: "ADD_EMOJI", payload: newEmoji });
        setTimeout(() => dispatch({ type: "REMOVE_EMOJI", payload: newEmoji.id }), 2000);

        const { error } = await supabase.from("story_likes").insert({
          story_id: story.id,
          user_id: currentUser.id,
        });
        if (error && !error.message.includes("unique")) throw error;

        if (currentUser.id !== story.author_id) {
          await supabase.from("direct_messages").insert({
            sender_id: currentUser.id,
            receiver_id: story.author_id,
            content: "Curtiu seu Status: 🔥",
            is_read: false,
          });
          await supabase.from("notifications").insert({
            recipient_id: story.author_id,
            sender_id: currentUser.id,
            profile_id: story.author_id,
            user_id: story.author_id,
            type: "story_reaction",
            story_id: story.id,
            content: "curtiu seu status 🔥",
          });
        }
      } else {
        await supabase
          .from("story_likes")
          .delete()
          .eq("story_id", story.id)
          .eq("user_id", currentUser.id);
      }
    } catch (err) {
      console.error(err);
      dispatch({ type: "SET_LIKED", payload: old });
      likesCache.set(cacheKey, old);
    } finally {
      dispatch({ type: "SET_LIKING", payload: false });
    }
  };

  const sendEmojiReaction = async (emojiChar: string) => {
    if (!currentUser || !group || !story) return;
    const newEmoji = { id: Date.now(), char: emojiChar, left: 50 };
    dispatch({ type: "ADD_EMOJI", payload: newEmoji });
    setTimeout(() => dispatch({ type: "REMOVE_EMOJI", payload: newEmoji.id }), 2000);
    try {
      const recipientId = story.author_id || group.author_id;
      await supabase.from("direct_messages").insert({
        sender_id: currentUser.id,
        receiver_id: recipientId,
        content: `Reagiu ao seu Status: ${emojiChar}`,
        is_read: false,
      });
      await supabase.from("notifications").insert({
        recipient_id: recipientId,
        sender_id: currentUser.id,
        profile_id: recipientId,
        user_id: recipientId,
        type: "story_reaction",
        story_id: story.id,
        content: `reagiu ao seu status: ${emojiChar}`,
      });
      toast.success("Reação enviada!");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.comment.trim() || !currentUser || !group || !story) return;
    const text = state.comment;
    dispatch({ type: "SET_COMMENT", payload: "" });
    try {
      const recipientId = story.author_id || group.author_id;
      await supabase.from("direct_messages").insert({
        sender_id: currentUser.id,
        receiver_id: recipientId,
        content: `Respondeu ao seu Status: ${text}`,
        is_read: false,
      });
      await supabase.from("notifications").insert({
        recipient_id: recipientId,
        sender_id: currentUser.id,
        profile_id: recipientId,
        user_id: recipientId,
        type: "message",
        story_id: story.id,
        content: text,
      });
      toast.success("Mensagem enviada!");
      dispatch({ type: "SET_PAUSED", payload: false });
    } catch {
      toast.error("Não foi possível enviar sua resposta.");
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !story || story.author_id !== currentUser.id) return;
    if (!confirm("Deseja excluir este status permanentemente?")) return;
    try {
      const { error } = await supabase.from("stories").delete().eq("id", story.id);
      if (error) throw error;
      toast.success("Status removido!");
      onClose();
    } catch {
      toast.error("Não foi possível excluir o status.");
    }
  };

  const openStats = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!story) return;
    dispatch({ type: "SET_SHOW_STATS", payload: true });
    dispatch({ type: "SET_PAUSED", payload: true });
    dispatch({ type: "SET_LOADING_STATS", payload: true });
    try {
      const [viewsRes, likesRes] = await Promise.all([
        supabase
          .from("story_views")
          .select("viewer_id, profiles(id, username, full_name, avatar_url)")
          .eq("story_id", story.id),
        supabase
          .from("story_likes")
          .select("user_id, profiles(id, username, full_name, avatar_url)")
          .eq("story_id", story.id),
      ]);
      dispatch({
        type: "SET_STATS_DATA",
        payload: {
          views: viewsRes.data?.map((v: any) => v.profiles).filter(Boolean) || [],
          likes: likesRes.data?.map((l: any) => l.profiles).filter(Boolean) || [],
        },
      });
    } catch (err) {
      console.error(err);
    } finally {
      dispatch({ type: "SET_LOADING_STATS", payload: false });
    }
  };

  const handleHighlightToggle = async () => {
    if (!story) return;
    if (!story.is_highlight) {
      dispatch({ type: "SET_HIGHLIGHT_TITLE", payload: story.highlight_title || "Destaque" });
      dispatch({
        type: "SET_HIGHLIGHT_COVER",
        payload: story.highlight_cover_url || story.media_url,
      });
      dispatch({ type: "SET_NAMING", payload: true });
      dispatch({ type: "SET_PAUSED", payload: true });
      return;
    }
    const { error } = await supabase
      .from("stories")
      .update({ is_highlight: false, highlight_title: null, highlight_cover_url: null })
      .eq("id", story.id);
    if (!error) {
      toast.success("Removido dos destaques");
      story.is_highlight = false;
    }
  };

  const confirmHighlight = async () => {
    if (isUploadingCover || !story) return;
    let finalCoverUrl = state.highlightCover;
    try {
      if (state.coverFile) {
        const url = await uploadMedia(state.coverFile, {
          bucket: "avatars", // you may want to change this to 'highlights'
          folder: "highlights",
        });
        if (!url) throw new Error("Falha ao subir capa");
        finalCoverUrl = url;
      }
      const { error } = await supabase
        .from("stories")
        .update({
          is_highlight: true,
          highlight_title: state.highlightTitle,
          highlight_cover_url: finalCoverUrl,
        })
        .eq("id", story.id);
      if (error) throw error;
      toast.success("Destaque atualizado!");
      story.is_highlight = true;
      story.highlight_title = state.highlightTitle;
      story.highlight_cover_url = finalCoverUrl;
      dispatch({ type: "SET_NAMING", payload: false });
      dispatch({ type: "SET_PAUSED", payload: false });
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    }
  };

  if (!group || !story) return null;

  const ctxValue = {
    data: { storyGroups, currentUser, onClose, group, story },
    ui: state,
    actions: {
      dispatch,
      advance,
      prev,
      togglePause,
      handlePointerDown,
      handlePointerUp,
      handleTouchStart,
      handleTouchEnd,
      handleLike,
      sendEmojiReaction,
      handleSendComment,
      handleDelete,
      openStats,
      handleHighlightToggle,
      confirmHighlight,
      videoRef,
      audioRef,
      isBufferingRef,
    },
  };

  return (
    <StoryViewerContext.Provider value={ctxValue}>
      <div className="fixed inset-0 z-[400] bg-black touch-none overscroll-contain flex items-center justify-center pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        {/* Mobile: full screen | Desktop: card estilo Instagram */}
        <div className="relative w-full h-full md:h-[min(92vh,820px)] md:max-w-[410px] bg-black overflow-hidden md:rounded-[36px] md:border md:border-white/15 md:shadow-[0_0_60px_rgba(0,0,0,0.8)]">
          <StoryViewerMedia />
          <StoryViewerHeader />
          <StoryViewerControls />
          <StoryViewerFooter />
          <StoryViewerStats />
          <StoryViewerHighlightModal />

          <style
            dangerouslySetInnerHTML={{
              __html: `
            @keyframes float-up {
               0% { transform: translateY(0) scale(1); opacity: 1; }
               100% { transform: translateY(-300px) scale(1.5); opacity: 0; }
            }
            .animate-float-up { animation: float-up 2s ease-out forwards; }
            .custom-scrollbar::-webkit-scrollbar { width: 4px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
          `,
            }}
          />
        </div>
      </div>
    </StoryViewerContext.Provider>
  );
}
