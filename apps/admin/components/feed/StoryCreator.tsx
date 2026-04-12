"use client";

import { useRef, useState, useEffect } from 'react';
import { X, Check, FlipHorizontal, Image, Circle, RotateCcw, Type, Palette } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function StoryCreator({ open, onClose, user, onCreated }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [mode, setMode] = useState<'photo' | 'video' | 'text'>('photo');
  const [recording, setRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [preview, setPreview] = useState<any>(null);
  const [textContent, setTextContent] = useState('');
  const [bgColor, setBgColor] = useState('#00A884');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const colors = ['#00A884', '#128C7E', '#7E57C2', '#EC407A', '#FF7043', '#26A69A', '#42A5F5'];

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startCamera = async () => {
    if (mode === 'text') return; // Don't start camera for text mode
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1920 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.muted = true; }
    } catch (e) {
      console.error('Camera error', e);
    }
  };

  useEffect(() => {
    if (open) startCamera();
    return () => { 
      stopCamera(); 
      if (timerRef.current) clearInterval(timerRef.current); 
    };
  }, [open, facingMode]);

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
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const mimeType = isIOS ? 'video/mp4' : 'video/webm;codecs=vp9,opus';
    
    try {
      const recorder = new MediaRecorder(streamRef.current, { mimeType, videoBitsPerSecond: 4000000 });
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setPreview({ url: URL.createObjectURL(blob), type: 'video', blob, mimeType });
        stopCamera();
      };
      recorderRef.current = recorder;
      recorder.start(100);
      setRecording(true);
      setRecordDuration(0);
      timerRef.current = setInterval(() => {
        setRecordDuration(d => {
          if (d + 1 >= 15) stopRecording();
          return d + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Story record error:", err);
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  };

  const handleAction = () => {
    if (mode === 'photo') capturePhoto();
    else if (!recording) startRecording();
    else stopRecording();
  };

  const handlePublish = async () => {
    if (uploading) return;
    setUploading(true);
    
    try {
      let mediaUrl = null;
      let mediaType = mode;

      if (mode === 'photo' || mode === 'video') {
         const file = preview.blob;
         const ext = preview.mimeType.split('/')[1] || (mode === 'photo' ? 'jpg' : 'webm');
         const fileName = `story_${Date.now()}_${user.id}.${ext}`;
         
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
         mediaType = mode === 'photo' ? 'photo' : 'video';
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

      onCreated?.();
      onClose();
    } catch (err: any) {
      console.error("Erro ao salvar story:", err);
      const detail = err?.message || "Verifique se você rodou o script SQL de atualização do banco.";
      toast.error(`Erro ao publicar status: ${detail}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black flex flex-col">
      <div className="flex-1 relative">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={cn("absolute inset-0 w-full h-full object-cover", preview && "hidden", facingMode === 'user' && "-scale-x-100")} 
        />
        
        {preview?.type === 'image' && <img src={preview.url} className="absolute inset-0 w-full h-full object-cover" alt="" />}
        {preview?.type === 'video' && <video src={preview.url} autoPlay loop playsInline className="absolute inset-0 w-full h-full object-cover" />}
        
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

        {/* Upload Progress Bar */}
        {uploading && (
          <div className="absolute top-0 left-0 right-0 z-[350] h-1.5 bg-black/40">
             <div 
               className="h-full bg-whatsapp-green transition-all duration-300 shadow-[0_0_10px_rgba(37,211,102,0.5)]" 
               style={{ width: `${uploadProgress}%` }}
             />
          </div>
        )}

        <div className="absolute top-0 left-0 right-0 z-[400] flex items-center justify-between p-6 pt-12 bg-gradient-to-b from-black/50 to-transparent">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center text-white backdrop-blur-md">
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
            {/* 1. Botão da Câmera (Subiu!) */}
            <div className="flex items-center justify-center h-24">
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
                 <button 
                   onPointerDown={handleAction}
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
              )}
            </div>

            {/* 2. Textos dos Modos (Lado a Lado e Centralizados) */}
            <div className="flex items-center justify-center gap-10">
              <button onClick={() => setMode('photo')} className={cn("text-[11px] font-black tracking-[0.2em] transition-all", mode === 'photo' ? "text-whatsapp-green" : "text-white/30")}>FOTO</button>
              <button onClick={() => setMode('video')} className={cn("text-[11px] font-black tracking-[0.2em] transition-all", mode === 'video' ? "text-whatsapp-green" : "text-white/30")}>VÍDEO</button>
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
               <button onClick={() => setPreview(null)} className="flex items-center gap-3 text-white/50 hover:text-white transition-all group">
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
