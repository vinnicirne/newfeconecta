"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Pause, Play, Flame, MessageCircle, Send, Share2, Trash2, Star, Camera, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Helper simples para tempo relativo sem dependências extras
function formatTime(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'Agora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return date.toLocaleDateString('pt-BR');
}

const PHOTO_DURATION = 5000;
const VIDEO_DURATION = 30000;

export default function StoryViewer({ storyGroups, startUserIndex = 0, currentUser, onClose }: any) {
  const [userIdx, setUserIdx] = useState(startUserIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [comment, setComment] = useState('');
   const [isNamingStory, setIsNamingStory] = useState(false);
   const [highlightTitle, setHighlightTitle] = useState('Destaque');
   const [highlightCover, setHighlightCover] = useState<string | null>(null);
   const [coverFile, setCoverFile] = useState<File | null>(null);
   const [isUploadingCover, setIsUploadingCover] = useState(false);
   const [floatingEmojis, setFloatingEmojis] = useState<any[]>([]);

   const handleHighlightToggle = async () => {
     const isMarking = !story.is_highlight;
     if (isMarking) {
       setHighlightTitle(story.highlight_title || 'Destaque');
       setHighlightCover(story.highlight_cover_url || story.media_url);
       setIsNamingStory(true);
       setPaused(true);
       return;
     }

     const { error } = await supabase.from('stories').update({ 
       is_highlight: false, 
       highlight_title: null,
       highlight_cover_url: null 
     }).eq('id', story.id);
     
     if (!error) {
       toast.success("Removido dos destaques");
       story.is_highlight = false;
     }
   };

   const confirmHighlight = async () => {
     setIsUploadingCover(true);
     let finalCoverUrl = highlightCover;

     try {
       if (coverFile) {
         const fileName = `cover_${Date.now()}_${story.id}`;
         const { data, error: uploadError } = await supabase.storage.from('avatars').upload(fileName, coverFile);
         if (uploadError) throw uploadError;
         const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(data.path);
         finalCoverUrl = publicUrl;
       }

       const { error } = await supabase.from('stories').update({ 
         is_highlight: true, 
         highlight_title: highlightTitle,
         highlight_cover_url: finalCoverUrl
       }).eq('id', story.id);

       if (error) throw error;

       toast.success("Destaque atualizado!");
       story.is_highlight = true;
       story.highlight_title = highlightTitle;
       story.highlight_cover_url = finalCoverUrl;
       setIsNamingStory(false);
       setPaused(false);
     } catch (err) {
       toast.error("Erro ao salvar capa");
     } finally {
       setIsUploadingCover(false);
     }
   };

  const elapsed = useRef(0);
  const lastTick = useRef<number | null>(null);
  const timerRef = useRef<any>(null);

  const group = storyGroups[userIdx];
  const story = group?.stories[storyIdx];

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const advance = useCallback(() => {
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx(storyIdx + 1);
    } else if (userIdx < storyGroups.length - 1) {
      setUserIdx(userIdx + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [userIdx, storyIdx, group, storyGroups, onClose]);

  const prev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(storyIdx - 1);
    } else if (userIdx > 0) {
      const prevGroup = storyGroups[userIdx - 1];
      setUserIdx(userIdx - 1);
      setStoryIdx(prevGroup.stories.length - 1);
    } else {
      setStoryIdx(0);
      setProgress(0);
      elapsed.current = 0;
    }
  }, [userIdx, storyIdx, storyGroups]);

  const startTimer = useCallback(() => {
    clearTimer();
    const currentDuration = story?.media_type === 'video' ? VIDEO_DURATION : PHOTO_DURATION;
    lastTick.current = Date.now();
    timerRef.current = setInterval(() => {
      if (!lastTick.current || paused) return;
      const now = Date.now();
      elapsed.current += now - lastTick.current;
      lastTick.current = now;
      const pct = Math.min((elapsed.current / currentDuration) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearTimer();
        advance();
      }
    }, 50);
  }, [advance, story]);

  useEffect(() => {
    if (!story) return;
    elapsed.current = 0;
    setProgress(0);
    setPaused(false);
    
    // Mark as viewed locally
    console.log("Story viewed locally:", story.id);
    
    startTimer();
    return clearTimer;
  }, [userIdx, storyIdx]);

  const togglePause = () => {
    if (paused) {
      setPaused(false);
      lastTick.current = Date.now();
    } else {
      setPaused(true);
      lastTick.current = null;
    }
  };

  const handlePointerDown = () => {
    setPaused(true);
    lastTick.current = null;
  };

  const handlePointerUp = (action?: 'prev' | 'next') => {
    setPaused(false);
    lastTick.current = Date.now();
    if (action === 'prev') prev();
    if (action === 'next') advance();
  };

  const handleLike = async () => {
    if (!currentUser) return;
    setIsLiked(!isLiked);
    if (!isLiked) {
      const emojis = ['🔥', '❤️', '🙌', '✨', '👏'];
      const newEmoji = {
        id: Date.now(),
        char: emojis[Math.floor(Math.random() * emojis.length)],
        left: Math.random() * 80 + 10
      };
      setFloatingEmojis(prev => [...prev, newEmoji]);
      setTimeout(() => {
        setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
      }, 2000);
    }
  };

  const sendEmojiReaction = async (emojiChar: string) => {
    if (!currentUser || !group) return;
    
    // Animação local de confete de emoji
    const newEmoji = { id: Date.now(), char: emojiChar, left: 50 };
    setFloatingEmojis(prev => [...prev, newEmoji]);
    setTimeout(() => setFloatingEmojis(prev => prev.filter(e => e.id !== newEmoji.id)), 2000);

    try {
      await supabase.from('direct_messages').insert({
        sender_id: currentUser.id,
        receiver_id: group.author_id,
        content: `Reagiu ao seu Status: ${emojiChar}`,
        is_read: false
      });
      toast.success("Reação enviada!");
    } catch (err) {
      console.error("Erro ao enviar reação:", err);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim() || !currentUser) return;
    
    const text = comment;
    setComment('');
    
    try {
      const { error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: currentUser.id,
          receiver_id: group.author_id, // Usando o ID do perfil agrupado
          content: `Respondeu ao seu Status: ${text}`,
          is_read: false
        });

      if (error) throw error;
      
      toast.success("Resposta enviada!");
      setPaused(false);
    } catch (err) {
      console.error("Erro ao enviar comentário:", err);
      toast.error("Não foi possível enviar sua resposta.");
    }
  };

  // Lógica de Swipe Up
  const touchStartY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent | React.PointerEvent) => {
    touchStartY.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent | React.PointerEvent) => {
    if (touchStartY.current === null) return;
    const clientY = 'changedTouches' in e ? e.changedTouches[0].clientY : e.clientY;
    const deltaY = touchStartY.current - clientY;
    
    if (deltaY > 50) { // Swipe up
      setPaused(true);
      lastTick.current = null;
      const input = document.getElementById('story-comment-input');
      if (input) {
        input.focus();
        // Pequeno atraso para garantir foco em dispositivos sensíveis
        setTimeout(() => input.focus(), 50);
      }
    }
    touchStartY.current = null;
  };

  const handleDelete = async () => {
    if (!currentUser || story.author_id !== currentUser.id) return;
    
    if (confirm("Deseja excluir este status permanentemente?")) {
      try {
        const { error } = await supabase
          .from('stories')
          .delete()
          .eq('id', story.id);

        if (error) throw error;
        
        toast.success("Status removido!");
        onClose();
      } catch (err) {
        console.error("Erro ao deletar story:", err);
        toast.error("Não foi possível excluir o status.");
      }
    }
  };

  if (!group || !story) return null;

  return (
    <div className="fixed inset-0 z-[400] bg-black flex flex-col items-center justify-center">
      <div className="relative w-full h-full max-w-md bg-whatsapp-dark overflow-hidden sm:rounded-[40px] shadow-2xl">
        {/* Media */}
        <div className="absolute inset-0 z-0" onClick={togglePause}>
          {story.media_type === 'image' && (
            <>
              <img src={story.media_url} className="w-full h-full object-cover" alt="" />
              {story.content && (
                <div className="absolute inset-0 flex items-center justify-center p-12 text-center pointer-events-none">
                  <h2 className="text-white text-3xl font-bold leading-tight break-words drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] px-4">
                    {story.content}
                  </h2>
                </div>
              )}
            </>
          )}
          {story.media_type === 'video' && (
            <>
              <video src={story.media_url} autoPlay playsInline muted={false} className="w-full h-full object-cover" />
              {story.content && (
                <div className="absolute inset-0 flex items-center justify-center p-12 text-center pointer-events-none">
                  <h2 className="text-white text-3xl font-bold leading-tight break-words drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] px-4">
                    {story.content}
                  </h2>
                </div>
              )}
            </>
          )}
          {story.media_type === 'text' && (
            <div className="w-full h-full flex items-center justify-center p-12 text-center" style={{ backgroundColor: story.background_color || '#00A884' }}>
               <h2 className="text-white text-3xl font-bold leading-tight break-words px-4">{story.content}</h2>
            </div>
          )}
        </div>

        {/* Overlays */}
        <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-black/60 via-transparent to-black/60" />

        {/* Progress Bars */}
        <div className="absolute top-6 left-0 right-0 z-20 px-2 flex gap-1">
          {group.stories.map((_: any, i: number) => (
            <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-75",
                  i < storyIdx ? "w-full bg-white" : i === storyIdx ? "bg-white" : "w-0"
                )}
                style={{ width: i === storyIdx ? `${progress}%` : undefined }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-10 left-0 right-0 z-20 px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-whatsapp-green">
                <img src={group.author_avatar} className="w-full h-full object-cover" alt="" />
             </div>
              <div>
                <p className="text-white text-sm font-bold leading-none mb-1">{group.author_name}</p>
                <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest">
                  {story.created_at ? formatTime(new Date(story.created_at)) : 'Agora'}
                </p>
              </div>
          </div>
          <div className="flex items-center gap-2 pointer-events-auto">
            {currentUser && story.author_id === currentUser.id && (
               <button 
                 onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                 className="p-2 text-white/50 hover:text-red-500 transition-all"
                 title="Excluir Status"
               >
                 <Trash2 size={20} />
               </button>
            )}
            <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Interaction Areas - Global Swipe & Pause */}
        <div 
          className="absolute inset-0 z-15 flex touch-none"
          onPointerDown={handleTouchStart}
          onPointerUp={(e) => {
            const clientX = e.clientX;
            const width = e.currentTarget.clientWidth;
            
            // Se não foi um swipe up (detectado no handleTouchEnd)
            handleTouchEnd(e);
            
            // Navegação baseada em cliques laterais (25% bordas)
            if (clientX < width * 0.25) handlePointerUp('prev');
            else if (clientX > width * 0.75) handlePointerUp('next');
            else handlePointerUp(); 
          }}
        >
          <div className="w-1/4 h-full cursor-pointer" />
          <div className="flex-1 h-full cursor-pointer" />
          <div className="w-1/4 h-full cursor-pointer" />
        </div>

         {/* Mentions / Repost if applicable */}
         {story.mentions?.includes(currentUser?.username) && (
            <div className="absolute bottom-24 left-0 right-0 z-30 px-6 flex justify-center">
               <button className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-xs font-bold animate-bounce">
                  <Share2 className="w-3.5 h-3.5" />
                  ADICIONAR AO MEU STATUS
               </button>
            </div>
         )}

         {/* Floating Emojis Animation */}
         {floatingEmojis.map(emoji => (
            <div 
              key={emoji.id}
              className="absolute bottom-20 z-[100] text-4xl animate-float-up pointer-events-none"
              style={{ left: `${emoji.left}%` }}
            >
              {emoji.char}
            </div>
         ))}

         {/* Interaction Footer - Reactions */}
         <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-10 pointer-events-none">
            {/* Visual Hint */}
            <div className="flex flex-col items-center mb-4 transition-all animate-bounce opacity-70 group-hover:opacity-100">
               <ChevronUp className="text-white w-5 h-5 mb-1" />
               <span className="text-[10px] text-white font-black uppercase tracking-[0.2em]">Responder</span>
            </div>

            {/* Quick Reactions Bar */}
            <div className="flex items-center justify-between w-full px-8 mb-4 max-w-sm">
               {['🔥', '❤️', '🙌', '😂', '😮', '😢', '👏', '🎉'].map(emoji => (
                  <button 
                    key={emoji}
                    onClick={(e) => { e.stopPropagation(); sendEmojiReaction(emoji); }}
                    className="text-2xl hover:scale-125 transition-transform active:scale-90"
                  >
                    {emoji}
                  </button>
               ))}
            </div>

            {/* Input Row */}
            <div className="w-full p-4 pb-8 flex items-center gap-3">
               <form onSubmit={handleSendComment} className="flex-1 relative">
                  <input 
                    id="story-comment-input"
                    type="text" 
                    placeholder="Enviar mensagem..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    onFocus={() => {
                        setPaused(true);
                        lastTick.current = null;
                    }}
                    onBlur={() => {
                        setPaused(false);
                        lastTick.current = Date.now();
                    }}
                    className="w-full bg-white/10 border border-white/10 rounded-full py-2.5 px-5 text-white text-sm placeholder:text-white/40 focus:outline-none focus:bg-white/20 transition-all shadow-inner"
                  />
                  {comment.trim() && (
                      <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-whatsapp-green flex items-center justify-center text-whatsapp-dark">
                        <Send className="w-4 h-4" />
                      </button>
                  )}
               </form>
               <button 
                  onClick={handleLike}
                  className={cn(
                    "w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-75",
                    isLiked ? "bg-whatsapp-green text-whatsapp-dark" : "bg-white/10 text-white border border-white/10"
                  )}
               >
                  <Flame className={cn("w-6 h-6", isLiked && "fill-current")} />
               </button>

               {currentUser && story.author_id === currentUser.id && (
                 <button 
                   onClick={(e) => { e.stopPropagation(); handleHighlightToggle(); }}
                   className={cn(
                     "w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-75",
                     story.is_highlight ? "bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.5)]" : "bg-white/10 text-white border border-white/10"
                   )}
                 >
                    <Star className={cn("w-6 h-6", story.is_highlight && "fill-current")} />
                 </button>
               )}
            </div>
         </div>

         {/* Modal Moderno para Nomear Destaque */}
         {isNamingStory && (
           <div className="absolute inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300 pointer-events-auto">
              <div className="w-full max-w-xs bg-white/10 backdrop-blur-xl border border-white/20 rounded-[32px] p-6 shadow-2xl">
                 <h3 className="text-white text-lg font-bold mb-4 text-center">Configurar Destaque</h3>
                 
                 {/* Cover Selector */}
                 <div className="flex justify-center mb-6">
                   <div className="relative group">
                     <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-amber-400 to-yellow-200">
                       <div className="w-full h-full rounded-full bg-gray-900 border-2 border-black overflow-hidden flex items-center justify-center">
                         {highlightCover ? (
                           <img src={highlightCover} className="w-full h-full object-cover" alt="" />
                         ) : (
                           <Camera className="w-8 h-8 text-white/40" />
                         )}
                       </div>
                     </div>
                     <label className="absolute bottom-0 right-0 w-8 h-8 bg-amber-400 rounded-full border-2 border-black flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-lg">
                       <Camera className="w-4 h-4 text-black" />
                       <input 
                         type="file" 
                         className="hidden" 
                         accept="image/*"
                         onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) {
                             setCoverFile(file);
                             setHighlightCover(URL.createObjectURL(file));
                           }
                         }}
                       />
                     </label>
                   </div>
                 </div>

                 <input 
                   autoFocus
                   type="text"
                   value={highlightTitle}
                   onChange={(e) => setHighlightTitle(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && confirmHighlight()}
                   placeholder="Ex: Viagem, Fé..."
                   className="w-full bg-white/10 border border-white/10 rounded-2xl py-3 px-4 text-white text-center focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all mb-4"
                 />
                 <div className="flex gap-2">
                    <button 
                      onClick={() => { setIsNamingStory(false); setPaused(false); }}
                      className="flex-1 py-3 rounded-2xl bg-white/5 text-white/70 font-bold hover:bg-white/10 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={confirmHighlight}
                      disabled={isUploadingCover}
                      className="flex-1 py-3 rounded-2xl bg-amber-400 text-black font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {isUploadingCover ? "Salvando..." : "Salvar"}
                    </button>
                 </div>
              </div>
           </div>
         )}


         {/* Global Animation Styles */}
         <style dangerouslySetInnerHTML={{ __html: `
            @keyframes float-up {
               0% { transform: translateY(0) scale(1); opacity: 1; }
               100% { transform: translateY(-300px) scale(1.5); opacity: 0; }
            }
            .animate-float-up { animation: float-up 2s ease-out forwards; }
         `}} />

        {/* Pause Overlay */}

      </div>
    </div>
  );
}
