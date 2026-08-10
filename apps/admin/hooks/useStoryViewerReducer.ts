"use client";

import { useReducer, useCallback, useRef, useEffect } from "react";
import type { Story, StoryGroup } from "@/types/stories";

export const PHOTO_DURATION = 5000;
export const VIDEO_DURATION = 30000;

export type StoryViewerState = {
  userIdx: number;
  storyIdx: number;
  progress: number;
  paused: boolean;
  isLiked: boolean;
  comment: string;
  isNamingStory: boolean;
  highlightTitle: string;
  highlightCover: string | null;
  coverFile: File | null;
  floatingEmojis: { id: number; char: string; left: number }[];
  currentMediaDuration: number;
  showStats: boolean;
  statsData: { views: any[]; likes: any[] };
  isLoadingStats: boolean;
  statsTab: "views" | "likes";
  isBuffering: boolean;
  isMuted: boolean;
  isLiking: boolean;
};

type Action =
  | { type: "SET_USER_IDX"; payload: number }
  | { type: "SET_STORY_IDX"; payload: number }
  | { type: "SET_PROGRESS"; payload: number }
  | { type: "SET_PAUSED"; payload: boolean }
  | { type: "TOGGLE_PAUSE" }
  | { type: "SET_LIKED"; payload: boolean }
  | { type: "SET_COMMENT"; payload: string }
  | { type: "SET_NAMING"; payload: boolean }
  | { type: "SET_HIGHLIGHT_TITLE"; payload: string }
  | { type: "SET_HIGHLIGHT_COVER"; payload: string | null }
  | { type: "SET_COVER_FILE"; payload: File | null }
  | { type: "ADD_EMOJI"; payload: { id: number; char: string; left: number } }
  | { type: "REMOVE_EMOJI"; payload: number }
  | { type: "SET_MEDIA_DURATION"; payload: number }
  | { type: "SET_SHOW_STATS"; payload: boolean }
  | { type: "SET_STATS_DATA"; payload: { views: any[]; likes: any[] } }
  | { type: "SET_LOADING_STATS"; payload: boolean }
  | { type: "SET_STATS_TAB"; payload: "views" | "likes" }
  | { type: "SET_BUFFERING"; payload: boolean }
  | { type: "SET_MUTED"; payload: boolean }
  | { type: "SET_LIKING"; payload: boolean }
  | { type: "RESET_FOR_STORY"; payload?: Partial<StoryViewerState> };

const initialState = (startUserIndex: number): StoryViewerState => ({
  userIdx: startUserIndex,
  storyIdx: 0,
  progress: 0,
  paused: false,
  isLiked: false,
  comment: "",
  isNamingStory: false,
  highlightTitle: "Destaque",
  highlightCover: null,
  coverFile: null,
  floatingEmojis: [],
  currentMediaDuration: PHOTO_DURATION,
  showStats: false,
  statsData: { views: [], likes: [] },
  isLoadingStats: false,
  statsTab: "views",
  isBuffering: false,
  isMuted: false,
  isLiking: false,
});

function reducer(state: StoryViewerState, action: Action): StoryViewerState {
  switch (action.type) {
    case "SET_USER_IDX":
      return { ...state, userIdx: action.payload };
    case "SET_STORY_IDX":
      return { ...state, storyIdx: action.payload };
    case "SET_PROGRESS":
      return { ...state, progress: action.payload };
    case "SET_PAUSED":
      return { ...state, paused: action.payload };
    case "TOGGLE_PAUSE":
      return { ...state, paused: !state.paused };
    case "SET_LIKED":
      return { ...state, isLiked: action.payload };
    case "SET_COMMENT":
      return { ...state, comment: action.payload };
    case "SET_NAMING":
      return { ...state, isNamingStory: action.payload };
    case "SET_HIGHLIGHT_TITLE":
      return { ...state, highlightTitle: action.payload };
    case "SET_HIGHLIGHT_COVER":
      return { ...state, highlightCover: action.payload };
    case "SET_COVER_FILE":
      return { ...state, coverFile: action.payload };
    case "ADD_EMOJI":
      return { ...state, floatingEmojis: [...state.floatingEmojis, action.payload] };
    case "REMOVE_EMOJI":
      return {
        ...state,
        floatingEmojis: state.floatingEmojis.filter((e) => e.id !== action.payload),
      };
    case "SET_MEDIA_DURATION":
      return { ...state, currentMediaDuration: action.payload };
    case "SET_SHOW_STATS":
      return { ...state, showStats: action.payload };
    case "SET_STATS_DATA":
      return { ...state, statsData: action.payload };
    case "SET_LOADING_STATS":
      return { ...state, isLoadingStats: action.payload };
    case "SET_STATS_TAB":
      return { ...state, statsTab: action.payload };
    case "SET_BUFFERING":
      return { ...state, isBuffering: action.payload };
    case "SET_MUTED":
      return { ...state, isMuted: action.payload };
    case "SET_LIKING":
      return { ...state, isLiking: action.payload };
    case "RESET_FOR_STORY":
      return {
        ...state,
        progress: 0,
        paused: false,
        isBuffering: false,
        comment: "",
        ...action.payload,
      };
    default:
      return state;
  }
}

export function useStoryViewerReducer(startUserIndex: number) {
  const [state, dispatch] = useReducer(reducer, startUserIndex, initialState);

  // Refs que não precisam re-render
  const elapsed = useRef(0);
  const lastTick = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAdvancedRef = useRef(false);
  const isBufferingRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
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
  };
}
