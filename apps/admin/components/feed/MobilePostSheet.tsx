"use client";

import React, { useState } from 'react';
import { Type, Image, Camera, Mic, X, CheckCircle2, Music } from 'lucide-react';
import UnifiedComposer from './UnifiedComposer';
import MusicComposerModal from './MusicComposerModal';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { NotificationService } from '@/lib/notifications';
import { useMediaUpload } from '@/hooks/useMediaUpload';

export default function MobilePostSheet({ open, onClose, user, onPostCreated, onPostStart }: any) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [musicComposerOpen, setMusicComposerOpen] = useState(false);
  const [initialMode, setInitialMode] = useState<any>('text');
  const [posted, setPosted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  const { uploadMedia } = useMediaUpload();

  const handleUnifiedSubmit = async (data: any) => {
    setIsSubmitting(true);
    const toastId = toast.loading("Publicando...");
    
    try {
      if (!user?.id) throw new Error("Não autenticado");

      // Optimistic UI
      onPostStart?.({
        content: data.content || data.caption || "",
        media_url: data.media_url,
        post_type: data.post_type,
        background: data.background
      });

      let mediaUrl = data.media_url;
      if (data.blob) {
         const path = data.post_type === 'audio' ? 'audio' : (data.post_type === 'video' ? 'videos' : 'images');
         const finalFile = data.blob instanceof File ? data.blob : new File([data.blob], `media.${data.post_type === 'audio' ? 'webm' : 'jpg'}`, { type: data.blob.type });
         mediaUrl = await uploadMedia(finalFile, { bucket: 'posts', folder: path });
      }

      const response = await supabase.from('posts').insert({
        author_id: user.id,
        user_id: user.id,
        content: data.content || data.caption || "",
        media_url: mediaUrl,
        post_type: data.post_type,
        background: data.background
      }).select().single();

      if (response.error) throw response.error;
      const newPost = response.data;

      const text = data.content || data.caption || "";
      if (text) {
        await NotificationService.parseMentions(text, user.id);
        await NotificationService.notifyHashtagFollowers(text, user.id, newPost?.id || "");
      }

      // Notificação global inteligente (Assíncrona para não travar)
      const authorName = user?.user_metadata?.full_name || user?.full_name || user?.username || 'Um membro';
      NotificationService.notifyNetwork(
        user.id,
        'new_post',
        newPost?.id,
        `${authorName} fez uma nova publicação.`
      ).catch(console.error);

      toast.success("Publicado!", { id: toastId });
      setPosted(true);
      onPostCreated?.();
      setTimeout(() => {
        setPosted(false);
        setComposerOpen(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      toast.error("Erro: " + err.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openComposer = (mode: string) => {
    setInitialMode(mode);
    setComposerOpen(true);
  };

  if (!open) return null;

  const actions = [
    { icon: Type, label: 'Texto', color: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20', onClick: () => openComposer('text') },
    { icon: Image, label: 'Galeria', color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20', onClick: () => fileInputRef.current?.click() },
    { icon: Camera, label: 'Câmera', color: 'bg-green-100 text-green-600 dark:bg-green-500/20', onClick: () => openComposer('photo') },
    { icon: Mic, label: 'Áudio', color: 'bg-orange-100 text-orange-600 dark:bg-orange-500/20', onClick: () => openComposer('audio') },
    { icon: Music, label: 'Música', color: 'bg-pink-100 text-pink-600 dark:bg-pink-500/20', onClick: () => setMusicComposerOpen(true) },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, mode: 'gallery' | 'photo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Engatilha o composer já com o arquivo
    setSelectedFile(file);
    setInitialMode('photo');
    setComposerOpen(true);
  };

  return (
    <>
      {!composerOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
      )}

      {!composerOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-[101] bg-white dark:bg-[#0c0c0c] rounded-t-[40px] shadow-2xl animate-in slide-in-from-bottom duration-500 pb-12 border-t border-white/5">
          <div className="flex justify-center pt-3 pb-6">
            <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-white/10" />
          </div>

          <div className="px-8 flex flex-col gap-6">
             <div className="flex flex-col gap-1">
                <h3 className="text-xl font-black dark:text-white uppercase tracking-widest">Criar Post</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-50">Selecione o formato do seu clamor</p>
             </div>

             {posted ? (
               <div className="flex flex-col items-center justify-center py-12 gap-4 animate-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 rounded-full bg-whatsapp-green/20 flex items-center justify-center">
                     <CheckCircle2 className="w-10 h-10 text-whatsapp-green" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-widest dark:text-white">Sucesso!</p>
               </div>
             ) : (
               <div className="flex flex-wrap justify-center items-center gap-4 py-4">
                  {actions.map(({ icon: Icon, label, color, onClick }) => (
                    <button key={label} onClick={onClick} className="flex-1 min-w-[60px] flex flex-col items-center gap-2 group active:scale-95 transition-transform">
                      <div className={cn("w-16 h-16 rounded-[24px] flex items-center justify-center", color)}>
                        <Icon className="w-8 h-8" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-tight text-gray-500">{label}</span>
                    </button>
                  ))}
               </div>
             )}
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={(e) => handleFileChange(e, 'gallery')}
          />
          <input 
            type="file" 
            ref={cameraInputRef} 
            className="hidden" 
            capture="environment"
            onChange={(e) => handleFileChange(e, 'photo')}
          />
        </div>
      )}

      {composerOpen && (
        <UnifiedComposer 
          open={composerOpen}
          onClose={() => {
            setComposerOpen(false);
            setSelectedFile(null);
          }}
          onSubmit={handleUnifiedSubmit}
          user={user}
          initialMode={initialMode}
          initialFile={selectedFile}
        />
      )}

      {musicComposerOpen && (
        <MusicComposerModal 
          isOpen={musicComposerOpen}
          onClose={() => setMusicComposerOpen(false)}
          onSuccess={() => {
             setMusicComposerOpen(false);
             onClose();
             onPostCreated?.();
          }}
        />
      )}
    </>
  );
}
