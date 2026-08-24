"use client";

import { useRef, useState, useEffect } from 'react';
import { X, Check, FlipHorizontal, Image, Circle, RotateCcw, Type, Palette, Mic } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useMediaCapture } from '@/hooks/useMediaCapture';

export default function StoryCreator({ open, onClose, user, onCreated }: any) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<'photo' | 'video' | 'text' | 'audio'>('photo');
  const [preview, setPreview] = useState<any>(null);
  const [textContent, setTextContent] = useState('');
  const [bgColor, setBgColor] = useState('#00A884');
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  
  const { uploadMedia, isUploading, progress } = useMediaUpload();
  
  const { 
    videoRef, 
    recording, 
    seconds: recordDuration, 
    facingMode, 
    startCamera, 
    stopCamera, 
    capturePhoto, 
    startRecording, 
    stopRecording, 
    toggleFacingMode 
  } = useMediaCapture(mode, 'user');

  const colors = ['#00A884', '#128C7E', '#7E57C2', '#EC407A', '#FF7043', '#26A69A', '#42A5F5'];

  useEffect(() => {
    if (open) {
      if (mode !== 'text' && !preview) {
        startCamera();
      }
    }
    return () => { 
      stopCamera(); 
    };
  }, [open, mode, preview, startCamera, stopCamera]); 

  const handleCapturePhoto = async () => {
    if (isProcessingPhoto) return;
    setIsProcessingPhoto(true);
    
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
    
    const video = videoRef.current;
    if (video) {
      const flash = document.createElement('div');
      flash.style.position = 'absolute';
      flash.style.inset = '0';
      flash.style.backgroundColor = 'white';
      flash.style.zIndex = '9999';
      flash.style.transition = 'opacity 0.3s ease-out';
      video.parentElement?.appendChild(flash);
      requestAnimationFrame(() => {
         flash.style.opacity = '0';
         setTimeout(() => flash.remove(), 300);
      });
    }

    const blob = await capturePhoto();
    if (blob) {
      setPreview({ url: URL.createObjectURL(blob), type: 'image', blob, mimeType: blob.type });
    }
    setIsProcessingPhoto(false);
  };

  const handleAction = async () => {
    if (mode === 'photo') {
      handleCapturePhoto();
    } else if (!recording) {
      startRecording();
    } else {
      setIsProcessingPhoto(true);
      const blob = await stopRecording();
      if (blob) {
        setPreview({ url: URL.createObjectURL(blob), type: mode === 'audio' ? 'audio' : 'video', blob, mimeType: blob.type, duration: recordDuration });
      }
      setIsProcessingPhoto(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error("Mídia muito pesada! Máximo 20MB para Stories.");
      return;
    }

    const type = file.type.startsWith('image/') ? 'image' : 
                 file.type.startsWith('video/') ? 'video' :
                 file.type.startsWith('audio/') ? 'audio' : null;

    if (!type) {
      toast.error("Formato não suportado. Use fotos ou vídeos.");
      return;
    }

    let videoDuration = 0;
    if (type === 'video' || type === 'audio') {
       const isValid = await new Promise((resolve) => {
          const el = document.createElement(type === 'video' ? 'video' : 'audio');
          el.preload = 'metadata';
          el.onloadedmetadata = () => {
             window.URL.revokeObjectURL(el.src);
             videoDuration = el.duration;
             resolve(el.duration <= 120);
          };
          el.onerror = () => resolve(false);
          el.src = URL.createObjectURL(file);
       });

       if (!isValid) {
          toast.error("Stories de áudio e vídeo devem ter no máximo 2 minutos.");
          return;
       }
    }

    const url = URL.createObjectURL(file);
    setPreview({
      url,
      type,
      blob: file,
      mimeType: file.type,
      duration: videoDuration
    });
    
    if (fileRef.current) fileRef.current.value = '';
  };

  function handleClose() {
    stopCamera();
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setTextContent('');
    setBgColor('#128C7E');
    setPreview(null);
    onClose();
  }

  const handlePublish = async () => {
    if (isUploading || !user?.id) {
       toast.error("Erro: Usuário não identificado. Tente novamente.");
       return;
    }
    try {
      let mediaUrl = null;
      let mediaType = mode;

      if (mode === 'photo' || mode === 'video' || mode === 'audio') {
          if (!preview?.blob) throw new Error("Mídia não encontrada.");
          let file = preview.blob instanceof File ? preview.blob : new File([preview.blob], `story.${mode === 'photo' ? 'jpg' : mode === 'audio' ? 'webm' : 'mp4'}`, { type: preview.mimeType });
          
          const url = await uploadMedia(file, { bucket: 'stories' });
          if (!url) throw new Error("Falha no upload");
          mediaUrl = url;
          mediaType = (mode === 'photo' ? 'image' : mode === 'video' ? 'video' : 'audio') as any;
      } else {
         mediaType = 'text';
      }

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const inserts = [];
      const duration = preview?.duration || 0;
      
      // Removed the segmenting logic which uses `#t=start,end` as suggested in the review,
      // because storing multiple rows pointing to same blob is bad practice.
      inserts.push({
         author_id: user.id,
         user_id: user.id,
         profile_id: user.id,
         media_url: mediaUrl,
         media_type: mediaType,
         content: textContent,
         background_color: mode === 'text' ? bgColor : null,
         expires_at: expiresAt.toISOString()
      });

      const { error: insertError } = await supabase
        .from('stories')
        .insert(inserts);

      if (insertError) throw insertError;

      toast.success("Status publicado com sucesso!");
      onCreated?.();
      handleClose();
    } catch (err: any) {
      console.error("Erro ao salvar story:", err);
      const detail = err?.message || "Verifique se você rodou o script SQL de atualização do banco.";
      toast.error(`Erro ao publicar status: ${detail}`);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10005] bg-black flex flex-col">
      <div className="flex-1 relative">
        {mode !== 'audio' && mode !== 'text' && !preview && (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            className={cn("absolute inset-0 w-full h-full object-cover", facingMode === 'user' && "-scale-x-100")} 
          />
        )}
        
        {mode === 'audio' && !preview && (
          <div 
            onClick={handleAction}
            className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 overflow-hidden cursor-pointer"
          >
             <div className={cn(
               "w-48 h-48 rounded-full bg-whatsapp-green/5 flex items-center justify-center border border-whatsapp-green/10 transition-all duration-500",
               recording ? "scale-125 bg-whatsapp-green/10 border-whatsapp-green/30" : ""
             )}>
                <div className={cn(
                  "w-32 h-32 rounded-full bg-whatsapp-green/10 flex items-center justify-center relative",
                  recording ? "animate-pulse" : ""
                )}>
                   {recording && <div className="absolute inset-0 rounded-full bg-whatsapp-green/20 animate-ping" />}
                   <Mic className={cn("w-14 h-14 transition-all", recording ? "text-whatsapp-green scale-110" : "text-white/20")} />
                </div>
             </div>
             <p className="mt-8 text-[10px] font-black uppercase tracking-[0.3em] text-whatsapp-green/40">
                {recording ? "Gravando Áudio..." : "Pronto para Gravar"}
             </p>
          </div>
        )}
        
        {preview?.type === 'image' && <img src={preview.url} className="absolute inset-0 w-full h-full object-cover" alt="" />}
        {preview?.type === 'video' && <video src={preview.url} autoPlay loop playsInline controls className="absolute inset-0 w-full h-full object-contain bg-black" />}
        {preview?.type === 'audio' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
             <div className="w-32 h-32 rounded-full bg-whatsapp-green/10 flex items-center justify-center animate-pulse border-2 border-whatsapp-green/20">
                <Mic className="w-12 h-12 text-whatsapp-green" />
             </div>
             <p className="mt-4 text-xs font-black uppercase tracking-widest text-whatsapp-green/60">Áudio Selecionado</p>
             <audio src={preview.url} autoPlay loop controls className="mt-8" />
          </div>
        )}
        
        {recording && (
          <div className="absolute top-10 left-0 right-0 z-[320] px-4">
            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden border border-black/10">
              <div 
                className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(recordDuration / 120) * 100}%` }}
              />
            </div>
          </div>
        )}
        
        {(mode === 'text' || preview) && (
          <div className={cn(
            "absolute inset-0 flex flex-col items-center justify-center p-10 transition-all z-[310]",
            mode === 'text' ? "" : "bg-black/20 pointer-events-none"
          )} style={{ backgroundColor: mode === 'text' ? bgColor : undefined }}>
            <textarea
              autoFocus
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Digite sua legenda..."
              className="w-full bg-transparent text-white text-3xl font-bold text-center placeholder:text-white/40 border-none outline-none resize-none overflow-hidden drop-shadow-lg pointer-events-auto"
              style={{ height: 'auto' }}
              onInput={(e: any) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm px-10">
             <div className="w-full max-w-xs space-y-4">
               <div className="flex items-center justify-between text-white text-xs font-black uppercase tracking-widest">
                 <span>Publicando...</span>
                 <span>{progress}%</span>
               </div>
               <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-whatsapp-green transition-all duration-300 shadow-[0_0_20px_rgba(37,211,102,0.6)]" 
                    style={{ width: `${progress}%` }}
                  />
               </div>
             </div>
          </div>
        )}

        <input 
          type="file" 
          ref={fileRef}
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="absolute top-0 left-0 right-0 z-[400] flex items-center justify-between p-6 pt-12 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleClose();
            }} 
            aria-label="Fechar criador de stories"
            className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white backdrop-blur-md pointer-events-auto"
          >
            <X />
          </button>
          
          <div className="flex gap-4 pointer-events-auto">
            {mode === 'text' && (
               <button 
                 onClick={() => {
                   const idx = colors.indexOf(bgColor);
                   setBgColor(colors[(idx + 1) % colors.length]);
                 }} 
                 aria-label="Trocar cor de fundo"
                 className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white backdrop-blur-md"
               >
                 <Palette size={20} />
               </button>
            )}
            {!preview && mode !== 'text' && (
              <button 
                onClick={toggleFacingMode} 
                aria-label="Alternar entre câmera frontal e traseira"
                className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white backdrop-blur-md"
              >
                <FlipHorizontal size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 pb-[calc(3rem+env(safe-area-inset-bottom))] bg-black flex flex-col items-center gap-8 border-t border-white/5">
        {!preview ? (
          <>
            <div className="flex items-center justify-center gap-10 h-24">
               {mode !== 'text' && (
                 <button 
                  onClick={() => fileRef.current?.click()}
                  aria-label="Abrir galeria"
                  className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-whatsapp-green hover:bg-white/20 transition-all border border-white/5"
                 >
                   <Image size={24} />
                 </button>
               )}

              {mode === 'text' ? (
                 <button 
                   onClick={() => { if (textContent.trim()) handlePublish() }}
                   disabled={isUploading}
                   aria-label="Publicar texto"
                   className="w-20 h-20 rounded-full bg-whatsapp-green flex items-center justify-center active:scale-90 transition-all shadow-[0_0_25px_rgba(37,211,102,0.3)]"
                 >
                   {isUploading ? (
                      <div className="w-8 h-8 rounded-full border-4 border-whatsapp-dark border-t-transparent animate-spin" />
                   ) : (
                      <Check className="text-whatsapp-dark w-10 h-10" />
                   )}
                 </button>
              ) : (
                 <div className="flex flex-col items-center">
                   {recording && (
                     <div className="mb-4 bg-red-600 px-3 py-1 rounded-full animate-pulse shadow-lg border border-white/20">
                       <span className="text-white text-[10px] font-black font-mono">
                         00:{recordDuration.toString().padStart(2, '0')}
                       </span>
                     </div>
                   )}
                    <button 
                      onClick={handleAction}
                      disabled={isProcessingPhoto}
                      aria-label={recording ? "Parar gravação" : "Iniciar captura"}
                      className={cn(
                        "w-22 h-22 rounded-full border-4 flex items-center justify-center transition-all active:scale-90",
                        recording ? "border-red-500 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.4)]" : "border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]",
                        isProcessingPhoto && "opacity-50 scale-95 border-gray-400"
                      )}
                    >
                      {recording ? (
                        <div className="w-8 h-8 rounded-sm bg-red-500 animate-pulse" />
                      ) : (
                        <div className={cn("rounded-full transition-all", mode === 'video' ? "w-16 h-16 bg-red-500" : isProcessingPhoto ? "w-10 h-10 bg-white/50 animate-ping" : "w-16 h-16 bg-white")} />
                      )}
                    </button>
                 </div>
              )}
              {isProcessingPhoto && (
                  <div className="absolute inset-0 bg-white/30 z-[400] animate-in fade-in duration-100 pointer-events-none" />
               )}
            </div>

            <div className="flex items-center justify-center gap-10">
              <button aria-label="Modo foto" onClick={() => setMode('photo')} className={cn("text-[11px] font-black tracking-[0.2em] transition-all", mode === 'photo' ? "text-whatsapp-green" : "text-white/30")}>FOTO</button>
              <button aria-label="Modo vídeo" onClick={() => setMode('video')} className={cn("text-[11px] font-black tracking-[0.2em] transition-all", mode === 'video' ? "text-whatsapp-green" : "text-white/30")}>VÍDEO</button>
              <button aria-label="Modo áudio" onClick={() => setMode('audio')} className={cn("text-[11px] font-black tracking-[0.2em] transition-all", mode === 'audio' ? "text-whatsapp-green" : "text-white/30")}>ÁUDIO</button>
              <button aria-label="Modo texto" onClick={() => setMode('text')} className={cn("text-[11px] font-black tracking-[0.2em] transition-all", mode === 'text' ? "text-whatsapp-green" : "text-white/30")}>TEXTO</button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-8 w-full">
            <button 
              onClick={handlePublish}
              disabled={isUploading}
              aria-label="Publicar mídia"
              className="w-22 h-22 rounded-full bg-whatsapp-green flex items-center justify-center active:scale-90 transition-all shadow-[0_0_30px_rgba(37,211,102,0.4)]"
            >
              {isUploading ? <div className="w-10 h-10 rounded-full border-4 border-whatsapp-dark border-t-transparent animate-spin" /> : <Check className="text-whatsapp-dark w-12 h-12" />}
            </button>

            <div className="flex items-center justify-center w-full">
               <button 
                 onClick={() => {
                   if (preview?.url) URL.revokeObjectURL(preview.url);
                   setPreview(null);
                 }} 
                 aria-label="Descartar e refazer"
                 className="flex items-center gap-3 text-white/50 hover:text-white transition-all group"
               >
                  <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10">
                    <RotateCcw size={18} />
                  </div>
                  <span className="text-[10px] font-black tracking-widest uppercase">Refazer</span>
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
