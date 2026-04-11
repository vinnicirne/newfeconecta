"use client";

import { useRef, useState } from 'react';
import { Type, Image, Camera, Mic } from 'lucide-react';
import TextEditorModal from './TextEditorModal';
import CameraModal from './CameraModal';
import AudioRecorder from './AudioRecorder';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

import { toast } from 'sonner';

export default function CreatePost({ user, onPostCreated }: any) {
  const [textOpen, setTextOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [audioOpen, setAudioOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File | Blob): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const max = 1080;
          if (width > max) {
            height = (max / width) * height;
            width = max;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.8);
        };
      };
    });
  };

  const uploadMedia = async (file: File | Blob, path: string) => {
    console.log(`☁️ [CreatePost] Iniciando upload para folder: ${path}...`);
    let finalFile = file;
    if (file.type.startsWith('image/')) {
       finalFile = await compressImage(file);
    }

    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { data, error } = await supabase.storage
      .from('posts')
      .upload(`${path}/${fileName}`, finalFile);

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
    try {
      if (!user?.id) {
        toast.error("Você precisa estar logado para publicar.");
        return;
      }
      const userId = user.id;
      
      const { error } = await supabase.from('posts').insert({
        author_id: userId,
        user_id: userId,
        content: data.content,
        post_type: 'text',
      });

      if (error) throw error;
      toast.success("Publicação enviada com sucesso!");
      onPostCreated?.();
      setTextOpen(false);
    } catch (err: any) {
      console.error("Error creating text post:", err);
      toast.error(`Erro ao publicar texto: ${err.message || 'Verifique se a tabela "posts" e o perfil existem.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMediaSubmit = async (data: any) => {
    setIsSubmitting(true);
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
        toast.error("Você precisa estar logado para publicar.");
        return;
      }
      const userId = user.id;

      const { error } = await supabase.from('posts').insert({
        author_id: userId,
        user_id: userId,
        content: data.caption || "",
        media_url: mediaUrl,
        post_type: data.post_type === 'photo' ? 'image' : data.post_type,
      });

      if (error) throw error;
      toast.success("Mídia publicada com sucesso!");
      onPostCreated?.();
      setCameraOpen(false);
      setAudioOpen(false);
    } catch (err: any) {
      console.error("Error creating media post:", err);
      toast.error(`Erro ao enviar mídia: ${err.message || 'Verifique se o bucket "posts" existe e é público.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsSubmitting(true);
    try {
      const type = file.type.startsWith('video') ? 'video' : 'image';
      const mediaUrl = await uploadMedia(file, type);

      if (!user?.id) {
        toast.error("Você precisa estar logado para publicar.");
        return;
      }
      const userId = user.id;

      const { error } = await supabase.from('posts').insert({
        author_id: userId,
        user_id: userId,
        content: "",
        media_url: mediaUrl,
        post_type: type,
      });

      if (error) throw error;
      toast.success("Arquivo enviado com sucesso!");
      onPostCreated?.();
    } catch (err) {
      console.error("Error uploading gallery file:", err);
      toast.error("Erro ao enviar arquivo.");
    } finally {
      setIsSubmitting(false);
      if (fileRef.current) fileRef.current.value = "";
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
            onClick={() => setTextOpen(true)}
            className="flex-1 text-left bg-gray-50 dark:bg-whatsapp-dark hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 transition-all font-medium border border-gray-100 dark:border-white/5"
          >
            {isSubmitting ? "Publicando..." : "O que você está pensando?"}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
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
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <input type="file" ref={fileRef} className="hidden" onChange={handleGallery} accept="image/*,video/*" />
      
      {textOpen && <TextEditorModal open={textOpen} onClose={() => setTextOpen(false)} onSubmit={handleTextSubmit} />}
      {cameraOpen && <CameraModal open={cameraOpen} onClose={() => setCameraOpen(false)} onSubmit={handleMediaSubmit} />}
      {audioOpen && <AudioRecorder open={audioOpen} onClose={() => setAudioOpen(false)} onSubmit={handleMediaSubmit} />}
    </>
  );
}
