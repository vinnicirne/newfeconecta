"use client";

import { useState, useRef, useEffect, useCallback, useReducer } from 'react';
import { toast } from 'sonner';
import { 
  X, Type, Image as ImageIcon, Camera, Mic, RotateCcw, SwitchCamera, Zap,
  Play, Square, Users, ChevronDown
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { Capacitor } from '@capacitor/core';
import { Camera as CapCamera } from '@capacitor/camera';
import { App as CapApp } from '@capacitor/app';
import { TextEditor } from './composer/molecules/TextEditor';
import { ComposerToolbar } from './composer/molecules/ComposerToolbar';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });
import { MediaPreview } from './composer/molecules/MediaPreview';
import { AudioVisualizer } from './composer/atoms/AudioVisualizer';
import { useMediaCapture } from '@/hooks/useMediaCapture';

const MAX_VIDEO_SECONDS = 60;

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
      return {
        ...state,
        content: '',
        bg: null,
        captured: null
      };
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
    let initialFileUrl: string | null = null;
    
    if (open) {
      if (initialFile) {
        initialFileUrl = URL.createObjectURL(initialFile);
        const type = initialFile.type.startsWith('video/') ? 'video' : 'photo';
        dispatch({ type: 'SET_CAPTURED', payload: { type, url: initialFileUrl, blob: initialFile } });
        dispatch({ type: 'SET_MODE', payload: type });
      } else {
        const savedDraft = localStorage.getItem('feconecta_composer_draft');
        if (savedDraft) {
          try {
            const { content: savedContent, bg: savedBg, timestamp } = JSON.parse(savedDraft);
            if (!timestamp || Date.now() - timestamp > 86400000) {
              localStorage.removeItem('feconecta_composer_draft');
            } else {
              dispatch({ type: 'SET_CONTENT', payload: savedContent || '' });
              dispatch({ type: 'SET_BG', payload: savedBg || null });
            }
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
    
    // Cleanup: revoke initialFile URL on unmount or when effect reruns
    return () => {
      if (initialFileUrl) {
        URL.revokeObjectURL(initialFileUrl);
      }
    };
  }, [open, initialFile, initialMode]);

  // Draft Resilience: Save draft when typing (only if not captured media)
  useEffect(() => {
    if (open && !state.captured) {
      if (state.content.length > 50000) return; // Limite de ~50KB para evitar estourar quota
      const draft = { content: state.content, mode: state.mode, bg: state.bg, timestamp: Date.now() };
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
  const reset = useCallback(() => {
     if (initialFile) {
        dispatch({ type: 'RESET', payload: { initialMode, initialFile } });
     } else {
        dispatch({ type: 'RESET', payload: { initialMode, initialFile: null } });
     }
  }, [initialMode, initialFile]);

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

const BACKGROUNDS = [
  null,
  '#25D366',
  '#34B7F1',
  'linear-gradient(135deg, #075E54, #25D366)',
  'linear-gradient(135deg, #111B21, #075E54)',
  '#111B21',
  '#202C33',
  'linear-gradient(135deg, #34B7F1, #25D366)',
];

interface UnifiedComposerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  user: any;
  initialMode?: ComposerMode;
  initialFile?: File | Blob | null;
  allowedModes?: ComposerMode[];
}

export default function UnifiedComposer({ open, onClose, onSubmit, user, initialMode = 'text', initialFile = null, allowedModes }: UnifiedComposerProps) {
  const { 
    state, setMode, setContent, setBg, setCaptured, setIsSubmitting, clearDraft, reset 
  } = useComposerState(open, initialMode, initialFile);
  
  const { mode, content, bg, captured, isSubmitting } = state;

  const {
    videoRef, streamRef, recording, seconds,
    startCamera, stopCamera, capturePhoto, startRecording, stopRecording,
    facingMode, toggleFacingMode, toggleFlash, flashOn,
    handsFree, setHandsFree, micMuted, setMicMuted, cameraError, isProcessingPhoto, isReady
  } = useMediaCapture(mode);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Tracks the mode before entering 'gallery' so we can revert if user cancels the picker
  const prevModeRef = useRef<ComposerMode>(initialMode);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Audio preview functions - must be defined before useEffects that use them
  const stopAudioPreview = useCallback(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current.src = '';
      audioPlayerRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  const toggleAudioPreview = () => {
    if (!captured?.url) return;
    
    if (!audioPlayerRef.current) {
      audioPlayerRef.current = new Audio(captured.url);
      audioPlayerRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play().catch((err) => {
        console.error('Playback failed:', err);
        toast.error('Não foi possível reproduzir o áudio.');
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  };

  // Sync mode with camera and audio state
  useEffect(() => {
    if (!open) {
      stopCamera();
      stopAudioPreview();
      return;
    }

    if (mode === 'text' || mode === 'gallery' || captured) {
      stopCamera();
      if (mode !== 'audio') stopAudioPreview();
    } else if (mode === 'photo' || mode === 'video' || mode === 'audio') {
      startCamera();
    }
  }, [mode, open, captured, startCamera, stopCamera, stopAudioPreview]);


  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reseta o input para permitir re-seleção do mesmo arquivo
    e.target.value = '';
    if (!file) {
      // Usuário cancelou o seletor — volta ao modo anterior
      setMode(prevModeRef.current);
      return;
    }

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error('Formato de arquivo inválido. Escolha uma imagem ou vídeo.');
        setMode(prevModeRef.current);
        return;
    }
    if (file.size > 50 * 1024 * 1024) {
        toast.error('O arquivo é muito grande (máximo 50MB).');
        setMode(prevModeRef.current);
        return;
    }

    if (captured?.url) URL.revokeObjectURL(captured.url);
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'video' : 'photo';
    setCaptured({ type, url, blob: file });
    setMode(type === 'video' ? 'video' : 'photo');
  };

  // overrideBlob é passado pelo MediaPreview quando há filtro CSS aplicado na foto
  const handlePublish = async (overrideBlob?: Blob) => {
    setIsSubmitting(true);
    try {
      if (mode === 'text') {
        await onSubmit({ content, background: bg, post_type: 'text' });
      } else if (captured) {
        const postType = captured.type === 'photo' ? 'image' : captured.type === 'audio' ? 'audio' : 'video';
        await onSubmit({ 
          media_url: captured.url, 
          post_type: postType, 
          caption: content, 
          blob: overrideBlob ?? captured.blob
        });
      }
      clearDraft();
      onClose();
    } catch (err) {
      toast.error("Falha ao publicar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmojiSelect = (emojiData: any) => {
    setContent(content + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleClearCapture = useCallback(() => {
    const wasCapturing = captured?.type;
    setCaptured(null);
    // Só inicia câmera se estava capturando mídia
    if (wasCapturing === 'photo' || wasCapturing === 'video') {
      setMode(wasCapturing);
    }
  }, [captured, setCaptured, setMode]);

  // Rigid Cleanup for Audio
  useEffect(() => {
    return () => {
      stopAudioPreview();
    };
  }, []);

  const handleCapturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !isReady) {
      toast.error("Aguarde a câmera ficar pronta.");
      return;
    }

    // ── Feedback imediato ──
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(30);
    }

    // ── Um único draw (síncrono) ──
    const MAX = 1920;
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > MAX || h > MAX) {
      const ratio = Math.min(MAX / w, MAX / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) {
      toast.error("Falha ao processar a imagem.");
      return;
    }

    if (facingMode === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);

    // Preview instantâneo (dataURL) — usuário já vê a foto
    const previewUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCaptured({ type: "photo", url: previewUrl, blob: new Blob() });

    // Desliga a câmera DEPOIS de desenhar
    stopCamera();

    // Blob final em background (não depende mais do <video>)
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
      });

      if (!blob || blob.size === 0) {
        // Fallback: dataURL → Blob (alguns WebViews retornam null no toBlob)
        const res = await fetch(previewUrl);
        const fallbackBlob = await res.blob();
        setCaptured({
          type: "photo",
          url: previewUrl,
          blob: fallbackBlob,
        });
        return;
      }

      const realUrl = URL.createObjectURL(blob);
      setCaptured({ type: "photo", url: realUrl, blob });
    } catch (err) {
      console.error("[capturePhoto]", err);
      // Mantém o previewUrl — ainda dá para publicar via fetch(dataURL)
      try {
        const res = await fetch(previewUrl);
        const fallbackBlob = await res.blob();
        setCaptured({ type: "photo", url: previewUrl, blob: fallbackBlob });
      } catch {
        toast.error("Falha ao processar a imagem.");
        setCaptured(null);
      }
    }
  };

  const handleStopRecording = useCallback(async () => {
    const blob = await stopRecording();
    if (blob) {
      if (captured?.url) URL.revokeObjectURL(captured.url);
      setCaptured({ type: mode === 'audio' ? 'audio' : 'video', url: URL.createObjectURL(blob), blob });
    }
  }, [stopRecording, captured, setCaptured, mode]);

  useEffect(() => {
    if (recording && mode === "video" && seconds >= MAX_VIDEO_SECONDS) {
      handleStopRecording();
    }
  }, [seconds, recording, mode, handleStopRecording]);

  // Hardware Back Button Interceptor (Android)
  useEffect(() => {
    if (!open || typeof window === 'undefined' || !Capacitor.isNativePlatform()) return;
    
    const listener = CapApp.addListener('backButton', (info) => {
      if (captured) {
        handleClearCapture();
      } else {
        onClose();
      }
    });

    return () => {
      listener.then(l => l.remove()).catch(() => {});
    };
  }, [open, captured, handleClearCapture, onClose]);

  const renderTextEditor = () => (
    <div className="flex flex-col h-full min-h-[50vh] animate-in fade-in duration-500">
      <TextEditor
        content={content}
        onContentChange={setContent}
        onSubmit={handlePublish}
        disabled={isSubmitting}
      />
    </div>
  );

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const renderMediaCapture = () => {
    return (
      <div className="relative w-full h-full bg-black flex flex-col items-center justify-center flex-1">
      {!captured ? (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            poster="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=" 
            className={cn("absolute inset-0 w-full h-full object-cover transition-opacity duration-300", facingMode === 'user' && "-scale-x-100", isReady ? "opacity-100" : "opacity-0")} 
          />
          {!isReady && !cameraError && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
              <div className="w-10 h-10 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            </div>
          )}
          {cameraError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
              <p className="text-white text-sm font-bold mb-4">{cameraError}</p>
              <button
                onClick={() => startCamera()}
                className="px-6 py-2 bg-whatsapp-teal text-white rounded-full text-xs font-black"
              >
                Tentar de novo
              </button>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60 pointer-events-none" />
          
          {/* Top Overlay */}
          <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10 pointer-events-auto">
             <div className="flex items-center gap-3">
               <button onClick={onClose} className="p-2 hover:bg-black/20 rounded-full text-white transition-colors">
                 <X className="w-6 h-6 drop-shadow-md" />
               </button>
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/20 backdrop-blur-md border border-white/10 shadow-lg">
                 <div className="w-6 h-6 rounded-full overflow-hidden">
                   {user?.avatar_url ? (
                     <img src={user.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                   ) : (
                     <div className="w-full h-full bg-whatsapp-teal text-white flex items-center justify-center font-bold text-[10px]">
                       {user?.full_name?.[0] || 'U'}
                     </div>
                   )}
                 </div>
                 <span className="text-white text-xs font-bold drop-shadow-md">{user?.full_name?.split(' ')[0] || 'Usuário'}</span>
               </div>
             </div>
          </div>

          {/* Right Toolbar */}
          <div className="absolute right-4 top-24 flex flex-col gap-4 z-10 pointer-events-auto">
            <button 
              onClick={toggleFlash} 
              className={cn(
                "w-10 h-10 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-colors shadow-lg",
                flashOn ? "bg-yellow-400/90 text-black" : "bg-black/20 hover:bg-black/40"
              )}
            >
              <Zap className="w-5 h-5 drop-shadow-md" />
            </button>
            <button onClick={() => setMicMuted(!micMuted)} className={cn("w-10 h-10 rounded-full backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-colors shadow-lg", micMuted ? "bg-red-500/80 hover:bg-red-500" : "bg-black/20 hover:bg-black/40")}>
              <Mic className="w-5 h-5 drop-shadow-md" />
            </button>
            <button onClick={toggleFacingMode} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-black/40 transition-colors shadow-lg">
              <SwitchCamera className="w-5 h-5 drop-shadow-md" />
            </button>
          </div>
          
          {/* Bottom Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-8 pb-[calc(2rem+env(safe-area-inset-bottom))] flex flex-col items-center gap-5 z-10 pointer-events-auto">
            
            {/* Toggle FOTO / VÍDEO */}
            {!recording && (
              <div className="flex items-center gap-8 text-[11px] font-black tracking-[0.25em]">
                <button
                  onClick={() => setMode("photo")}
                  className={cn(
                    "transition-colors",
                    mode === "photo" ? "text-white" : "text-white/35"
                  )}
                >
                  FOTO
                </button>
                <button
                  onClick={() => setMode("video")}
                  className={cn(
                    "transition-colors",
                    mode === "video" ? "text-red-400" : "text-white/35"
                  )}
                >
                  VÍDEO
                </button>
              </div>
            )}

            {/* Timer durante gravação */}
            {recording && (
              <div className="flex items-center gap-2 bg-red-600/90 px-3 py-1 rounded-full shadow-lg">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-black text-white font-mono tracking-wider">
                  {fmt(seconds)}
                </span>
              </div>
            )}

            <div className="flex justify-center items-center w-full relative h-24">
              {/* Galeria */}
              {!recording && (
                <button
                  onClick={() => {
                    prevModeRef.current = mode; // salva modo atual para reverter em caso de cancelamento
                    setMode("gallery");
                    fileInputRef.current?.click();
                  }}
                  className="absolute left-0 w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center overflow-hidden hover:bg-white/20 transition-all shadow-lg"
                >
                  <ImageIcon className="w-4 h-4 text-white drop-shadow-md" />
                </button>
              )}

              {/* Shutter + anel de progresso */}
              <button
                onPointerDown={(e) => {
                  e.preventDefault();
                  if (mode === "photo" && isReady) {
                    handleCapturePhoto();
                  }
                }}
                onClick={(e) => {
                  e.preventDefault();
                  if (mode === "video") {
                    if (recording) {
                      handleStopRecording();
                    } else {
                      startRecording();
                    }
                  }
                }}
                disabled={
                  !isReady ||
                  isProcessingPhoto
                }
                className={cn(
                  "relative w-[72px] h-[72px] flex items-center justify-center transition-transform active:scale-95",
                  (!isReady || isProcessingPhoto) && "opacity-50"
                )}
                aria-label={mode === "photo" ? "Tirar foto" : recording ? "Parar vídeo" : "Gravar vídeo"}
              >
                {/* Anel SVG — completa em MAX_VIDEO_SECONDS */}
                <svg
                  className="absolute inset-0 -rotate-90"
                  viewBox="0 0 72 72"
                  width={72}
                  height={72}
                >
                  {/* Trilho */}
                  <circle
                    cx="36"
                    cy="36"
                    r="34"
                    fill="none"
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth="3"
                  />
                  {/* Progresso (só no vídeo gravando) */}
                  {mode === "video" && (
                    <circle
                      cx="36"
                      cy="36"
                      r="34"
                      fill="none"
                      stroke={recording ? "#ef4444" : "transparent"}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 34}
                      strokeDashoffset={
                        2 * Math.PI * 34 * (1 - Math.min(seconds / MAX_VIDEO_SECONDS, 1))
                      }
                      className="transition-[stroke-dashoffset] duration-1000 linear"
                    />
                  )}
                  {/* Borda branca estática no modo foto / idle */}
                  {mode === "photo" && (
                    <circle
                      cx="36"
                      cy="36"
                      r="34"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                    />
                  )}
                  {mode === "video" && !recording && (
                    <circle
                      cx="36"
                      cy="36"
                      r="34"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                    />
                  )}
                </svg>

                {/* Miolo do botão */}
                <div
                  className={cn(
                    "rounded-full transition-all duration-200",
                    mode === "photo" && "w-14 h-14 bg-white",
                    mode === "video" && !recording && "w-14 h-14 bg-red-500",
                    mode === "video" && recording && "w-7 h-7 rounded-md bg-red-500",
                    isProcessingPhoto && "w-10 h-10 bg-white/40 animate-pulse"
                  )}
                />
              </button>
            </div>
          </div>
        </>
      ) : (
        <MediaPreview
          captured={captured}
          content={content}
          onContentChange={setContent}
          onClear={handleClearCapture}
          onPublish={handlePublish}
          disabled={isSubmitting}
        />
      )}
    </div>
  );
}

  const renderAudioRecorder = () => (
    <div className="flex flex-col items-center justify-center gap-8 py-12 animate-in fade-in duration-500">
       <div className={cn("w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500", recording ? "bg-red-500/10 scale-110 shadow-[0_0_40px_rgba(239,68,68,0.2)]" : "bg-whatsapp-teal/10")}>
          <Mic className={cn("w-12 h-12", recording ? "text-red-500" : "text-whatsapp-teal")} />
       </div>
       
       <div className="flex flex-col items-center gap-2 w-full">
          <span className="text-4xl font-black dark:text-white tracking-tighter">{fmt(seconds)}</span>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{recording ? "Gravando sua mensagem..." : "Pronto para gravar"}</p>
          <div className="h-14 mt-4 w-full flex items-center justify-center">
            {recording && <AudioVisualizer isActive={recording} stream={streamRef.current} />}
          </div>
       </div>

       {captured?.type === 'audio' ? (
         <div className="w-full space-y-6">
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-whatsapp-dark p-4 rounded-3xl border border-gray-100 dark:border-white/5">
               <button onClick={toggleAudioPreview} className={cn("w-12 h-12 rounded-full text-white flex items-center justify-center transition-all active:scale-90 shadow-lg", isPlaying ? "bg-red-500 shadow-red-500/20" : "bg-whatsapp-teal shadow-whatsapp-teal/20")}>
                  {isPlaying ? <Square className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
               </button>
               <div className="flex-1 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                  {isPlaying && <div className="h-full bg-whatsapp-teal animate-progress-fast" />}
               </div>
               <button onClick={() => { stopAudioPreview(); setCaptured(null); }} className="text-xs font-black text-red-500 uppercase px-2 hover:opacity-70 transition-opacity">
                 Refazer
               </button>
            </div>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Legenda do áudio..." className="w-full bg-transparent border-none focus:ring-0 text-center text-lg font-black dark:text-white placeholder:text-gray-500" rows={2} />
         </div>
       ) : (
         <button onClick={recording ? handleStopRecording : startRecording} className={cn("px-10 py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all", recording ? "bg-red-500 text-white shadow-xl shadow-red-500/20" : "bg-whatsapp-teal text-white")}>
           {recording ? "Parar Gravação" : "Iniciar Gravação"}
         </button>
       )}
    </div>
  );

  const modes = [
    { id: 'text', icon: Type, label: 'Texto' },
    { id: 'photo', icon: Camera, label: 'Câmera' },
    { id: 'audio', icon: Mic, label: 'Voz' },
    { id: 'gallery', icon: ImageIcon, label: 'Galeria' },
  ];

  // isMediaMode only applies to photo/video (full-screen camera UI), NOT audio
  const isMediaMode = (mode === 'photo' || mode === 'video') && !captured;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className={cn(
        "md:max-w-2xl p-0 overflow-hidden bg-white dark:bg-whatsapp-darkLighter border-none shadow-premium z-[1000] flex flex-col",
        isMediaMode ? "w-full max-w-none h-[100dvh] rounded-none md:rounded-4xl md:h-[85vh] md:max-h-[800px] md:w-full" : "rounded-4xl w-[95vw] max-w-[95vw] md:max-w-2xl"
      )}>
        <DialogTitle className="sr-only">Criar Publicação</DialogTitle>
        <DialogDescription className="sr-only">Escolha o tipo de mídia e adicione uma legenda para sua nova publicação.</DialogDescription>
        
        {!isMediaMode && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-white dark:bg-whatsapp-dark">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-800 dark:text-gray-200" />
          </button>
          
          <h2 className="text-base font-bold dark:text-white absolute left-1/2 -translate-x-1/2">Novo post</h2>
          
          <Button 
            onClick={() => handlePublish()} 
            disabled={isSubmitting || (mode === 'text' ? !content.trim() : !captured)} 
            className="rounded-full h-8 px-4 bg-whatsapp-teal hover:bg-whatsapp-teal/90 text-white font-bold text-xs tracking-wide shadow-md active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "ENVIANDO..." : "PUBLICAR"}
          </Button>
        </div>
        )}

        <div className={cn(
          "overflow-y-auto no-scrollbar flex-1 flex flex-col bg-white dark:bg-whatsapp-dark",
          isMediaMode ? "p-0" : "p-4"
        )}>
          {!isMediaMode && mode === 'text' && (
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0 border border-gray-100 dark:border-white/10">
                {user?.avatar_url
                  ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                  : <div className="w-full h-full bg-whatsapp-teal text-white flex items-center justify-center font-bold text-sm">{(user?.full_name || 'U')[0]}</div>
                }
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{user?.full_name || 'Usuário'}</span>
                <button className="flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-md border border-gray-200 dark:border-white/10 text-[10px] font-bold text-gray-600 dark:text-gray-300 w-fit hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <Users className="w-3 h-3" />
                  Amigos
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
          
          {showEmojiPicker ? (
            <div className="flex-1 flex flex-col p-2 bg-gray-100 dark:bg-black/50 min-h-[50vh] items-center">
              <div className="flex justify-between items-center w-full max-w-sm mb-2 px-2">
                <h3 className="font-bold text-sm text-gray-700 dark:text-gray-300">Emojis</h3>
                <button onClick={() => setShowEmojiPicker(false)} className="text-xs font-bold text-gray-500 p-1">Voltar</button>
              </div>
              <EmojiPicker onEmojiClick={handleEmojiSelect} width="100%" height={400} />
            </div>
          ) : (
            <>
              {mode === 'text' && renderTextEditor()}
              {(mode === 'photo' || mode === 'video') && renderMediaCapture()}
              {mode === 'audio' && renderAudioRecorder()}
            </>
          )}
          {(!showEmojiPicker && mode === 'gallery') && (
            <div className="flex flex-col items-center justify-center py-16 gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Escolha uma mídia</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Imagem ou vídeo (máx. 50MB)</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setMode(prevModeRef.current); }}
                  className="px-5 py-2.5 rounded-full border border-gray-200 dark:border-white/10 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-full bg-whatsapp-teal text-white text-xs font-bold hover:bg-whatsapp-teal/90 transition-colors"
                >
                  Escolher arquivo
                </button>
              </div>
            </div>
          )}
        </div>

        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />

        {(!captured && mode !== 'gallery' && !isMediaMode && !showEmojiPicker) && (
          <div 
             className="w-full bg-white dark:bg-whatsapp-dark mt-auto border-t border-gray-100 dark:border-white/5"
             style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 32px)' }}
          >
            <ComposerToolbar 
              mode={mode} 
              onSetMode={(m) => {
                if (m === 'gallery') prevModeRef.current = mode;
                setMode(m);
              }}
              onShowEmoji={() => setShowEmojiPicker(true)}
              disabled={isSubmitting} 
              allowedModes={allowedModes}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
