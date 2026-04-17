"use client";

import { useRef, useState, useEffect, useCallback } from 'react';
import { X, Check, FlipHorizontal, Image, Circle, RotateCcw, Type, Palette, Mic } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { compressImage } from '@/lib/image-compression';

export default function StoryCreator({ open, onClose, user, onCreated }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [mode, setMode] = useState<'photo' | 'video' | 'text' | 'audio'>('photo');
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [preview, setPreview] = useState<any>(null);
  const [textContent, setTextContent] = useState('');
  const [bgColor, setBgColor] = useState('#00A884');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const colors = ['#00A884', '#128C7E', '#7E57C2', '#EC407A', '#FF7043', '#26A69A', '#42A5F5'];



  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        t.stop();
        streamRef.current?.removeTrack(t);
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (mode === 'text') return; // Don't start stream for text mode
    stopCamera();
    try {
      const constraints = {
        video: mode === 'audio' ? false : {
          width: { ideal: 720 },
          height: { ideal: 1280 },
          facingMode
        },
        audio: true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; }
    } catch (e) {
      console.error('Camera error', e);
    }
  }, [mode, facingMode, stopCamera]);

  useEffect(() => {
    if (open) startCamera();
    return () => { 
      stopCamera(); 
      if (timerRef.current) clearInterval(timerRef.current); 
    };
  }, [open, facingMode, mode, startCamera]); // Incluída startCamera para estabilidade (ela usa useCallback)

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0);
    }
    canvas.toBlob(blob => {
      if (blob) {
        setPreview({ url: URL.createObjectURL(blob), type: 'image', blob, mimeType: 'image/jpeg' });
        stopCamera();
      }
    }, 'image/jpeg', 0.92);
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    
    const getSupportedMimeType = () => {
      if (mode === 'audio') {
        const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/aac'];
        for (const type of types) {
          if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return ''; // Navegador escolhe o melhor
      } else {
        const types = ['video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
        for (const type of types) {
          if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return '';
      }
    };

    const mimeType = getSupportedMimeType();
    
    try {
      if (!streamRef.current || streamRef.current.getTracks().length === 0) {
        throw new Error("Stream sem trilhas ativas.");
      }

      const options: any = {};
      if (mimeType) options.mimeType = mimeType;
      if (mode !== 'audio') options.videoBitsPerSecond = 1000000;

      const recorder = new MediaRecorder(streamRef.current, options);
      
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const finalMime = recorder.mimeType || mimeType || (mode === 'audio' ? 'audio/mp4' : 'video/mp4');
        const blob = new Blob(chunksRef.current, { type: finalMime });
        setPreview({ url: URL.createObjectURL(blob), type: mode === 'audio' ? 'audio' : 'video', blob, mimeType: finalMime });
        stopCamera();
      };
      recorderRef.current = recorder;
      
      // Pequeno fôlego para o hardware antes de iniciar o 'start'
      setTimeout(() => {
        if (recorderRef.current && recorderRef.current.state === 'inactive') {
          recorderRef.current.start(1000); // 1s timeslice é mais seguro no mobile
          setRecording(true);
          setRecordDuration(0);
          timerRef.current = setInterval(() => {
            setRecordDuration(prev => {
              if (prev >= 29) { // 30 seconds limit (0 to 29 = 30 ticks)
                stopRecording();
                return 30;
              }
              return prev + 1;
            });
          }, 1000);
        }
      }, 100);
    } catch (err) {
      console.error("Story record error:", err);
      toast.error("Erro ao iniciar gravação. Tente novamente.");
    }
  };

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Mídia muito pesada! Máximo 10MB para Stories.");
      return;
    }

    // Validar duração para garantir Stories rápidos
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
         window.URL.revokeObjectURL(video.src);
         if (video.duration > 31) { // 31s de tolerância
            toast.error("Story muito longo! O limite é de 30 segundos.");
            setPreview(null);
            return;
         }
      };
      video.src = URL.createObjectURL(file);
    }

    const type = file.type.startsWith('image/') ? 'image' : 
                 file.type.startsWith('video/') ? 'video' :
                 file.type.startsWith('audio/') ? 'audio' : null;

    if (!type) {
      toast.error("Formato não suportado. Use fotos ou vídeos.");
      return;
    }

    if (type === 'video' || type === 'audio') {
       const isValid = await new Promise((resolve) => {
          const el = document.createElement(type === 'video' ? 'video' : 'audio');
          el.preload = 'metadata';
          el.onloadedmetadata = () => {
             window.URL.revokeObjectURL(el.src);
             resolve(el.duration <= 30);
          };
          el.onerror = () => resolve(false);
          el.src = URL.createObjectURL(file);
       });

       if (!isValid) {
          toast.error("Stories de áudio e vídeo devem ter no máximo 30 segundos.");
          return;
       }
    }

    const url = URL.createObjectURL(file);
    setPreview({
      url,
      type,
      blob: file,
      mimeType: file.type
    });
    stopCamera();
    
    // Reseta o input para permitir selecionar o mesmo arquivo novamente se deletado
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleAction = () => {
    if (mode === 'photo') capturePhoto();
    else if (!recording) startRecording();
    else stopRecording();
  };
  function handleClose() {
    stopCamera(); // Força o desligamento do hardware
    if (preview?.url) URL.revokeObjectURL(preview.url);
    onClose();
  }

  const handlePublish = async () => {
    if (uploading || !user?.id) {
       toast.error("Erro: Usuário não identificado. Tente novamente.");
       return;
    }
    setUploading(true);
    
    try {
      let mediaUrl = null;
      let mediaType = mode;

      if (mode === 'photo' || mode === 'video' || mode === 'audio') {
         if (!preview?.blob) throw new Error("Mídia não encontrada.");
         
         let file = preview.blob;
         const isImage = file.type.startsWith('image/');
         const fileExt = file.name?.split('.').pop() || (isImage ? 'jpg' : file.type.split('/')[1]) || 'bin';
         
         if (isImage) {
           file = await compressImage(file, 1080, 0.65);
         }

         const fileName = `story_${Date.now()}_${user.id}.${fileExt}`;
         
         // Simulação de progresso para melhor UX
         const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
               if (prev >= 90) { clearInterval(progressInterval); return 90; }
               return prev + 10;
            });
         }, 200);

         const { data, error: uploadError } = await supabase.storage
           .from('avatars')
           .upload(fileName, file);
           
         clearInterval(progressInterval);
         setUploadProgress(100);

         if (uploadError) throw uploadError;
         
         const { data: { publicUrl } } = supabase.storage
           .from('avatars')
           .getPublicUrl(data.path);
           
         mediaUrl = publicUrl;
         mediaType = (mode === 'photo' ? 'image' : mode === 'video' ? 'video' : 'audio') as any;
      } else {
         mediaType = 'text';
         setUploadProgress(100);
      }

      // Expiração em 24h
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          author_id: user.id,
          media_url: mediaUrl,
          media_type: mediaType,
          content: textContent,
          background_color: mode === 'text' ? bgColor : null,
          expires_at: expiresAt.toISOString()
        });

      if (insertError) throw insertError;

      toast.success("Status publicado com sucesso!");
      onCreated?.();
      handleClose();
    } catch (err: any) {
      console.error("Erro ao salvar story:", err);
      const detail = err?.message || "Verifique se você rodou o script SQL de atualização do banco.";
      toast.error(`Erro ao publicar status: ${detail}`);
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10005] bg-black flex flex-col">
      <div className="flex-1 relative">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={cn("absolute inset-0 w-full h-full object-cover", (preview || mode === 'audio') && "hidden", facingMode === 'user' && "-scale-x-100")} 
        />
        
        {/* Tela de Gravação de Áudio (Placeholder quando a câmera está desligada) */}
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
        {preview?.type === 'video' && <video src={preview.url} autoPlay loop playsInline className="absolute inset-0 w-full h-full object-cover" />}
        {preview?.type === 'audio' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
             <div className="w-32 h-32 rounded-full bg-whatsapp-green/10 flex items-center justify-center animate-pulse border-2 border-whatsapp-green/20">
                <Mic className="w-12 h-12 text-whatsapp-green" />
             </div>
             <p className="mt-4 text-xs font-black uppercase tracking-widest text-whatsapp-green/60">Áudio Selecionado</p>
             <audio src={preview.url} autoPlay loop />
          </div>
        )}
        
        {/* Barra de Progresso da Gravação */}
        {recording && (
          <div className="absolute top-10 left-0 right-0 z-[320] px-4">
            <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden border border-black/10">
              <div 
                className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(recordDuration / 30) * 100}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Overlay Text (Disponível em todos os modos agora) */}
        {(mode === 'text' || preview) && (
          <div className={cn(
            "absolute inset-0 flex flex-col items-center justify-center p-10 transition-all z-[310]",
            mode === 'text' ? "" : "bg-black/20"
          )} style={{ backgroundColor: mode === 'text' ? bgColor : undefined }}>
            <textarea
              autoFocus
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Digite sua legenda..."
              className="w-full bg-transparent text-white text-3xl font-bold text-center placeholder:text-white/40 border-none outline-none resize-none overflow-hidden drop-shadow-lg"
              style={{ height: 'auto' }}
              onInput={(e: any) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />
          </div>
        )}

        {/* Upload Progress Bar - Centralizado para melhor visibilidade */}
        {uploading && (
          <div className="absolute inset-0 z-[500] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm px-10">
             <div className="w-full max-w-xs space-y-4">
               <div className="flex items-center justify-between text-white text-xs font-black uppercase tracking-widest">
                 <span>Publicando...</span>
                 <span>{uploadProgress}%</span>
               </div>
               <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className="h-full bg-whatsapp-green transition-all duration-300 shadow-[0_0_20px_rgba(37,211,102,0.6)]" 
                    style={{ width: `${uploadProgress}%` }}
                  />
               </div>
             </div>
          </div>
        )}

        <input 
          type="file" 
          ref={fileRef}
          className="hidden"
          accept="image/*,video/*,audio/*"
          onChange={handleFileSelect}
        />

        <div className="absolute top-0 left-0 right-0 z-[400] flex items-center justify-between p-6 pt-12 bg-gradient-to-b from-black/50 to-transparent">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              handleClose();
            }} 
            className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white backdrop-blur-md"
          >
            <X />
          </button>
          
          <div className="flex gap-4">
            {mode === 'text' && (
               <button 
                 onClick={() => {
                   const idx = colors.indexOf(bgColor);
                   setBgColor(colors[(idx + 1) % colors.length]);
                 }} 
                 className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white backdrop-blur-md"
               >
                 <Palette size={20} />
               </button>
            )}
            {!preview && mode !== 'text' && (
              <button 
                onClick={() => setFacingMode(m => m === 'user' ? 'environment' : 'user')} 
                className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white backdrop-blur-md"
              >
                <FlipHorizontal size={18} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-8 pb-12 bg-black flex flex-col items-center gap-8 border-t border-white/5">
        {!preview ? (
          <>
            {/* 1. Botão da Câmera e Galeria */}
            <div className="flex items-center justify-center gap-10 h-24">
               {mode !== 'text' && (
                 <button 
                  onClick={() => fileRef.current?.click()}
                  className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:text-whatsapp-green hover:bg-white/20 transition-all border border-white/5"
                 >
                   <Image size={24} />
                 </button>
               )}

              {mode === 'text' ? (
                 <button 
                   onClick={() => { if (textContent.trim()) handlePublish() }}
                   disabled={uploading}
                   className="w-20 h-20 rounded-full bg-whatsapp-green flex items-center justify-center active:scale-90 transition-all shadow-[0_0_25px_rgba(37,211,102,0.3)]"
                 >
                   {uploading ? (
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
                     className={cn(
                       "w-22 h-22 rounded-full border-4 flex items-center justify-center transition-all active:scale-90",
                       recording ? "border-red-500 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.4)]" : "border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                     )}
                   >
                     {recording ? (
                       <div className="w-8 h-8 rounded-sm bg-red-500 animate-pulse" />
                     ) : (
                       <div className={cn("w-16 h-16 rounded-full", mode === 'video' ? "bg-red-500" : "bg-white")} />
                     )}
                   </button>
                 </div>
              )}
            </div>

            {/* 2. Textos dos Modos (Lado a Lado e Centralizados) */}
              <div className="flex items-center justify-center gap-10">
                <button onClick={() => setMode('photo')} className={cn("text-[11px] font-black tracking-[0.2em] transition-all", mode === 'photo' ? "text-whatsapp-green" : "text-white/30")}>FOTO</button>
                <button onClick={() => setMode('video')} className={cn("text-[11px] font-black tracking-[0.2em] transition-all", mode === 'video' ? "text-whatsapp-green" : "text-white/30")}>VÍDEO</button>
                <button onClick={() => setMode('audio')} className={cn("text-[11px] font-black tracking-[0.2em] transition-all", mode === 'audio' ? "text-whatsapp-green" : "text-white/30")}>ÁUDIO</button>
                <button onClick={() => setMode('text')} className={cn("text-[11px] font-black tracking-[0.2em] transition-all", mode === 'text' ? "text-whatsapp-green" : "text-white/30")}>TEXTO</button>
              </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-8 w-full">
            <button 
              onClick={handlePublish}
              disabled={uploading}
              className="w-22 h-22 rounded-full bg-whatsapp-green flex items-center justify-center active:scale-90 transition-all shadow-[0_0_30px_rgba(37,211,102,0.4)]"
            >
              {uploading ? <div className="w-10 h-10 rounded-full border-4 border-whatsapp-dark border-t-transparent animate-spin" /> : <Check className="text-whatsapp-dark w-12 h-12" />}
            </button>

            <div className="flex items-center justify-center w-full">
               <button 
                 onClick={() => {
                   if (preview?.url) URL.revokeObjectURL(preview.url);
                   setPreview(null);
                 }} 
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
