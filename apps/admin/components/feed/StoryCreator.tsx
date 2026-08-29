"use client";

import React, { useRef, useState, useEffect } from 'react';
import { 
  X, Check, Image as ImageIcon, Type, Mic, Camera, 
  RotateCcw, Palette, Upload, Sparkles, Send, Loader2,
  FlipHorizontal, Zap, ZapOff, Play, Pause, Video
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useMediaCapture } from '@/hooks/useMediaCapture';

export default function StoryCreator({ open, onClose, user, onCreated }: any) {
  const fileRef = useRef<HTMLInputElement>(null);

  // Modos de criação: 'photo' | 'video' | 'gallery' | 'text' | 'audio'
  const [activeTab, setActiveTab] = useState<'photo' | 'video' | 'gallery' | 'text' | 'audio'>('photo');
  
  const [preview, setPreview] = useState<{
    url: string;
    type: 'image' | 'video' | 'audio';
    blob?: Blob;
    mimeType?: string;
    file?: File;
    duration?: number;
  } | null>(null);
  
  const [textContent, setTextContent] = useState('');
  const [caption, setCaption] = useState('');
  const [bgColor, setBgColor] = useState('#00A884');

  const { uploadMedia, isUploading, progress } = useMediaUpload();

  // Hook robusto de câmera e vídeo
  const captureMode = activeTab === 'video' ? 'video' : 'photo';
  const {
    videoRef,
    recording,
    seconds: recordDuration,
    facingMode,
    flashOn,
    cameraError,
    isReady,
    isProcessingPhoto,
    startCamera,
    stopCamera,
    capturePhoto,
    startRecording,
    stopRecording,
    toggleFacingMode,
    toggleFlash,
  } = useMediaCapture(captureMode, 'user');

  // Gravação de Áudio Limpa
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioTimerRef = useRef<any>(null);

  const colors = [
    '#00A884', '#0d9488', '#0284c7', '#6366f1', 
    '#8b5cf6', '#d946ef', '#f43f5e', '#ea580c', '#18181b'
  ];

  const needsCamera =
    open && (activeTab === "photo" || activeTab === "video") && !preview;

  // Iniciar ou pausar câmera com base estrita no estado de necessidade
  useEffect(() => {
    if (!open) {
      handleReset();
      return;
    }

    if (needsCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeTab, !!preview]);

  const handleReset = () => {
    if (preview?.url && preview.url.startsWith('blob:')) {
      URL.revokeObjectURL(preview.url);
    }
    setPreview(null);
    setTextContent('');
    setCaption('');
    setIsRecordingAudio(false);
    setAudioSeconds(0);
    clearInterval(audioTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    stopCamera();
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Disparo de Foto ao Vivo
  const handleTakePhoto = async () => {
    if (isProcessingPhoto) return;
    
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }

    const video = videoRef.current;
    if (video) {
      const flash = document.createElement('div');
      flash.style.position = 'absolute';
      flash.style.inset = '0';
      flash.style.backgroundColor = 'white';
      flash.style.zIndex = '999';
      flash.style.transition = 'opacity 0.25s ease-out';
      video.parentElement?.appendChild(flash);
      requestAnimationFrame(() => {
        flash.style.opacity = '0';
        setTimeout(() => flash.remove(), 250);
      });
    }

    const blob = await capturePhoto();
    if (blob) {
      setPreview({
        url: URL.createObjectURL(blob),
        type: 'image',
        blob,
        mimeType: 'image/jpeg'
      });
    } else {
      toast.error("Não foi possível capturar a foto. Verifique a câmera.");
    }
  };

  // Disparo de Gravação de Vídeo ao Vivo
  const handleToggleVideoRecord = async () => {
    if (!recording) {
      startRecording();
    } else {
      const blob = await stopRecording();
      if (blob) {
        setPreview({
          url: URL.createObjectURL(blob),
          type: 'video',
          blob,
          mimeType: blob.type || 'video/mp4',
          duration: recordDuration
        });
      }
    }
  };

  // Seleção de Arquivo da Galeria
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      toast.error("Arquivo muito grande! Máximo 30MB para Stories.");
      return;
    }

    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');

    if (!isImg && !isVid) {
      toast.error("Selecione uma imagem ou vídeo.");
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview({
      url,
      type: isImg ? 'image' : 'video',
      mimeType: file.type,
      file,
    });
  };

  // Gravação de Áudio
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setPreview({
          url: audioUrl,
          type: 'audio',
          blob: audioBlob,
          mimeType: 'audio/webm'
        });
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setAudioSeconds(0);

      audioTimerRef.current = setInterval(() => {
        setAudioSeconds(prev => {
          if (prev >= 59) {
            stopAudioRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err: any) {
      toast.error("Permissão de microfone não concedida.");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingAudio(false);
    clearInterval(audioTimerRef.current);
  };

  // Publicação do Story no Supabase
  const handlePublish = async () => {
    if (!user?.id) {
      toast.error("Você precisa estar logado para publicar.");
      return;
    }

    if (activeTab === 'text' && !textContent.trim()) {
      toast.error("Digite algum texto para o seu story.");
      return;
    }

    if (activeTab !== 'text' && !preview) {
      toast.error("Selecione ou capture uma mídia.");
      return;
    }

    const toastId = toast.loading("Publicando seu story na comunidade...");

    try {
      let mediaUrl = null;
      let storyType: string = activeTab;

      if (preview) {
        storyType = preview.type;
        const fileToUpload = preview.file || (preview.blob ? new File([preview.blob], `story-${Date.now()}.${preview.type === 'audio' ? 'webm' : (preview.type === 'video' ? 'mp4' : 'jpg')}`, { type: preview.mimeType }) : null);

        if (fileToUpload) {
          const path = `${user.id}/${Date.now()}-${fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const { error: uploadError } = await supabase.storage
            .from('stories')
            .upload(path, fileToUpload, { cacheControl: '3600', upsert: false });

          if (uploadError) {
            const { error: fallbackError } = await supabase.storage
              .from('media')
              .upload(path, fileToUpload, { cacheControl: '3600', upsert: false });
            
            if (fallbackError) throw uploadError;
            
            const { data: publicUrlData } = supabase.storage.from('media').getPublicUrl(path);
            mediaUrl = publicUrlData.publicUrl;
          } else {
            const { data: publicUrlData } = supabase.storage.from('stories').getPublicUrl(path);
            mediaUrl = publicUrlData.publicUrl;
          }
        }
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const { error: insertError } = await supabase
        .from('stories')
        .insert({
          author_id: user.id,
          user_id: user.id,
          type: storyType,
          media_type: storyType,
          media_url: mediaUrl,
          content: activeTab === 'text' ? textContent.trim() : caption.trim() || null,
          background_color: activeTab === 'text' ? bgColor : null,
          metadata: {
            bg_color: activeTab === 'text' ? bgColor : undefined,
          },
          expires_at: expiresAt,
          created_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      toast.success("Story publicado com sucesso! 🙌", { id: toastId });
      handleClose();
      if (onCreated) onCreated();

    } catch (err: any) {
      console.error("Erro ao salvar story:", err);
      toast.error(`Erro ao publicar story: ${err.message || "Tente novamente"}`, { id: toastId });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10005] bg-black touch-none overscroll-contain flex items-center justify-center pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] animate-in fade-in duration-200">
      
      {/* ─── CARD DO STORIES: Mobile Full-Screen | Desktop 9:16 Card ─── */}
      <div className="relative w-full h-full md:h-[min(92vh,820px)] md:max-w-[410px] bg-black overflow-hidden md:rounded-[36px] md:border md:border-white/15 md:shadow-[0_0_60px_rgba(0,0,0,0.8)] flex flex-col justify-between select-none">
        
        {/* ─── HEADER SUPERIOR COM BOTÕES FLUTUANTES ─── */}
        <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between p-4 pt-[max(1rem,env(safe-area-inset-top))] bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none">
          {/* Botão Fechar */}
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-lg border border-white/20 flex items-center justify-center text-white transition-all active:scale-90 shadow-lg pointer-events-auto"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Indicador de Gravação de Vídeo Central */}
          {recording && (
            <div className="bg-rose-600/90 backdrop-blur-lg px-3.5 py-1 rounded-full border border-white/25 flex items-center gap-2 shadow-xl animate-pulse pointer-events-auto">
              <div className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span className="text-xs font-mono font-black text-white">
                00:{recordDuration.toString().padStart(2, '0')} / 01:00
              </span>
            </div>
          )}

          {/* Controles de Câmera Direita (Flash & Flip) */}
          {(activeTab === 'photo' || activeTab === 'video') && !preview && (
            <div className="flex items-center gap-2 pointer-events-auto">
              <button
                onClick={toggleFlash}
                className={cn(
                  "w-10 h-10 rounded-full backdrop-blur-lg border border-white/20 flex items-center justify-center transition-all active:scale-90 shadow-lg",
                  flashOn ? "bg-amber-500 text-black border-amber-400 font-bold" : "bg-black/50 text-white hover:bg-black/80"
                )}
                title="Alternar Flash"
              >
                {flashOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleFacingMode}
                className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-lg border border-white/20 flex items-center justify-center text-white transition-all active:scale-90 shadow-lg"
                title="Trocar Câmera (Frontal / Traseira)"
              >
                <FlipHorizontal className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Troca de Cores no Modo Texto */}
          {activeTab === 'text' && !preview && (
            <button
              onClick={() => {
                const idx = colors.indexOf(bgColor);
                setBgColor(colors[(idx + 1) % colors.length]);
              }}
              className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-lg border border-white/20 flex items-center justify-center text-white transition-all active:scale-90 shadow-lg pointer-events-auto"
              title="Trocar cor de fundo"
            >
              <Palette className="w-5 h-5" />
            </button>
          )}

          {/* Botão Refazer no Modo Preview */}
          {preview && (
            <button
              onClick={() => {
                if (preview.url) URL.revokeObjectURL(preview.url);
                setPreview(null);
              }}
              className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-lg border border-white/20 flex items-center justify-center text-white transition-all active:scale-90 shadow-lg pointer-events-auto"
              title="Descartar e refazer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}
        </div>


        {/* ─── CORPO CENTRAL DO VIEWFINDER / CONTEÚDO ─── */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-black flex items-center justify-center">
          
          {/* CÂMERA AO VIVO (FOTO / VÍDEO) */}
          {(activeTab === 'photo' || activeTab === 'video') && !preview && (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-black">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className={cn(
                  "absolute inset-0 w-full h-full object-cover object-center bg-black",
                  facingMode === 'user' && "-scale-x-100"
                )} 
              />

              {!isReady && !cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 gap-3 text-white z-20">
                  <Loader2 className="w-9 h-9 animate-spin text-whatsapp-teal" />
                  <span className="text-xs font-bold text-white/80">Iniciando câmera em alta definição...</span>
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 gap-4 z-20">
                  <Camera className="w-12 h-12 text-rose-500/80" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">Câmera indisponível</p>
                    <p className="text-xs text-white/60 max-w-[240px]">{cameraError}</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('gallery')}
                    className="px-5 py-2.5 rounded-full bg-whatsapp-teal text-white text-xs font-bold shadow-lg"
                  >
                    Usar fotos da Galeria
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODO GALERIA */}
          {activeTab === 'gallery' && !preview && (
            <div 
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center cursor-pointer group hover:bg-white/5 transition-colors z-10"
            >
              <div className="w-20 h-20 rounded-3xl bg-whatsapp-teal/15 border-2 border-dashed border-whatsapp-teal flex items-center justify-center group-hover:scale-110 transition-all shadow-lg shadow-whatsapp-teal/10">
                <Upload className="w-8 h-8 text-whatsapp-teal" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Escolher Foto ou Vídeo</h3>
                <p className="text-xs text-white/50 max-w-[220px]">
                  Toque para selecionar da galeria do seu aparelho
                </p>
              </div>
              <span className="px-5 py-2.5 rounded-full bg-whatsapp-teal text-white text-xs font-bold shadow-lg shadow-whatsapp-teal/20">
                Abrir Galeria
              </span>
            </div>
          )}

          {/* MODO TEXTO (VERSÍCULOS / REFLEXÕES) */}
          {activeTab === 'text' && (
            <div 
              className="absolute inset-0 flex items-center justify-center p-8 transition-colors duration-300 z-10"
              style={{ backgroundColor: bgColor }}
            >
              <textarea
                autoFocus
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Escreva um versículo, oração ou reflexão da fé..."
                className="w-full bg-transparent text-white text-2xl font-bold text-center placeholder:text-white/40 border-none outline-none resize-none drop-shadow-md leading-relaxed"
                rows={6}
              />
            </div>
          )}

          {/* MODO ÁUDIO */}
          {activeTab === 'audio' && !preview && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 text-center bg-gradient-to-b from-zinc-900 to-black z-10">
              <button
                onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
                className={cn(
                  "w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all shadow-xl active:scale-95",
                  isRecordingAudio 
                    ? "bg-rose-600 border-rose-400 animate-pulse shadow-rose-600/30" 
                    : "bg-whatsapp-teal border-whatsapp-tealLight hover:scale-105 shadow-whatsapp-teal/30"
                )}
              >
                {isRecordingAudio ? (
                  <div className="w-8 h-8 rounded bg-white" />
                ) : (
                  <Mic className="w-10 h-10 text-white" />
                )}
              </button>

              <div className="space-y-1">
                <p className="text-sm font-bold text-white">
                  {isRecordingAudio ? `Gravando Áudio (00:${audioSeconds.toString().padStart(2, '0')})` : "Toque para Gravar Áudio"}
                </p>
                <p className="text-xs text-white/50">Até 60 segundos de mensagem de voz</p>
              </div>
            </div>
          )}

          {/* PREVIEW DA FOTO CAPTURADA / SELECIONADA */}
          {preview?.type === 'image' && (
            <img src={preview.url} className="absolute inset-0 w-full h-full object-cover object-center" alt="Preview Story" />
          )}

          {/* PREVIEW DO VÍDEO GRAVADO / SELECIONADO */}
          {preview?.type === 'video' && (
            <video 
              src={preview.url} 
              autoPlay 
              loop 
              playsInline 
              muted={false}
              className="absolute inset-0 w-full h-full object-cover object-center bg-black" 
            />
          )}

          {/* PREVIEW DO ÁUDIO */}
          {preview?.type === 'audio' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 bg-zinc-900 z-10">
              <div className="w-20 h-20 rounded-full bg-whatsapp-teal/20 border border-whatsapp-teal flex items-center justify-center animate-pulse">
                <Mic className="w-8 h-8 text-whatsapp-teal" />
              </div>
              <p className="text-sm font-bold text-white">Áudio Gravado com Sucesso</p>
              <audio src={preview.url} controls className="w-full max-w-[260px] mt-2" />
            </div>
          )}

          {/* Input oculto de arquivo para Galeria */}
          <input 
            type="file" 
            ref={fileRef} 
            accept="image/*,video/*"
            className="hidden" 
            onChange={handleFileSelect} 
          />
        </div>


        {/* ─── RODAPÉ: DISPARADOR, SELETORES E PUBLICAÇÃO ─── */}
        <div className="absolute bottom-0 inset-x-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-8 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col gap-3.5 z-40">
          
          {/* SE NÃO ESTIVER EM PREVIEW: DISPARADOR E SELETOR DE MODOS */}
          {!preview ? (
            <div className="flex flex-col items-center gap-3.5">
              
              {/* Botão Central de Disparo da Câmera */}
              {(activeTab === 'photo' || activeTab === 'video') && (
                <div className="flex items-center justify-between w-full px-6">
                  {/* Botão Galeria Rápido */}
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-all active:scale-90 shadow-lg"
                    title="Galeria"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>

                  {/* Disparador Central */}
                  {activeTab === 'photo' ? (
                    <button
                      onClick={handleTakePhoto}
                      disabled={isProcessingPhoto}
                      className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full border-4 border-white p-1 flex items-center justify-center active:scale-90 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.4)] disabled:opacity-50"
                      title="Tirar Foto"
                    >
                      <div className="w-full h-full rounded-full bg-white" />
                    </button>
                  ) : (
                    <button
                      onClick={handleToggleVideoRecord}
                      className={cn(
                        "w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full border-4 p-1 flex items-center justify-center active:scale-90 transition-all shadow-xl",
                        recording ? "border-rose-500 shadow-rose-500/40 animate-pulse" : "border-white shadow-white/30"
                      )}
                      title={recording ? "Parar Gravação" : "Gravar Vídeo"}
                    >
                      <div className={cn(
                        "transition-all duration-300",
                        recording ? "w-6 h-6 rounded-md bg-rose-500" : "w-full h-full rounded-full bg-rose-500"
                      )} />
                    </button>
                  )}

                  {/* Flip de Câmera Rápido */}
                  <button
                    onClick={toggleFacingMode}
                    className="w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white transition-all active:scale-90 shadow-lg"
                    title="Virar Câmera"
                  >
                    <FlipHorizontal className="w-5 h-5" />
                  </button>
                </div>
              )}

              {/* Barra Deslizante de Modos Estilo Instagram */}
              <div className="flex items-center justify-center gap-3.5 sm:gap-4 bg-black/40 border border-white/15 px-4 py-1.5 rounded-full backdrop-blur-xl shadow-lg">
                <button
                  onClick={() => setActiveTab('photo')}
                  className={cn(
                    "text-[11px] font-black tracking-wider transition-all uppercase",
                    activeTab === 'photo' ? "text-whatsapp-teal scale-105 font-bold" : "text-white/40 hover:text-white/70"
                  )}
                >
                  Foto
                </button>
                <button
                  onClick={() => setActiveTab('video')}
                  className={cn(
                    "text-[11px] font-black tracking-wider transition-all uppercase",
                    activeTab === 'video' ? "text-whatsapp-teal scale-105 font-bold" : "text-white/40 hover:text-white/70"
                  )}
                >
                  Vídeo
                </button>
                <button
                  onClick={() => setActiveTab('gallery')}
                  className={cn(
                    "text-[11px] font-black tracking-wider transition-all uppercase",
                    activeTab === 'gallery' ? "text-whatsapp-teal scale-105 font-bold" : "text-white/40 hover:text-white/70"
                  )}
                >
                  Galeria
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className={cn(
                    "text-[11px] font-black tracking-wider transition-all uppercase",
                    activeTab === 'text' ? "text-whatsapp-teal scale-105 font-bold" : "text-white/40 hover:text-white/70"
                  )}
                >
                  Texto
                </button>
                <button
                  onClick={() => setActiveTab('audio')}
                  className={cn(
                    "text-[11px] font-black tracking-wider transition-all uppercase",
                    activeTab === 'audio' ? "text-whatsapp-teal scale-105 font-bold" : "text-white/40 hover:text-white/70"
                  )}
                >
                  Áudio
                </button>
              </div>
            </div>
          ) : (
            /* SE ESTIVER EM PREVIEW: INPUT DE LEGENDA E BOTÃO PUBLICAR */
            <div className="space-y-3">
              {preview.type !== 'audio' && (
                <input
                  type="text"
                  placeholder="Adicionar legenda ao story..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-xs outline-none focus:border-whatsapp-teal backdrop-blur-md"
                />
              )}

              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-white/60 font-medium">
                  {activeTab === 'text' ? "Disponível por 24h" : "Pronto para publicar"}
                </span>

                <button
                  onClick={handlePublish}
                  disabled={isUploading}
                  className="h-11 px-6 rounded-full bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-whatsapp-teal/30 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Publicando ({progress}%)...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Publicar Story
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Publicar direto no Modo Texto */}
          {activeTab === 'text' && !preview && (
            <div className="flex items-center justify-end">
              <button
                onClick={handlePublish}
                disabled={isUploading || !textContent.trim()}
                className="h-11 px-6 rounded-full bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-whatsapp-teal/30 transition-all active:scale-95 disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
                Publicar Texto
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
