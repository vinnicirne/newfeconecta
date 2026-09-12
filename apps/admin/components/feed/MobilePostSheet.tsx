"use client";

import React, { useState } from 'react';
import { Type, Image, Camera, Mic, X, CheckCircle2, Music, Flame, Gamepad2, BookOpen, FileText, Calendar, BarChart2, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import UnifiedComposer from './UnifiedComposer';
import MusicComposerModal from './MusicComposerModal';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { NotificationService } from '@/lib/notifications';
import { useMediaUpload } from '@/hooks/useMediaUpload';

export default function MobilePostSheet({ open, onClose, user, onPostCreated, onPostStart }: any) {
  const router = useRouter();
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
         const isAudio = data.post_type === 'audio';
         const isVideo = data.post_type === 'video';
         const folder = isAudio ? 'audio' : (isVideo ? 'videos' : 'images');
         const ext = isAudio ? 'webm' : (isVideo ? (data.blob.type.includes('mp4') ? 'mp4' : 'webm') : 'jpg');
         const finalFile = data.blob instanceof File ? data.blob : new File([data.blob], `media_${Date.now()}.${ext}`, { type: data.blob.type || (isVideo ? 'video/mp4' : 'image/jpeg') });
         mediaUrl = await uploadMedia(finalFile, { bucket: 'posts', folder });
      }

      const response = await supabase.from('posts').insert({
        author_id: user.id,
        user_id: user.id,
        content: data.content || data.caption || "",
        media_url: mediaUrl,
        thumbnail_url: data.thumbnail_url || null,
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
    { icon: Type, label: 'Mensagens', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', onClick: () => openComposer('text') },
    { icon: Gamepad2, label: 'Jogos & Quiz', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', onClick: () => { onClose(); router.push('/jogos'); } },
    { icon: BookOpen, label: 'Bíblia', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', onClick: () => { onClose(); router.push('/bible'); } },
    { icon: FileText, label: 'Notas', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', onClick: () => { onClose(); router.push('/notes'); } },
    { icon: Music, label: 'Música', color: 'bg-pink-500/10 text-pink-500 border-pink-500/20', onClick: () => { onClose(); router.push('/music'); } },
    { icon: Calendar, label: 'Eventos', color: 'bg-teal-500/10 text-teal-400 border-teal-500/20', onClick: () => { onClose(); router.push('/eventos'); } },
    { icon: BarChart2, label: 'Enquetes', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', onClick: () => { onClose(); router.push('/enquetes'); } },
    { icon: Flame, label: 'Lugar Secreto', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', onClick: () => { onClose(); router.push('/santuario'); } },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, mode: 'gallery' | 'photo') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Engatilha o composer já com o arquivo
    const isVideo = file.type.startsWith('video/');
    setSelectedFile(file);
    setInitialMode(isVideo ? 'video' : 'photo');
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
                <div className="grid grid-cols-2 gap-3 py-2">
                   {actions.map(({ icon: Icon, label, color, onClick }) => (
                     <button 
                       key={label} 
                       onClick={onClick} 
                       className={cn(
                         "flex flex-col items-center justify-center gap-2.5 p-5 rounded-2xl border transition-all text-center active:scale-[0.97] bg-[#12141a] border-white/5 hover:bg-white/10",
                         color
                       )}
                     >
                       <Icon className="w-7 h-7 mb-0.5" />
                       <span className="text-sm font-extrabold tracking-tight">{label}</span>
                     </button>
                   ))}
                </div>
             )}
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*,video/*"
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
