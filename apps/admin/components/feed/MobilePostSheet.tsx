"use client";

import { useRef, useState } from 'react';
import { Type, Image, Camera, Mic, X, CheckCircle2 } from 'lucide-react';
import TextEditorModal from './TextEditorModal';
import CameraModal from './CameraModal';
import AudioRecorder from './AudioRecorder';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function MobilePostSheet({ open, onClose, user, onPostCreated }: any) {
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const showSuccess = () => {
    setPosted(true);
    onPostCreated?.();
    setTimeout(() => {
      setPosted(false);
      onClose();
    }, 2000);
  };

  if (!open) return null;

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
    let finalFile = file;
    if (file.type?.startsWith('image/')) {
       finalFile = await compressImage(file);
    }
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const { data, error } = await supabase.storage
      .from('posts')
      .upload(`${path}/${fileName}`, finalFile);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from('posts').getPublicUrl(data.path);
    return publicUrl;
  };

  const handleTextSubmit = async (data: any) => {
    try {
      const payload = {
        user_id: user?.id || "296f0f37-c8b8-4ad1-855c-4625f3f14731",
        content: data.content,
        post_type: 'text', // Forçado exatamente como no banco
        background_style: data.background
      };
      
      console.log("SENT PAYLOAD (TEXT):", payload);
      
      const { error } = await supabase.from('posts').insert(payload);
      if (error) throw error;
      setActiveModal(null);
      showSuccess();
    } catch (err: any) {
      toast.error("Erro ao publicar: " + err.message);
    }
  };

  const handleMediaSubmit = async (data: any) => {
    try {
      let media_url = data.media_url;
      
      // Se vier um link blob direto do CameraModal, precisamos baixar e subir
      if (media_url && media_url.startsWith('blob:')) {
         const fileBlob = await fetch(media_url).then(r => r.blob());
         media_url = await uploadMedia(fileBlob, data.post_type === 'video' ? 'videos' : 'images');
      } else if (data.blob) {
         media_url = await uploadMedia(data.blob, data.post_type === 'video' ? 'videos' : 'images');
      } else if (data.audio_url && data.post_type === 'audio') {
         const audioBlob = await fetch(data.audio_url).then(r => r.blob());
         media_url = await uploadMedia(audioBlob, 'audio');
      }

      const payload = {
        user_id: user?.id || "296f0f37-c8b8-4ad1-855c-4625f3f14731",
        content: data.content || '',
        media_url: media_url,
        post_type: data.post_type === 'photo' ? 'image' : 
                   data.post_type === 'audio' ? 'audio' :
                   data.post_type === 'video' ? 'video' : 'image'
      };
      
      console.log("SENT PAYLOAD (MEDIA):", payload);
      
      const { error } = await supabase.from('posts').insert(payload);
      if (error) throw error;
      setActiveModal(null);
      showSuccess();
    } catch (err: any) {
      toast.error("Erro ao publicar: " + err.message);
    }
  };

  const handleGallery = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const isVideo = file.type.startsWith('video');
      const media_url = await uploadMedia(file, isVideo ? 'videos' : 'images');
      const payload = {
        user_id: user?.id || "296f0f37-c8b8-4ad1-855c-4625f3f14731",
        media_url: media_url,
        post_type: isVideo ? 'video' : 'image'
      };
      
      console.log("SENT PAYLOAD (GALLERY):", payload);
      
      const { error } = await supabase.from('posts').insert(payload);
      if (error) throw error;
      showSuccess();
    } catch (err: any) {
      toast.error("Erro ao subir arquivo: " + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const actions = [
    { icon: Type, label: 'Texto', color: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20', onClick: () => setActiveModal('text') },
    { icon: Image, label: 'Galeria', color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20', onClick: () => fileRef.current?.click() },
    { icon: Camera, label: 'Câmera', color: 'bg-green-100 text-green-600 dark:bg-green-500/20', onClick: () => setActiveModal('camera') },
    { icon: Mic, label: 'Áudio', color: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20', onClick: () => setActiveModal('audio') },
  ];

  return (
    <>
      {!activeModal && (
        <div 
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {!activeModal && (
        <div className="fixed bottom-0 left-0 right-0 z-[101] bg-white dark:bg-whatsapp-darkLighter rounded-t-[32px] shadow-2xl animate-in slide-in-from-bottom duration-300 pb-12 border-t border-white/5">
          <div className="flex justify-center pt-3 pb-6">
            <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-white/10" />
          </div>

          <div className="px-6 flex flex-col gap-6">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold dark:text-white">Criar Publicação</h3>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
             </div>

             {posted ? (
               <div className="flex flex-col items-center justify-center py-12 gap-4 animate-in zoom-in-95 duration-300">
                  <div className="w-20 h-20 rounded-full bg-whatsapp-green/20 flex items-center justify-center">
                     <CheckCircle2 className="w-10 h-10 text-whatsapp-green" />
                  </div>
                  <p className="text-lg font-bold dark:text-white">Publicado com sucesso!</p>
               </div>
             ) : (
               <div className="grid grid-cols-4 gap-4 py-4">
                  {actions.map(({ icon: Icon, label, color, onClick }) => (
                    <button 
                      key={label}
                      onClick={onClick}
                      className="flex flex-col items-center gap-2 group active:scale-95 transition-transform"
                    >
                      <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center shadow-sm", color)}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{label}</span>
                    </button>
                  ))}
               </div>
             )}
          </div>
        </div>
      )}

      <input type="file" ref={fileRef} className="hidden" onChange={handleGallery} accept="image/*,video/*" />

      {activeModal === 'text' && <TextEditorModal open={true} onClose={() => setActiveModal(null)} onSubmit={handleTextSubmit} />}
      {activeModal === 'camera' && <CameraModal open={true} onClose={() => setActiveModal(null)} onSubmit={handleMediaSubmit} />}
      {activeModal === 'audio' && <AudioRecorder open={true} onClose={() => setActiveModal(null)} onSubmit={handleMediaSubmit} />}
    </>
  );
}
