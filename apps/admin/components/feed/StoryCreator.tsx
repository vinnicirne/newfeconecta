"use client";

import React, { useRef, useState, useEffect } from 'react';
import { 
  X, Check, Image as ImageIcon, Type, Mic, Camera, 
  RotateCcw, Palette, Upload, Sparkles, Send, Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useMediaUpload } from '@/hooks/useMediaUpload';

export default function StoryCreator({ open, onClose, user, onCreated }: any) {
  const fileRef = useRef<HTMLInputElement>(null);

  // Modos: 'upload' (padrão amigável), 'text' (versículo/status), 'camera', 'audio'
  const [mode, setMode] = useState<'upload' | 'text' | 'audio'>('upload');
  const [preview, setPreview] = useState<{
    url: string;
    type: 'image' | 'video' | 'audio';
    blob?: Blob;
    mimeType?: string;
    file?: File;
  } | null>(null);
  
  const [textContent, setTextContent] = useState('');
  const [caption, setCaption] = useState('');
  const [bgColor, setBgColor] = useState('#00A884');
  
  // Áudio
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const { uploadMedia, isUploading, progress } = useMediaUpload();

  const colors = [
    '#00A884', '#0d9488', '#0284c7', '#6366f1', 
    '#8b5cf6', '#d946ef', '#f43f5e', '#ea580c', '#18181b'
  ];

  // Limpeza ao fechar
  useEffect(() => {
    if (!open) {
      handleReset();
    }
  }, [open]);

  const handleReset = () => {
    if (preview?.url && preview.url.startsWith('blob:')) {
      URL.revokeObjectURL(preview.url);
    }
    setPreview(null);
    setTextContent('');
    setCaption('');
    setIsRecordingAudio(false);
    setAudioSeconds(0);
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Upload de Foto / Vídeo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      toast.error("Arquivo muito grande! O limite para Stories é 30MB.");
      return;
    }

    const isImg = file.type.startsWith('image/');
    const isVid = file.type.startsWith('video/');

    if (!isImg && !isVid) {
      toast.error("Por favor, selecione uma imagem ou vídeo.");
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

  // Gravação de Áudio Limpa
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

      timerRef.current = setInterval(() => {
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
    clearInterval(timerRef.current);
  };

  // Publicar Story
  const handlePublish = async () => {
    if (!user?.id) {
      toast.error("Você precisa estar logado para publicar.");
      return;
    }

    if (mode === 'text' && !textContent.trim()) {
      toast.error("Digite algum texto para o seu story.");
      return;
    }

    if (mode !== 'text' && !preview) {
      toast.error("Selecione uma mídia para publicar.");
      return;
    }

    const toastId = toast.loading("Publicando seu story na comunidade...");

    try {
      let mediaUrl = null;
      let storyType: string = mode;

      if (preview) {
        storyType = preview.type;
        const fileToUpload = preview.file || (preview.blob ? new File([preview.blob], `story-${Date.now()}.${preview.type === 'audio' ? 'webm' : 'jpg'}`, { type: preview.mimeType }) : null);

        if (fileToUpload) {
          const path = `stories/${user.id}/${Date.now()}-${fileToUpload.name}`;
          const { error: uploadError } = await supabase.storage
            .from('stories')
            .upload(path, fileToUpload, { cacheControl: '3600', upsert: false });

          if (uploadError) {
            // Tenta no bucket geral 'media' caso 'stories' não exista
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
          media_url: mediaUrl,
          content: mode === 'text' ? textContent.trim() : caption.trim() || null,
          metadata: {
            bg_color: mode === 'text' ? bgColor : undefined,
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
    <div className="fixed inset-0 z-[10005] flex items-center justify-center p-0 md:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Contêiner de Proporção Perfeita de Story */}
      <div className="relative w-full h-full md:h-[88vh] md:max-w-md bg-zinc-950 md:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
        
        {/* HEADER */}
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all active:scale-95"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Abas Superiores de Criação */}
          {!preview && (
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/10 p-1 rounded-full">
              <button
                onClick={() => setMode('upload')}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5",
                  mode === 'upload' ? "bg-whatsapp-teal text-white shadow-sm" : "text-white/60 hover:text-white"
                )}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Mídia
              </button>

              <button
                onClick={() => setMode('text')}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5",
                  mode === 'text' ? "bg-whatsapp-teal text-white shadow-sm" : "text-white/60 hover:text-white"
                )}
              >
                <Type className="w-3.5 h-3.5" />
                Texto
              </button>

              <button
                onClick={() => setMode('audio')}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5",
                  mode === 'audio' ? "bg-whatsapp-teal text-white shadow-sm" : "text-white/60 hover:text-white"
                )}
              >
                <Mic className="w-3.5 h-3.5" />
                Áudio
              </button>
            </div>
          )}

          {/* Botão de Paleta de Cores (Modo Texto) */}
          {mode === 'text' && !preview && (
            <button
              onClick={() => {
                const idx = colors.indexOf(bgColor);
                setBgColor(colors[(idx + 1) % colors.length]);
              }}
              className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all active:scale-95"
              title="Mudar cor de fundo"
            >
              <Palette className="w-4 h-4" />
            </button>
          )}

          {preview && (
            <button
              onClick={() => {
                if (preview.url) URL.revokeObjectURL(preview.url);
                setPreview(null);
              }}
              className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all active:scale-95"
              title="Trocar mídia"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ÁREA CENTRAL DE CONTEÚDO */}
        <div className="flex-1 relative flex items-center justify-center overflow-hidden">
          
          {/* MODO UPLOAD: SELETOR AMIGÁVEL SEM CÂMERA QUEBRADA */}
          {mode === 'upload' && !preview && (
            <div 
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-4 p-8 text-center cursor-pointer group hover:bg-white/5 transition-colors w-full h-full"
            >
              <div className="w-20 h-20 rounded-3xl bg-whatsapp-teal/10 border-2 border-dashed border-whatsapp-teal/40 flex items-center justify-center group-hover:scale-110 group-hover:border-whatsapp-teal transition-all">
                <Upload className="w-8 h-8 text-whatsapp-teal" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Escolher Foto ou Vídeo</h3>
                <p className="text-xs text-white/50 max-w-[220px]">
                  Selecione uma imagem ou vídeo da sua galeria para compartilhar com a comunidade
                </p>
              </div>
              <span className="px-5 py-2 rounded-full bg-whatsapp-teal text-white text-xs font-bold shadow-lg shadow-whatsapp-teal/20 group-hover:bg-whatsapp-tealLight transition-colors">
                Abrir Galeria
              </span>
            </div>
          )}

          {/* MODO TEXTO: EDITOR COM GRADIENTE E CORES */}
          {mode === 'text' && (
            <div 
              className="w-full h-full flex items-center justify-center p-8 transition-colors duration-300 relative"
              style={{ backgroundColor: bgColor }}
            >
              <textarea
                autoFocus
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Escreva um versículo, reflexão ou oração do dia..."
                className="w-full bg-transparent text-white text-2xl font-bold text-center placeholder:text-white/40 border-none outline-none resize-none drop-shadow-md leading-relaxed"
                rows={6}
              />
            </div>
          )}

          {/* MODO ÁUDIO: GRAVADOR ELEGANTE */}
          {mode === 'audio' && !preview && (
            <div className="flex flex-col items-center justify-center gap-6 p-8 text-center w-full h-full bg-gradient-to-b from-zinc-900 to-black">
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

          {/* PREVIEWS DE MÍDIA SELECIONADA */}
          {preview?.type === 'image' && (
            <img src={preview.url} className="w-full h-full object-cover" alt="Preview Story" />
          )}

          {preview?.type === 'video' && (
            <video 
              src={preview.url} 
              autoPlay 
              loop 
              playsInline 
              controls 
              className="w-full h-full object-cover" 
            />
          )}

          {preview?.type === 'audio' && (
            <div className="flex flex-col items-center justify-center gap-4 p-8 w-full h-full bg-zinc-900">
              <div className="w-20 h-20 rounded-full bg-whatsapp-teal/20 border border-whatsapp-teal flex items-center justify-center animate-pulse">
                <Mic className="w-8 h-8 text-whatsapp-teal" />
              </div>
              <p className="text-sm font-bold text-white">Áudio Gravado com Sucesso</p>
              <audio src={preview.url} controls className="w-full max-w-[260px] mt-2" />
            </div>
          )}

          {/* Input oculto de arquivo */}
          <input 
            type="file" 
            ref={fileRef} 
            accept="image/*,video/*"
            className="hidden" 
            onChange={handleFileSelect} 
          />
        </div>

        {/* RODAPÉ: LEGENDA & BOTÃO DE PUBLICAR */}
        <div className="p-4 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col gap-3">
          {preview && preview.type !== 'audio' && (
            <input
              type="text"
              placeholder="Adicionar legenda..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full h-10 px-4 rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/40 text-xs outline-none focus:border-whatsapp-teal"
            />
          )}

          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-white/50">
              {mode === 'text' ? "Disponível por 24h" : (preview ? "Pronto para enviar" : "Selecione seu conteúdo")}
            </span>

            <button
              onClick={handlePublish}
              disabled={isUploading || (mode === 'text' ? !textContent.trim() : !preview)}
              className="h-11 px-6 rounded-full bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-whatsapp-teal/20 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
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

      </div>
    </div>
  );
}
