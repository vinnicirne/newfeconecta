"use client";

import { useRef, useState } from 'react';
import { Type, Image, Camera, Mic, X, Send, Smile, Paperclip } from 'lucide-react';
import TextEditorModal from './TextEditorModal';
import CameraModal from './CameraModal';
import AudioRecorder from './AudioRecorder';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { NotificationService } from '@/lib/notifications';
import { compressImage } from '@/lib/image-compression';

import { toast } from 'sonner';

export default function CreatePost({ user, onPostCreated }: any) {
  const [textOpen, setTextOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMedia = async (file: File | Blob, path: string) => {
    console.log(`☁️ [CreatePost] Iniciando upload para folder: ${path}...`);
    let finalFile = file;
    if (file.type.startsWith('image/')) {
       finalFile = await compressImage(file, 1080, 0.7); // 70% Quality for standard posts
    }

    const fileExt = (file as File).name?.split('.').pop() || file.type.split('/')[1] || 'bin';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { data, error } = await supabase.storage
      .from('posts')
      .upload(`${path}/${fileName}`, finalFile, {
        contentType: file.type // Garante que o MIME type seja preservado
      });

    if (error) {
      console.error('❌ [CreatePost] Erro no Supabase Storage:', error);
      throw error;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('posts')
      .getPublicUrl(data.path);
      
    console.log('🔗 [CreatePost] URL Pública obtida:', publicUrl);
    return publicUrl;
  };

  const handleTextSubmit = async (data: any) => {
    setIsSubmitting(true);
    setUploadProgress(30);
    const toastId = toast.loading("Publicando...", { duration: 10000 });
    try {
      if (!user?.id) {
        toast.error("Você precisa estar logado para publicar.", { id: toastId });
        setIsSubmitting(false);
        setUploadProgress(0);
        return;
      }
      const userId = user.id;
      
      const postPayload: any = {
        author_id: userId,
        user_id: userId,
        content: data.content,
        post_type: 'text',
      };

      if (data.background) {
        postPayload.background = data.background;
      }

      setUploadProgress(90);
      const { data: newPost, error } = await supabase.from('posts').insert(postPayload).select().single();

      if (error) throw error;
      
      // Parsear Menções
      await NotificationService.parseMentions(data.content, userId);
      
      // Notificar Seguidores de Hashtags com ID REAL
      await NotificationService.notifyHashtagFollowers(data.content, userId, newPost?.id || "");
      
      setUploadProgress(100);
      toast.success("Publicação enviada com sucesso!", { id: toastId });
      onPostCreated?.();
      setTextOpen(false);
    } catch (err: any) {
      setUploadProgress(0);
      console.error("Error creating text post:", err);
      toast.error(`Erro ao publicar texto: ${err.message}`, { id: toastId });
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
        setUploadProgress(0);
      }, 300);
    }
  };

  const handleMediaSubmit = async (data: any) => {
    setIsSubmitting(true);
    setUploadProgress(30);
    const toastId = toast.loading("Preparando publicação...", { duration: 20000 });
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return 90;
        return prev + 5;
      });
    }, 400);

    try {
      let mediaUrl = data.media_url || "";
      
      if (mediaUrl.startsWith('blob:')) {
         const fileBlob = await fetch(mediaUrl).then(r => r.blob());
         const folder = data.post_type === 'audio' ? 'audio' : (data.post_type === 'photo' ? 'images' : 'videos');
         mediaUrl = await uploadMedia(fileBlob, folder);
      } else if (data.blob) {
         const folder = data.post_type === 'audio' ? 'audio' : (data.post_type === 'photo' ? 'images' : 'videos');
         mediaUrl = await uploadMedia(data.blob, folder);
      }

      console.log(`🚀 Preparando Post [${data.post_type}]: URL final ->`, mediaUrl);

      if (!user?.id) {
        toast.error("Você precisa estar logado para publicar.", { id: toastId });
        setIsSubmitting(false);
        setUploadProgress(0);
        return;
      }
      const userId = user.id;

      setUploadProgress(90);
      const { data: newPost, error } = await supabase.from('posts').insert({
        author_id: userId,
        user_id: userId,
        content: data.caption || "",
        media_url: mediaUrl,
        post_type: data.post_type === 'photo' ? 'image' : data.post_type,
      }).select().single();

      if (error) throw error;
      
      // Parsear Menções na legenda
      if (data.caption) {
        await NotificationService.parseMentions(data.caption, userId);
        await NotificationService.notifyHashtagFollowers(data.caption, userId, newPost?.id || "");
      }

      setUploadProgress(100);
      toast.success("Mídia publicada com sucesso!", { id: toastId });
      onPostCreated?.();
      setCameraOpen(false);
      setAudioOpen(false);
    } catch (err: any) {
      setUploadProgress(0);
      console.error("Error creating media post:", err);
      toast.error(`Erro ao enviar mídia: ${err.message}`, { id: toastId });
    } finally {
      clearInterval(progressInterval);
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const [pendingMedia, setPendingMedia] = useState<any>(null);
  const [caption, setCaption] = useState("");

  const handleGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      toast.error("O vídeo é muito pesado! Máximo 12MB.");
      return;
    }

    // Validar duração do vídeo para garantir performance "Flash"
    if (file.type.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        if (video.duration > 90) {
          toast.error("Vídeo muito longo! Máximo 90 segundos para o Feed.");
          setPendingMedia(null);
          return;
        }
      };
      video.src = URL.createObjectURL(file);
    }

    const type = file.type.startsWith('video') ? 'video' : 'image';
    
    if (type === 'video') {
       const isValid = await new Promise((resolve) => {
          const v = document.createElement('video');
          v.preload = 'metadata';
          v.onloadedmetadata = () => {
            window.URL.revokeObjectURL(v.src);
            resolve(v.duration <= 90);
          };
          v.onerror = () => resolve(false);
          v.src = URL.createObjectURL(file);
       });

       if (!isValid) {
         toast.error("O vídeo é muito longo! Máximo 90 segundos.");
         return;
       }
    }

    const url = URL.createObjectURL(file);
    setPendingMedia({ file, type, url });
  };

  const submitPendingPost = async () => {
    if (!pendingMedia || !user?.id) {
      if (!user?.id) {
        toast.error("Você precisa estar logado para publicar.");
      }
      return;
    }
    
    setIsSubmitting(true);
    setUploadProgress(30);
    const toastId = toast.loading("Publicando seu poster...");
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) return 90;
        return prev + 5;
      });
    }, 500);
    
    try {
      const mediaUrl = await uploadMedia(pendingMedia.file, pendingMedia.type === 'video' ? 'videos' : 'images');
      
      setUploadProgress(90);
      const { data: newPost, error } = await supabase.from('posts').insert({
        author_id: user.id,
        user_id: user.id,
        content: caption,
        media_url: mediaUrl,
        post_type: pendingMedia.type,
      }).select().single();

      // Notificar Hashtags
      if (caption) {
        await NotificationService.notifyHashtagFollowers(caption, user.id, newPost?.id || "");
      }
      
      setUploadProgress(100);
      toast.success("Poster publicado com sucesso!", { id: toastId });
      setPendingMedia(null);
      setCaption("");
      onPostCreated?.();
    } catch (err: any) {
      setUploadProgress(0);
      toast.error(`Erro ao publicar: ${err.message}`, { id: toastId });
    } finally {
      clearInterval(progressInterval);
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const actions = [
    { icon: Type, label: 'Texto', color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10', onClick: () => setTextOpen(true) },
    { icon: Image, label: 'Galeria', color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10', onClick: () => fileRef.current?.click() },
    { icon: Camera, label: 'Câmera', color: 'text-green-500 bg-green-50 dark:bg-green-500/10', onClick: () => setCameraOpen(true) },
    { icon: Mic, label: 'Áudio', color: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10', onClick: () => setAudioOpen(true) },
  ];

  return (
    <>
      {/* Barra de Progresso Global Progressiva */}
      <div 
        data-testid="upload-progress-bar"
        className="fixed top-0 left-0 h-[4px] bg-whatsapp-green z-[99999] shadow-[0_0_15px_rgba(37,211,102,1)] transition-all duration-500 ease-out"
        style={{ 
          width: `${uploadProgress}%`, 
          opacity: uploadProgress === 0 ? 0 : 1
        }}
      />

      <div className={cn(
        "bg-white dark:bg-whatsapp-darkLighter border border-gray-100 dark:border-white/5 rounded-2xl p-4 mx-4 mb-6 shadow-sm whatsapp-shadow transition-opacity",
        isSubmitting && "opacity-50 pointer-events-none"
      )}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0 border border-gray-100 dark:border-white/10">
            {user?.avatar_url
              ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="avatar" />
              : <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-whatsapp-tealLight flex items-center justify-center text-white font-bold text-sm">{(user?.full_name || 'U')[0]}</div>
            }
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 text-left bg-gray-50 dark:bg-whatsapp-dark hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 transition-all font-medium border border-gray-100 dark:border-white/5"
          >
            {isSubmitting ? "Publicando..." : "O que você está pensando?"}
          </button>
        </div>

        {/* Pré-visualização de Mídia Pendente (Galeria) */}
        {pendingMedia && (
          /* ... código da pré-visualização ... */
          <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
             <div className="relative rounded-2xl overflow-hidden bg-black/5 dark:bg-black/20 border border-gray-100 dark:border-white/5">
                <button 
                  onClick={() => setPendingMedia(null)}
                  className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
                
                {pendingMedia.type === 'image' ? (
                  <img src={pendingMedia.url} className="w-full max-h-[300px] object-contain" alt="" />
                ) : (
                  <video src={pendingMedia.url} className="w-full max-h-[300px]" controls />
                )}

                <div className="p-3 bg-white/50 dark:bg-whatsapp-darkLighter/50 backdrop-blur-md">
                   <textarea 
                     placeholder="Escreva uma legenda..."
                     value={caption}
                     onChange={(e) => setCaption(e.target.value)}
                     className="w-full bg-transparent border-none focus:ring-0 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 resize-none min-h-[60px]"
                   />
                   <div className="flex justify-end">
                      <button 
                        onClick={submitPendingPost}
                        disabled={isSubmitting}
                        className="px-6 py-2 bg-whatsapp-green text-whatsapp-dark font-black text-xs uppercase tracking-widest rounded-full hover:bg-whatsapp-teal transition-all shadow-lg active:scale-95 disabled:opacity-50"
                      >
                        {isSubmitting ? "Publicando..." : "Publicar"}
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {(isExpanded || pendingMedia) && (
          <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-100 dark:border-white/5 animate-in slide-in-from-top-2 duration-300">
            {actions.map(({ icon: Icon, label, color, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                disabled={isSubmitting}
                className="flex flex-col items-center gap-1.5 py-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all group"
              >
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-transform group-active:scale-90", color)}>
                   <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tighter">{label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <input type="file" ref={fileRef} className="hidden" onChange={handleGallery} accept="image/*,video/*" />
      
      {textOpen && <TextEditorModal open={textOpen} onClose={() => setTextOpen(false)} onSubmit={handleTextSubmit} />}
      {cameraOpen && <CameraModal open={cameraOpen} onClose={() => setCameraOpen(false)} onSubmit={handleMediaSubmit} />}
      {audioOpen && <AudioRecorder open={audioOpen} onClose={() => setAudioOpen(false)} onSubmit={handleMediaSubmit} />}
    </>
  );
}
