"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Flame, MessageSquare, Repeat2, Send, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import CommentsSection from "@/components/feed/CommentsSection";

export default function DailyVerseSection({ currentUser }: { currentUser: any }) {
  const router = useRouter();
  
  const [dailyVerses, setDailyVerses] = useState<any[]>([]);
  const [dailyVerse, setDailyVerse] = useState<any>(null);
  const [showVerseCalendar, setShowVerseCalendar] = useState(false);
  const [isLikedDailyVerse, setIsLikedDailyVerse] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [sending, setSending] = useState(false);

  // Canais de Realtime e Inicialização Limpa
  useEffect(() => {
    let isFeatureEnabled = true;

    if (typeof window !== 'undefined') {
      try {
        const controlsRaw = localStorage.getItem('fc_feed_controls_v1');
        if (controlsRaw) {
          const parsedControls = JSON.parse(controlsRaw);
          if (parsedControls.show_daily_verse === false) {
            isFeatureEnabled = false;
            setDailyVerse(null);
            setDailyVerses([]);
            localStorage.removeItem('fc_daily_verse_cache');
          }
        }
      } catch (e) {}

      if (isFeatureEnabled) {
        const cached = localStorage.getItem('fc_daily_verse_cache');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setDailyVerse(parsed[0]);
              setDailyVerses(parsed);
            }
          } catch (e) {}
        }
      }
    }

    const handleControlsUpdate = (e: any) => {
      if (e.detail && e.detail.show_daily_verse === false) {
        setDailyVerse(null);
        setDailyVerses([]);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('fc_daily_verse_cache');
        }
      } else if (e.detail && e.detail.show_daily_verse === true) {
        loadDailyVerse();
      }
    };
    window.addEventListener('feed-controls-updated', handleControlsUpdate);

    loadDailyVerse();

    return () => {
      window.removeEventListener('feed-controls-updated', handleControlsUpdate);
    };
  }, []);

  // Monitorar Mudanças Real-time quando o versículo carregar
  useEffect(() => {
    if (!dailyVerse?.id) return;

    // 1. Monitorar Comentários (Contagem)
    const commentsChannel = supabase
      .channel(`verse_comments_${dailyVerse.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'daily_verse_comments',
        filter: `verse_id=eq.${dailyVerse.id}` 
      }, () => {
        refreshCounts();
      })
      .subscribe();

    // 2. Monitorar o próprio Versículo (Curtidas)
    const verseChannel = supabase
      .channel(`verse_data_${dailyVerse.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'daily_verses',
        filter: `id=eq.${dailyVerse.id}` 
      }, (payload) => {
        const updatedVerse = payload.new;
        setLikesCount(updatedVerse.likes?.length || 0);
        if (currentUser?.id) {
          setIsLikedDailyVerse(updatedVerse.likes?.includes(currentUser.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(verseChannel);
    };
  }, [dailyVerse?.id, currentUser?.id]);

  const loadDailyVerse = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_verses')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(7);
      
      if (data && data.length > 0) {
        setDailyVerses(data);
        const verse = data[0];
        setDailyVerse(verse);
        
        // Salvar no cache
        localStorage.setItem('fc_daily_verse_cache', JSON.stringify(data));
        
        // Inicializar contadores reais
        setLikesCount(verse.likes?.length || 0);
        if (currentUser?.id) {
          setIsLikedDailyVerse(verse.likes?.includes(currentUser.id));
        }
        
        // Buscar contagem de comentários inicial
        const { count } = await supabase
          .from('daily_verse_comments')
          .select('*', { count: 'exact', head: true })
          .eq('verse_id', verse.id);
        
        setCommentsCount(count || 0);
      } else {
        setDailyVerses([]);
        setDailyVerse(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('fc_daily_verse_cache');
        }
      }
    } catch (err) {
      console.error("Erro ao carregar versículo do dia:", err);
    }
  };

  const refreshCounts = async () => {
    if (!dailyVerse?.id) return;
    const { count } = await supabase
      .from('daily_verse_comments')
      .select('*', { count: 'exact', head: true })
      .eq('verse_id', dailyVerse.id);
    setCommentsCount(count || 0);
  };

  const handleLike = async () => {
    if (!currentUser || !dailyVerse) return;
    
    const userId = currentUser.id;
    const currentLikes = dailyVerse.likes || [];
    const isLiked = currentLikes.includes(userId);
    
    const newLikes = isLiked 
      ? currentLikes.filter((id: string) => id !== userId)
      : [...currentLikes, userId];
      
    // Update local otimista
    setIsLikedDailyVerse(!isLiked);
    setLikesCount(newLikes.length);
    
    try {
      const { data: newStatus, error } = await supabase.rpc('toggle_daily_verse_like', {
        p_verse_id: dailyVerse.id
      });
      
      if (error) throw error;
      
      setIsLikedDailyVerse(newStatus);
      const syncedLikes = newStatus 
        ? [...currentLikes.filter((id: string) => id !== userId), userId]
        : currentLikes.filter((id: string) => id !== userId);
      setDailyVerse({ ...dailyVerse, likes: syncedLikes });
    } catch (err) {
      toast.error("Erro ao salvar curtida");
      setIsLikedDailyVerse(isLiked);
      setLikesCount(currentLikes.length);
    }
  };

  const handleRepost = async () => {
    if (!currentUser || !dailyVerse) return;
    
    setSending(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: currentUser.id,
          author_id: currentUser.id,
          profile_id: currentUser.id,
          content: `📖 Recomendo a Palavra do Dia: "${dailyVerse.content}" — ${dailyVerse.reference}`,
          status: 'published',
          type: 'repost_verse',
          post_type: 'repost_verse',
          metadata: { 
            verse_id: dailyVerse.id,
            bible_ref: `${dailyVerse.book_abbrev || ''}${dailyVerse.chapter || ''}:${dailyVerse.verse || ''}`
          }
        });

      if (error) throw error;
      
      setIsReposted(true);
      toast.success("Versículo compartilhado no seu feed!");
    } catch (err: any) {
      toast.error("Erro ao repostar: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleShare = async () => {
    if (!dailyVerse) return;
    
    const shareText = `FéConecta | Palavra do Dia: "${dailyVerse.content}" (${dailyVerse.reference})`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Versículo do Dia',
          text: shareText,
          url: window.location.origin,
        });
      } catch (err) {
        console.error("Erro ao compartilhar:", err);
      }
    } else {
      // Fallback para cópia
      navigator.clipboard.writeText(shareText);
      toast.success("Texto copiado para o WhatsApp!");
    }
  };

  if (!dailyVerse) return null;

  return (
    <>
      <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-1000 px-4 lg:px-0" suppressHydrationWarning>
         <div className="relative overflow-hidden rounded-[32px] bg-zinc-950 border border-white/5 shadow-2xl shadow-whatsapp-teal/10 group flex flex-col">
            {/* Background com Overlay */}
            {dailyVerse.background_url ? (
              <img src={dailyVerse.background_url} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[2000ms]" alt="" />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-whatsapp-dark via-[#0a101d] to-[#042f2e] opacity-90" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            
            {/* Seletor de Dia da Semana (Ciclo de 7) */}
            <div className="absolute top-4 right-4 z-50 flex flex-col items-end gap-2">
               <button 
                 onClick={() => setShowVerseCalendar(!showVerseCalendar)} 
                 className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/40 transition-all hover:scale-110 active:scale-95 shadow-xl" 
                 title="Selecionar Dia da Semana"
               >
                  <Calendar className="w-4 h-4" />
               </button>
               {showVerseCalendar && dailyVerses.length > 0 && (
                 <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex flex-col gap-1 w-32 shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    <div className="px-2 py-1 mb-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-whatsapp-green">Desta Semana</span>
                    </div>
                    {dailyVerses.map((verse) => {
                      const date = new Date(verse.created_at || new Date());
                      const dayName = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date);
                      const isSelected = dailyVerse?.id === verse.id;
                      return (
                        <button 
                          key={verse.id}
                          onClick={() => {
                            setDailyVerse(verse);
                            setShowVerseCalendar(false);
                          }}
                          className={cn(
                            "text-left px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                            isSelected ? "bg-whatsapp-teal text-white shadow-lg shadow-whatsapp-teal/20" : "text-white/60 hover:bg-white/10 hover:text-white"
                          )}
                        >
                          {dayName}
                        </button>
                      );
                    })}
                 </div>
               )}
            </div>

            {/* Conteúdo Principal - Foco Total no VV */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center p-8 md:p-12">
               <h2 className={cn(
                 "font-bold text-white leading-tight italic drop-shadow-2xl mb-6",
                 (() => {
                   const len = (dailyVerse.content || "").length;
                   if (len < 80) return "text-2xl md:text-4xl";
                   if (len < 160) return "text-xl md:text-2xl";
                   if (len < 240) return "text-lg md:text-xl";
                   return "text-base md:text-lg";
                 })()
               )}>
                  "{dailyVerse.content || "Vigiem e fiquem alertas..."}"
               </h2>
               
               <div className="flex flex-col items-center gap-4">
                 <div className="h-px w-12 bg-whatsapp-green/50" />
                 <p className="text-sm font-black text-whatsapp-green uppercase tracking-[0.4em] font-outfit opacity-90">{dailyVerse.reference || "Marcos 13:33"}</p>
                 <div className="h-px w-12 bg-whatsapp-green/50" />
               </div>
            </div>

            {/* Ações Sociais (Interação) */}
            <div className="relative z-10 px-6 pb-6 pt-2 flex items-center justify-center gap-8">
               <button onClick={handleLike} className="flex flex-col items-center gap-1 group">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all bg-white/5 backdrop-blur-md border border-white/5 group-active:scale-90", isLikedDailyVerse && "bg-orange-500/10 border-orange-500/20")}>
                    <Flame className={cn("w-5 h-5 transition-colors", isLikedDailyVerse ? "text-orange-500 fill-orange-500" : "text-white/70")} />
                  </div>
                  <span className="text-[10px] font-black text-white/70">{likesCount}</span>
               </button>

               <button onClick={() => setShowComments(!showComments)} className="flex flex-col items-center gap-1 group">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all bg-white/5 backdrop-blur-md border border-white/5 group-active:scale-90", showComments && "bg-whatsapp-teal/10 border-whatsapp-teal/20")}>
                    <MessageCircle className={cn("w-5 h-5 transition-colors", showComments ? "text-whatsapp-teal" : "text-white/70")} />
                  </div>
                  <span className="text-[10px] font-black text-white/70">{commentsCount}</span>
               </button>

               <button onClick={handleRepost} disabled={sending || isReposted} className="flex flex-col items-center gap-1 group disabled:opacity-50">
                  <div className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all bg-white/5 backdrop-blur-md border border-white/5 group-active:scale-90", isReposted && "bg-whatsapp-green/10 border-whatsapp-green/20")}>
                    <Repeat2 className={cn("w-5 h-5 transition-colors", isReposted ? "text-whatsapp-green" : "text-white/70")} />
                  </div>
               </button>

               <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center transition-all bg-white/5 backdrop-blur-md border border-white/5 group-active:scale-90">
                    <Send className="w-5 h-5 text-white/70 transition-colors" />
                  </div>
               </button>
            </div>

            {/* Ação Minimalista (Ler mais) */}
            <div className="relative z-10 px-8 pb-8 flex justify-center">
                <button 
                  onClick={() => router.push(`/bible?verse=${dailyVerse.book_abbrev || 'MR'}${dailyVerse.chapter || '13'}:${dailyVerse.verse || '33'}`)}
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white backdrop-blur-md rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-2 border border-white/5"
                >
                   Abrir na Bíblia
                </button>
            </div>

            {/* Seção de Comentários (Visível ao Clicar) */}
            {showComments && (
              <div className="relative z-20 bg-black/60 backdrop-blur-3xl border-t border-white/10 w-full animate-in slide-in-from-bottom-8 duration-500 rounded-b-[32px] overflow-hidden flex flex-col max-h-[60vh]">
                 <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                    <h3 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                       <MessageSquare className="w-3.5 h-3.5 text-whatsapp-teal" />
                       Conversas Espirituais
                    </h3>
                    <button onClick={() => setShowComments(false)} className="text-[10px] font-bold text-white/50 hover:text-white">FECHAR</button>
                 </div>
                 <div className="flex-1 overflow-y-auto no-scrollbar pb-4 pt-2">
                    <CommentsSection verseId={dailyVerse.id} user={currentUser} />
                 </div>
              </div>
            )}
         </div>
      </div>
    </>
  );
}
