"use client";

import { createContext, useContext } from "react";
import type { Story, StoryGroup } from "@/types/stories";
import type { StoryViewerState } from "@/hooks/useStoryViewerReducer";

export type StoryViewerData = {
  storyGroups: StoryGroup[];
  currentUser: { id: string; full_name?: string; avatar_url?: string } | null;
  onClose: () => void;
  group: StoryGroup;
  story: Story;
};

export type StoryViewerActions = {
  dispatch: React.Dispatch<any>;
  advance: () => void;
  prev: () => void;
  togglePause: () => void;
  handlePointerDown: () => void;
  handlePointerUp: (action?: "prev" | "next") => void;
  handleTouchStart: (e: React.TouchEvent | React.PointerEvent) => void;
  handleTouchEnd: (e: React.TouchEvent | React.PointerEvent) => void;
  handleLike: () => void;
  sendEmojiReaction: (emoji: string) => void;
  handleSendComment: (e: React.FormEvent) => void;
  handleDelete: () => void;
  openStats: (e: React.MouseEvent) => void;
  handleHighlightToggle: () => void;
  confirmHighlight: () => void;
  // refs expostos só para Media/Controls
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isBufferingRef: React.MutableRefObject<boolean>;
};

type Ctx = {
  data: StoryViewerData;
  ui: StoryViewerState;
  actions: StoryViewerActions;
};

const StoryViewerContext = createContext<Ctx | null>(null);

export function useStoryViewer() {
  const ctx = useContext(StoryViewerContext);
  if (!ctx) throw new Error("useStoryViewer must be used inside StoryViewer");
  return ctx;
}

export { StoryViewerContext };
