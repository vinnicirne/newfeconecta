"use client";

import { useRef, useState } from 'react';
import NextImage from 'next/image';
import { Type, Image, Images, Camera, Mic, X, Send, Smile, Paperclip } from 'lucide-react';
import UnifiedComposer from './UnifiedComposer';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { NotificationService } from '@/lib/notifications';
import { toast } from 'sonner';
import { useMediaUpload } from '@/hooks/useMediaUpload';

export default function CreatePost({ user, onPostCreated, onPostStart }: any) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<any>('text');
  const [initialFile, setInitialFile] = useState<File | null>(null);
  const [initialFiles, setInitialFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const carouselRef = useRef<HTMLInputElement>(null);

  const { uploadMedia } = useMediaUpload();

  const captureVideoFrame = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        video.currentTime = Math.min(1, video.duration * 0.1 || 0.1);
      };
      
      const seekTimeout = setTimeout(() => {
        URL.revokeObjectURL(video.src);
        reject(new Error('Timeout ao buscar frame do vídeo'));
      }, 5000);

      video.onseeked = () => {
        clearTimeout(seekTimeout);
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(video.src);
          if (blob) resolve(blob);
          else reject(new Error('Falha ao capturar frame'));
        }, 'image/webp', 0.7);
      };
      
      video.onerror = (err) => {
        clearTimeout(seekTimeout);
        URL.revokeObjectURL(video.src);
        reject(err);
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  const handleUnifiedSubmit = async (data: any) => {
    setIsSubmitting(true);
    setUploadProgress(10);
    const toastId = toast.loading("Preparando sua publicação...");

    try {
      if (!user?.id) throw new Error("Usuário não autenticado");

      let finalMediaUrl = data.media_url;
      let finalPostType = data.post_type || 'text';
      let finalMetadata: any = data.metadata || null;
      let contentText = data.content || data.caption || "";

      // 🔥 DETECÇÃO MÁGICA: YouTube/TikTok
      if (finalPostType === 'text' && !data.blob && !data.media_url) {
        const ytTkRegex = /(https?:\/\/(?:www\.)?(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/|tiktok\.com\/@[\w.-]+\/video\/|vm\.tiktok\.com\/|instagram\.com\/(?:p|reel|tv)\/)[a-zA-Z0-9_-]+)/i;
        const match = contentText.match(ytTkRegex);
        
        if (match) {
          toast.loading("Extraindo vídeo original (Magic Detection)...", { id: toastId });
          setUploadProgress(30);
          
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) {
              headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const response = await fetch('/api/extract-media', {
              method: 'POST',
              headers,
              body: JSON.stringify({ url: match[0] })
            });
            
            if (!response.ok) throw new Error('Falha no Motor de Extração');
            
            const result = await response.json();
            if (result.success && result.url) {
              finalMediaUrl = result.url;
              finalPostType = 'video';
            }
          } catch (extErr) {
            console.error("Extraction error:", extErr);
            toast.error("Aviso: Falha ao extrair vídeo original. Postando como link.", { id: toastId });
          }
        }
      }

      onPostStart?.({
        content: contentText,
        media_url: finalMediaUrl,
        post_type: finalPostType,
        metadata: finalMetadata,
        background: data.background
      });

      if (Array.isArray(data.images) && data.images.length > 1) {
        const imageUrls: string[] = [];
        for (let index = 0; index < data.images.length; index += 1) {
          setUploadProgress(20 + Math.round((index / data.images.length) * 60));
          const url = await uploadMedia(data.images[index], {
            bucket: 'posts',
            folder: 'images',
            onProgress: (progress) => setUploadProgress(Math.max(20, Math.round(((index + progress / 100) / data.images.length) * 80)))
          });
          if (!url) throw new Error(`Não foi possível enviar a foto ${index + 1}. Verifique sua conexão e tente novamente.`);
          imageUrls.push(url);
        }
        finalMediaUrl = imageUrls[0];
        finalPostType = 'image';
        finalMetadata = { ...(finalMetadata || {}), media_layout: 'carousel', media_urls: imageUrls };
      } else if (data.blob) {
        setUploadProgress(40);
        const folder = data.post_type === 'audio' ? 'audio' : (data.post_type === 'video' ? 'videos' : 'images');
        
        // Validação de limite pré-upload
        const maxMB = folder === 'videos' ? 50 : 20;
        if (data.blob.size > maxMB * 1024 * 1024) {
           throw new Error(`A mídia ultrapassa o limite de ${maxMB}MB.`);
        }

        if (data.post_type === 'video' && data.blob instanceof File) {
          try {
            const thumbBlob = await captureVideoFrame(data.blob);
            const thumbFile = new File([thumbBlob], 'thumb.webp', { type: 'image/webp' });
            const thumbUrl = await uploadMedia(thumbFile, { bucket: 'posts', folder: 'thumbnails' });
            data.thumbnail_url = thumbUrl;
          } catch (e) {
            console.error("Falha ao gerar thumbnail:", e);
          }
        }
        
        const isAudio = data.post_type === 'audio';
        const isVideo = data.post_type === 'video';
        const ext = isAudio ? 'webm' : (isVideo ? (data.blob.type.includes('mp4') ? 'mp4' : 'webm') : 'jpg');
        const finalFile = data.blob instanceof File ? data.blob : new File([data.blob], `media_${Date.now()}.${ext}`, { type: data.blob.type || (isVideo ? 'video/mp4' : 'image/jpeg') });
        const uploadedMediaUrl = await uploadMedia(finalFile, {
           bucket: 'posts', 
           folder,
           onProgress: (p) => setUploadProgress(Math.max(40, p))
        });
        if (!uploadedMediaUrl) {
          throw new Error('Não foi possível enviar a mídia. Verifique sua conexão e tente novamente.');
        }
        finalMediaUrl = uploadedMediaUrl;
      }

      setUploadProgress(80);
      const postInsert: Record<string, any> = {
        author_id: user.id,
        user_id: user.id,
        content: contentText,
        media_url: finalMediaUrl,
        thumbnail_url: data.thumbnail_url || null,
        post_type: finalPostType,
        background: data.background,
      };
      if (finalMetadata) postInsert.metadata = finalMetadata;
      const response = await supabase.from('posts').insert(postInsert).select().single();

      if (response.error) throw response.error;
      const newPost = response.data;

      if (contentText) {
        await NotificationService.parseMentions(contentText, user.id, newPost?.id);
        await NotificationService.notifyHashtagFollowers(contentText, user.id, newPost?.id || "");
      }

      const authorName = user?.user_metadata?.full_name || user?.full_name || user?.username || 'Um membro';
      NotificationService.notifyNetwork(
        user.id,
        'new_post',
        newPost?.id,
        `${authorName} fez uma nova publicação.`
      ).catch(console.error);

      setUploadProgress(100);
      toast.success("Publicado com sucesso!", { id: toastId });
      localStorage.removeItem('feconecta_composer_draft');

      onPostCreated?.(newPost);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('feconecta:new-post', { detail: newPost }));
        try {
          const bc = new BroadcastChannel('feconecta_feed_sync');
          bc.postMessage({ type: 'NEW_POST', post: newPost });
          bc.close();
        } catch (e) {}
      }
      return true;
    } catch (err: any) {
      setUploadProgress(0);
      toast.error(`Erro ao publicar: ${err.message}`, { id: toastId });
      return false;
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const openComposer = (mode: string, file: File | null = null, files: File[] = []) => {
    setInitialMode(mode);
    setInitialFile(file);
    setInitialFiles(files);
    setComposerOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = '';
    if (selected.length > 1) {
      if (selected.length > 10 || selected.some((file) => !file.type.startsWith('image/'))) {
        toast.error('Escolha de 2 a 10 imagens para criar um carrossel.');
        return;
      }
      if (selected.some((file) => file.size > 20 * 1024 * 1024)) {
        toast.error('Cada foto precisa ter até 20 MB.');
        return;
      }
      openComposer('carousel', null, selected);
      return;
    }

    const file = selected[0];
    if (file) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        import('sonner').then(m => m.toast.error("Formato de arquivo inválido. Escolha uma imagem ou vídeo."));
        if (fileRef.current) fileRef.current.value = '';
        return;
      }
      const mode = file.type.startsWith('video/') ? 'video' : 'photo';
      openComposer(mode, file);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleCarouselSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (files.length < 2 || files.length > 10 || files.some((file) => !file.type.startsWith('image/'))) {
      toast.error('Escolha de 2 a 10 imagens para criar um carrossel.');
      return;
    }
    if (files.some((file) => file.size > 20 * 1024 * 1024)) {
      toast.error('Cada foto precisa ter até 20 MB.');
      return;
    }
    openComposer('carousel', null, files);
  };

  const actions = [
    { icon: Type, label: 'Texto', color: 'text-violet-500 bg-violet-50 dark:bg-violet-500/10', onClick: () => openComposer('text') },
    { icon: Image, label: 'Galeria', color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10', onClick: () => fileRef.current?.click() },
    { icon: Images, label: 'Carrossel', color: 'text-pink-500 bg-pink-50 dark:bg-pink-500/10', onClick: () => carouselRef.current?.click() },
    { icon: Camera, label: 'Câmera', color: 'text-green-500 bg-green-50 dark:bg-green-500/10', onClick: () => openComposer('photo') },
    { icon: Mic, label: 'Áudio', color: 'text-orange-500 bg-orange-50 dark:bg-orange-500/10', onClick: () => openComposer('audio') },
  ];

  return (
    <>
      {/* Barra de Progresso Real */}
      <div 
        className="fixed top-0 left-0 h-[4px] bg-whatsapp-green z-[99999] transition-all duration-500"
        style={{ width: `${uploadProgress}%`, opacity: uploadProgress === 0 ? 0 : 1 }}
      />

      <div className={cn(
        "bg-white dark:bg-whatsapp-darkLighter border border-gray-100 dark:border-white/5 rounded-[32px] p-4 mx-4 mb-6 shadow-sm whatsapp-shadow transition-all",
        isSubmitting && "opacity-50 pointer-events-none"
      )}>
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-muted flex-shrink-0 border-2 border-gray-100 dark:border-white/10">
            {user?.avatar_url
              ? <NextImage src={user.avatar_url} width={48} height={48} unoptimized className="w-full h-full object-cover" alt="Sua foto de perfil" />
              : <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-whatsapp-tealLight flex items-center justify-center text-white font-bold text-lg italic">F</div>
            }
          </div>
          <button
            onClick={() => openComposer('text')}
            className="flex-1 text-left bg-gray-50 dark:bg-whatsapp-dark hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl px-6 py-3 text-sm text-gray-500 dark:text-gray-400 transition-all font-bold border border-gray-100 dark:border-white/5"
          >
            {isSubmitting ? "Publicando..." : "O que você está pensando?"}
          </button>
        </div>

        <input 
          type="file" 
          ref={fileRef} 
          className="hidden" 
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect} 
        />
        <input type="file" ref={carouselRef} className="hidden" accept="image/*" multiple onChange={handleCarouselSelect} />

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
           <div className="grid min-w-0 flex-1 grid-cols-5 gap-1">
              {actions.map(({ icon: Icon, color, onClick, label }) => (
                <button
                  key={label}
                  onClick={onClick}
                  type="button"
                  aria-label={`Criar publicação de ${label.toLowerCase()}`}
                  className="min-w-0 flex flex-col items-center gap-1 rounded-xl px-0.5 py-1 hover:bg-gray-50 dark:hover:bg-white/5 transition-all group"
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-active:scale-90", color)}>
                     <Icon className="w-4 h-4" aria-hidden="true" />
                  </div>
                  <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-tight text-gray-400 group-hover:text-whatsapp-teal transition-colors text-center leading-tight">{label}</span>
                </button>
              ))}
           </div>
           
           <button 
             onClick={() => openComposer('text')}
             className="w-10 h-10 rounded-full bg-whatsapp-teal text-white flex items-center justify-center hover:bg-whatsapp-tealLight shadow-lg shadow-whatsapp-teal/20 transition-all active:scale-90"
           >
              <Send className="w-4 h-4" />
           </button>
        </div>
      </div>

      {composerOpen && (
        <UnifiedComposer 
          open={composerOpen}
          onClose={() => setComposerOpen(false)}
          onSubmit={handleUnifiedSubmit}
          user={user}
          initialMode={initialMode}
          initialFile={initialFile}
          initialFiles={initialFiles}
        />
      )}
    </>
  );
}
