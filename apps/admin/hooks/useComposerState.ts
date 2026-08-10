import { useReducer, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export type ComposerMode = 'text' | 'photo' | 'video' | 'audio' | 'gallery';

export interface MediaCapture {
  type: 'photo' | 'video' | 'audio';
  url: string;
  blob: Blob | File;
}

export interface ComposerState {
  mode: ComposerMode;
  content: string;
  bg: string | null;
  captured: MediaCapture | null;
  isSubmitting: boolean;
}

export type ComposerAction =
  | { type: 'SET_MODE'; payload: ComposerMode }
  | { type: 'SET_CONTENT'; payload: string }
  | { type: 'SET_BG'; payload: string | null }
  | { type: 'SET_CAPTURED'; payload: MediaCapture | null }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'RESET'; payload: { initialMode: ComposerMode; initialFile: File | Blob | null } }
  | { type: 'CLEAR_DRAFT' };

function composerReducer(state: ComposerState, action: ComposerAction): ComposerState {
  switch (action.type) {
    case 'SET_MODE':
      // Prevent changing mode while there's a capture, unless it's a reset
      return { ...state, mode: action.payload };
    case 'SET_CONTENT':
      return { ...state, content: action.payload };
    case 'SET_BG':
      return { ...state, bg: action.payload };
    case 'SET_CAPTURED':
      return { ...state, captured: action.payload };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
    case 'RESET':
      return {
        mode: action.payload.initialMode,
        content: '',
        bg: null,
        captured: null,
        isSubmitting: false,
      };
    case 'CLEAR_DRAFT':
      localStorage.removeItem('feconecta_composer_draft');
      return state;
    default:
      return state;
  }
}

export function useComposerState(open: boolean, initialMode: ComposerMode = 'text', initialFile: File | Blob | null = null) {
  const [state, dispatch] = useReducer(composerReducer, {
    mode: initialMode,
    content: '',
    bg: null,
    captured: null,
    isSubmitting: false,
  });

  // Draft Resilience: Load draft on open
  useEffect(() => {
    if (open) {
      if (initialFile) {
        const url = URL.createObjectURL(initialFile);
        const type = initialFile.type.startsWith('video/') ? 'video' : 'photo';
        dispatch({ type: 'SET_CAPTURED', payload: { type, url, blob: initialFile } });
        dispatch({ type: 'SET_MODE', payload: type });
      } else {
        const savedDraft = localStorage.getItem('feconecta_composer_draft');
        if (savedDraft) {
          try {
            const { content: savedContent, bg: savedBg } = JSON.parse(savedDraft);
            dispatch({ type: 'SET_CONTENT', payload: savedContent || '' });
            dispatch({ type: 'SET_BG', payload: savedBg || null });
          } catch (e) {
            console.error('Failed to parse draft', e);
          }
        }
        dispatch({ type: 'SET_MODE', payload: initialMode });
      }
    } else {
      // Clean up captured URL when closed
      dispatch({ type: 'SET_CAPTURED', payload: null });
    }
  }, [open, initialFile, initialMode]);

  // Draft Resilience: Save draft when typing (only if not captured media)
  useEffect(() => {
    if (open && !state.captured) {
      const draft = { content: state.content, mode: state.mode, bg: state.bg };
      localStorage.setItem('feconecta_composer_draft', JSON.stringify(draft));
    }
  }, [state.content, state.mode, state.bg, open, state.captured]);

  // Auto-remove background if text is too long
  useEffect(() => {
    if (state.content.length > 130 && state.bg) {
      dispatch({ type: 'SET_BG', payload: null });
      toast.info("Fundo removido automaticamente devido ao tamanho do texto.");
    }
  }, [state.content, state.bg]);

  // Memory Leak Prevention: revoke URL when captured changes or unmounts
  useEffect(() => {
    const url = state.captured?.url;
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [state.captured]);

  const setMode = useCallback((mode: ComposerMode) => dispatch({ type: 'SET_MODE', payload: mode }), []);
  const setContent = useCallback((content: string) => dispatch({ type: 'SET_CONTENT', payload: content }), []);
  const setBg = useCallback((bg: string | null) => dispatch({ type: 'SET_BG', payload: bg }), []);
  const setCaptured = useCallback((captured: MediaCapture | null) => dispatch({ type: 'SET_CAPTURED', payload: captured }), []);
  const setIsSubmitting = useCallback((is: boolean) => dispatch({ type: 'SET_SUBMITTING', payload: is }), []);
  const clearDraft = useCallback(() => dispatch({ type: 'CLEAR_DRAFT' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET', payload: { initialMode, initialFile } }), [initialMode, initialFile]);

  return {
    state,
    setMode,
    setContent,
    setBg,
    setCaptured,
    setIsSubmitting,
    clearDraft,
    reset,
  };
}
