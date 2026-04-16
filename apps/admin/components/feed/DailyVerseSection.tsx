"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Calendar, Flame, MessageSquare, Repeat2, Send, MoreHorizontal, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import CommentsSection from "@/components/feed/CommentsSection";

export default function DailyVerseSection({ currentUser }: { currentUser: any }) {
  const router = useRouter();
  
  const [isMounted, setIsMounted] = useState(false);
  const [dailyVerses, setDailyVerses] = useState<any[]>([]);
  const [dailyVerse, setDailyVerse] = useState<any>(null);
  const [showVerseCalendar, setShowVerseCalendar] = useState(false);
  const [isLikedDailyVerse, setIsLikedDailyVerse] = useState(false);
  const [isReposted, setIsReposted] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [sending, setSending] = useState(false);

  // Canais de Realtime
  useEffect(() => {
    setIsMounted(true);
    loadDailyVerse();
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
      const { error } = await supabase
        .from('daily_verses')
        .update({ likes: newLikes })
        .eq('id', dailyVerse.id);
      
      if (error) throw error;
      
      // Atualizar objeto local para manter sincronia
      setDailyVerse({ ...dailyVerse, likes: newLikes });
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
      // Cria um post real no feed citando o versículo do dia
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: currentUser.id,
          content: `📖 Recomendo a Palavra do Dia: "${dailyVerse.content}" — ${dailyVerse.reference}`,
          status: 'published',
          type: 'repost_verse',
          metadata: { 
            verse_id: dailyVerse.id,
            bible_ref: `${dailyVerse.book_abbrev}${dailyVerse.chapter}:${dailyVerse.verse}`
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
         <div className="relative overflow-hidden rounded-[32px] bg-zinc-900 shadow-2xl shadow-whatsapp-teal/10 group min-h-[380px] flex flex-col">
            {/* Background com Overlay */}
            {dailyVerse.background_url ? (
              <img src={dailyVerse.background_url} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[2000ms]" alt="" />
            ) : (
              <img 
                src="https://images.unsplash.com/photo-1504052434569-70ad5836ab65?q=80&w=2070&auto=format&fit=crop" 
                className="absolute inset-0 w-full h-full object-cover opacity-40"
                alt=""
              />
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

            {/* Conteúdo Principal */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center p-8 space-y-6">
               <div className="flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
                  {isMounted && <Sparkles className="w-3 h-3 text-whatsapp-green animate-pulse" />}
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Deus falou comigo hoje</span>
               </div>
               
               <h2 className="text-2xl md:text-3xl font-black text-white leading-tight font-serif px-2 italic drop-shadow-lg">
                  "{dailyVerse.content || "Vigiem e fiquem alertas..."}"
               </h2>
               
               <p className="text-xs font-bold text-whatsapp-green uppercase tracking-[0.3em] font-outfit">{dailyVerse.reference || "Marcos 13:33"}</p>
            </div>

            {/* Barra de Interação Social Estilo Premium */}
            <div className="relative z-10 px-8 pb-8">
              <div className="flex items-center justify-between pt-6 border-t border-white/10">
                <div className="flex items-center gap-6">
                  {/* LIKE (FOGO) */}
                  <button 
                    onClick={handleLike}
                    className="flex flex-col items-center gap-1 group/btn transition-all active:scale-90"
                  >
                    {isMounted && (
                      <Flame 
                        className={cn(
                          "w-6 h-6 transition-all duration-300",
                          isLikedDailyVerse ? "text-orange-500 fill-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" : "text-white group-hover:text-orange-500"
                        )} 
                      />
                    )}
                    <span className="text-[10px] font-bold text-white/60">
                      {likesCount.toLocaleString()}
                    </span>
                  </button>
                  
                  {/* COMENTAR */}
                  <button 
                    onClick={() => setShowComments(!showComments)}
                    className="flex flex-col items-center gap-1 group/btn transition-all active:scale-90"
                  >
                    {isMounted && (
                      <MessageSquare 
                        className={cn(
                          "w-6 h-6 transition-all duration-300",
                          showComments ? "text-whatsapp-green fill-whatsapp-green drop-shadow-[0_0_8px_rgba(37,211,102,0.5)]" : "text-white group-hover:text-whatsapp-green"
                        )} 
                      />
                    )}
                    <span className="text-[10px] font-bold text-white/60">
                      {commentsCount.toLocaleString()}
                    </span>
                  </button>

                  {/* REPOSTAR NO FEED */}
                  <button 
                    onClick={handleRepost}
                    className="flex flex-col items-center gap-1 group/btn transition-all active:scale-90"
                  >
                    {isMounted && (
                      <Repeat2 
                        className={cn(
                          "w-6 h-6 transition-all duration-300",
                          isReposted ? "text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] scale-110" : "text-white group-hover:text-blue-500"
                        )} 
                      />
                    )}
                    <span className="text-[10px] font-bold text-white/60">
                      {(dailyVerse.reposts_count || 0).toLocaleString()}
                    </span>
                  </button>

                  {/* ENVIAR / COMPARTILHAR */}
                  <button 
                    onClick={handleShare}
                    className="flex flex-col items-center gap-1 group/btn transition-all active:scale-90"
                  >
                    {isMounted && (
                      <Send 
                        className="w-6 h-6 text-white group-hover:text-whatsapp-teal transition-all"
                      />
                    )}
                    <span className="text-[10px] font-bold text-white/60">
                      {(dailyVerse.shares_count || 0).toLocaleString()}
                    </span>
                  </button>
                </div>

                <button 
                  onClick={() => router.push('/palavra-semana')}
                  className="flex flex-col items-center gap-1 group/btn transition-all active:scale-90"
                >
                  {isMounted && <MoreHorizontal className="w-6 h-6 text-white group-hover:text-whatsapp-teal transition-colors" />}
                  <span className="text-[10px] font-bold text-white/60">Mais</span>
                </button>
              </div>

              <div className="mt-6">
                <button 
                  onClick={() => router.push(`/bible?verse=${dailyVerse.book_abbrev || 'MR'}${dailyVerse.chapter || '13'}:${dailyVerse.verse || '33'}`)}
                  className="w-full py-4 bg-white/10 hover:bg-white text-white hover:text-whatsapp-teal backdrop-blur-md rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-white/10"
                >
                  {isMounted && <MessageCircle className="w-4 h-4" />} Ler capítulo completo
                </button>
              </div>
            </div>
         </div>
      </div>

      {/* Modal/Seção de Comentários (Fora do card para não ser cortado) */}
      {showComments && (
        <div className="px-4 mb-6 -mt-4 animate-in slide-in-from-top-2 fade-in duration-300">
          <div className="bg-white dark:bg-whatsapp-darkLighter shadow-xl rounded-2xl border border-gray-100 dark:border-white/5 p-2 overflow-hidden relative z-20">
             <CommentsSection verseId={dailyVerse.id} user={currentUser} />
          </div>
        </div>
      )}
    </>
  );
}
