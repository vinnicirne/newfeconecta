"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, CheckCircle, Flame, Clock, Lock, BookOpen, 
  Share2, MessageCircle, Facebook, Twitter, Link as LinkIcon, 
  X, MoreVertical, Edit2, EyeOff, Eye, Trash2, Calendar, Sparkles
} from "lucide-react";
import Link from "next/link";
import { BIBLE_BOOKS } from "@/lib/bible-data";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/feed/BottomNav";
import { getStoredProfile } from "@/lib/profile-cache";

export default function ZenReaderPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [journey, setJourney] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [completedChapters, setCompletedChapters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => getStoredProfile()?.id || null);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const togglePrivacy = async () => {
    try {
      const { error } = await supabase
        .from("sanctuary_journeys")
        .update({ is_published: !journey.is_published })
        .eq("id", id);
      if (error) throw error;
      setJourney({ ...journey, is_published: !journey.is_published });
      toast.success(`Jornada ${!journey.is_published ? "publicada" : "privada"} com sucesso!`);
    } catch (e) {
      toast.error("Erro ao alterar privacidade.");
    }
    setIsOptionsOpen(false);
  };

  const deleteJourney = async () => {
    if (!window.confirm("Tem certeza que deseja excluir esta jornada? Essa ação é permanente.")) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("sanctuary_journeys").delete().eq("id", id);
      if (error) throw error;
      
      // Deletar post correspondente se houver
      await supabase.from("posts").delete().eq("media_url", id);
      
      toast.success("Jornada excluída com sucesso.");
      router.push("/santuario");
    } catch (e) {
      toast.error("Erro ao excluir jornada.");
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: journey?.title || "Lugar Secreto",
          text: journey?.description || "Medite nesta jornada espiritual no FéConecta",
          url: window.location.href,
        });
        return;
      } catch (err) {
        // Ignora cancelamento pelo usuário
      }
    }
    setIsShareOpen(true);
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para a área de transferência!");
      setIsShareOpen(false);
    }
  };

  // Parser de Rich Text e Referências Bíblicas
  const renderRichText = (content: string) => {
    if (!content) return null;
    const regex = /((?:(?:[1-3]\s*)?[A-ZÇÃÉÍÓÚÔÊa-zçãéíóúôê]+)\.?\s*\d+:\d+(?:-\d+)?|\*\*.*?\*\*|\*.*?\*|__.*?__|==.*?==)/gi;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      
      const fullMatch = match[0];

      if (fullMatch.startsWith("**") && fullMatch.endsWith("**")) {
        parts.push(<strong key={match.index} className="font-black text-foreground">{fullMatch.slice(2, -2)}</strong>);
      } else if (fullMatch.startsWith("*") && fullMatch.endsWith("*")) {
        parts.push(<em key={match.index} className="italic text-amber-600 dark:text-amber-300">{fullMatch.slice(1, -1)}</em>);
      } else if (fullMatch.startsWith("__") && fullMatch.endsWith("__")) {
        parts.push(<u key={match.index} className="underline underline-offset-4 decoration-amber-500/60 decoration-2">{fullMatch.slice(2, -2)}</u>);
      } else if (fullMatch.startsWith("==") && fullMatch.endsWith("==")) {
        parts.push(<mark key={match.index} className="bg-amber-400/20 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded-md font-semibold">{fullMatch.slice(2, -2)}</mark>);
      } else {
        const bibleMatch = fullMatch.match(/((?:[1-3]\s*)?[A-ZÇÃÉÍÓÚÔÊa-zçãéíóúôê]+)\.?\s*(\d+):(\d+(?:-\d+)?)/i);
        if (bibleMatch) {
          const bookStr = bibleMatch[1].trim();
          const chapter = bibleMatch[2];
          const verse = bibleMatch[3];

          let abbrev = "";
          const normBook = bookStr.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s/g, "");
          
          for (const book of BIBLE_BOOKS) {
            const normName = book.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s/g, "");
            if (normBook === normName || normBook === book.abbrev) {
              abbrev = book.abbrev;
              break;
            }
          }

          if (abbrev) {
            parts.push(
              <Link 
                key={match.index} 
                href={`/bible?verse=${abbrev}${chapter}:${verse}`}
                className="text-amber-500 font-bold hover:underline bg-amber-500/10 px-2 py-0.5 rounded-lg inline-flex items-center gap-1 mx-0.5 border border-amber-500/20 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <BookOpen className="w-3 h-3 inline" /> {fullMatch}
              </Link>
            );
          } else {
            parts.push(fullMatch);
          }
        } else {
          parts.push(fullMatch);
        }
      }
      
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return <>{parts}</>;
  };

  useEffect(() => {
    let isMounted = true;

    const fetchJourneyAndChapters = async () => {
      try {
        const cached = getStoredProfile();
        let userId = cached?.id;
        if (!userId) {
          const { data: { user } } = await supabase.auth.getUser();
          userId = user?.id || null;
        }
        if (isMounted && userId) setCurrentUserId(userId);

        const [journeyRes, chaptersRes, progressRes] = await Promise.all([
          supabase
            .from("sanctuary_journeys")
            .select("*, author:profiles(id, full_name, avatar_url, is_verified)")
            .eq("id", id)
            .maybeSingle(),
          supabase
            .from("sanctuary_chapters")
            .select("*")
            .eq("journey_id", id)
            .order("order_index", { ascending: true }),
          userId
            ? supabase
                .from("sanctuary_progress")
                .select("chapter_id")
                .eq("user_id", userId)
            : Promise.resolve({ data: [] } as any)
        ]);

        if (!isMounted) return;

        if (journeyRes.error || !journeyRes.data) {
          throw new Error("Jornada não encontrada");
        }

        setJourney(journeyRes.data);
        if (chaptersRes.data) setChapters(chaptersRes.data);
        if (progressRes.data) setCompletedChapters(progressRes.data.map((p: any) => p.chapter_id));
      } catch (err) {
        console.error("[ZenReader] Erro ao carregar:", err);
        toast.error("Jornada não encontrada ou indisponível.");
        router.push("/santuario");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    if (id) fetchJourneyAndChapters();

    return () => {
      isMounted = false;
    };
  }, [id, router]);

  const handleSealAltar = async (chapterId: string) => {
    setSavingProgress(chapterId);
    try {
      const cached = getStoredProfile();
      let userId = cached?.id || currentUserId;

      if (!userId) {
        const { data: session } = await supabase.auth.getSession();
        userId = session?.session?.user?.id;
      }

      if (!userId) {
        toast.error("Faça login para salvar no seu Altar Digital.");
        return;
      }

      const { error } = await supabase
        .from("sanctuary_progress")
        .upsert({
          user_id: userId,
          chapter_id: chapterId,
          is_completed: true,
          completed_at: new Date().toISOString()
        }, { onConflict: 'user_id,chapter_id' });

      if (error && error.code !== '23505') throw error;

      setCompletedChapters(prev => Array.from(new Set([...prev, chapterId])));
      toast.success("Chama acesa no seu Altar Digital! 🔥");
    } catch (err: any) {
      toast.error(`Erro ao salvar progresso: ${err.message}`);
    } finally {
      setSavingProgress(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center transition-colors">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!journey) return null;

  const progressPercentage = chapters.length > 0 
    ? Math.round((completedChapters.length / chapters.length) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-amber-500/30 transition-colors duration-300 pb-36">
      
      {/* Sticky Header */}
      <div className="fixed top-0 w-full bg-background/90 backdrop-blur-xl z-20 border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => router.push("/santuario")} 
            className="flex items-center gap-2 text-muted-foreground hover:text-amber-500 transition-colors font-medium text-sm p-1"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Voltar</span>
          </button>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
              <Flame className="w-4 h-4 fill-amber-500" /> {progressPercentage}% Concluído
            </div>
            
            {currentUserId === journey?.author_id && (
              <div className="relative">
                <button 
                  onClick={() => setIsOptionsOpen(!isOptionsOpen)} 
                  className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                {isOptionsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden py-1.5 z-50 animate-in fade-in zoom-in-95">
                    <button 
                      onClick={() => router.push(`/santuario/create?edit=${id}`)} 
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left font-medium"
                    >
                      <Edit2 className="w-4 h-4 text-amber-500" /> Editar Jornada
                    </button>
                    <button 
                      onClick={togglePrivacy} 
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left font-medium"
                    >
                      {journey.is_published ? <><EyeOff className="w-4 h-4 text-zinc-400" /> Privar (Ocultar)</> : <><Eye className="w-4 h-4 text-emerald-500" /> Publicar (Exibir)</>}
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button 
                      onClick={deleteJourney} 
                      disabled={isDeleting} 
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors text-left font-medium"
                    >
                      <Trash2 className="w-4 h-4" /> {isDeleting ? "Excluindo..." : "Excluir Definitivamente"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-24 px-4 md:px-6 max-w-3xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="mb-12 text-center">
          {journey.cover_url && (
            <div className="w-full h-48 sm:h-64 mb-8 rounded-3xl overflow-hidden relative shadow-2xl border border-border">
              <img src={journey.cover_url} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            </div>
          )}
          
          <h1 className="text-2xl sm:text-4xl font-bold font-santuario text-foreground leading-tight mb-4 px-2">
            {journey.title}
          </h1>

          <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed text-sm sm:text-base px-2">
            {journey.description}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-6">
            <div className="flex items-center gap-2.5 bg-card px-4 py-2 rounded-full border border-border shadow-sm">
              {journey.author?.avatar_url ? (
                <img src={journey.author.avatar_url} alt="Author" className="w-8 h-8 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                  {journey.author?.full_name?.[0] || 'L'}
                </div>
              )}
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs sm:text-sm text-foreground">{journey.author?.full_name}</span>
                  {journey.author?.is_verified && <CheckCircle className="w-3.5 h-3.5 text-whatsapp-teal fill-whatsapp-teal/20" />}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card px-4 py-2.5 rounded-full border border-border shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              {new Date(journey.created_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* MÓDULOS */}
        <div className="space-y-10 mb-12">
          {chapters.map((chapter, index) => {
            const isCompleted = completedChapters.includes(chapter.id);
            const isUnlocked = index <= completedChapters.length;
            const contentText = chapter.content_blocks?.[0]?.text || "";

            if (!isUnlocked) {
              return (
                <div key={chapter.id} className="relative opacity-50 select-none">
                  {index !== chapters.length - 1 && (
                    <div className="absolute left-6 top-16 bottom-[-3rem] w-0.5 bg-border" />
                  )}
                  <div className="flex gap-4 md:gap-6">
                    <div className="shrink-0 mt-1">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center border border-border bg-card text-muted-foreground z-10 relative">
                        <Lock className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="flex-1 bg-card/60 p-6 rounded-3xl border border-border flex items-center justify-between">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold font-santuario text-muted-foreground">Módulo {index + 1} • Selado</h3>
                        <p className="text-xs text-muted-foreground mt-1">Sele o módulo anterior para revelar este capítulo.</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={chapter.id} className="relative">
                {/* Linha de Conexão entre capítulos */}
                {index !== chapters.length - 1 && (
                  <div className="absolute left-6 top-24 bottom-[-3rem] w-0.5 bg-amber-500/20" />
                )}

                <div className="flex gap-4 md:gap-6">
                  {/* Indicador de Status */}
                  <div className="shrink-0 mt-1">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 z-10 relative bg-background shadow-md transition-all ${
                      isCompleted ? 'border-amber-500 text-amber-500 bg-amber-500/10' : 'border-border text-foreground font-bold'
                    }`}>
                      {isCompleted ? <Flame className="w-6 h-6 fill-amber-500" /> : <span className="font-bold text-base">{index + 1}</span>}
                    </div>
                  </div>

                  {/* Conteúdo do Capítulo */}
                  <div className="flex-1 bg-card p-6 md:p-8 rounded-3xl shadow-sm border border-border space-y-6">
                    <h2 className="text-xl sm:text-2xl font-bold font-santuario text-foreground leading-snug">
                      {chapter.title}
                    </h2>
                    
                    <article className={`prose prose-base sm:prose-lg dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-muted-foreground ${journey.typography || 'font-santuario'}`}>
                      {contentText.split('\n').map((para: string, idx: number) => (
                        <p key={idx} className="mb-4">{renderRichText(para)}</p>
                      ))}
                    </article>

                    <div className="pt-6 border-t border-border flex flex-wrap items-center justify-end gap-3">
                      <button
                        onClick={handleShare}
                        className="flex items-center gap-2 px-5 py-2.5 bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground rounded-full transition-colors font-bold text-xs sm:text-sm active:scale-95"
                      >
                        <Share2 className="w-4 h-4" /> Compartilhar
                      </button>

                      {isCompleted ? (
                        <div className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 rounded-full text-amber-500 font-bold text-xs sm:text-sm border border-amber-500/20">
                          <CheckCircle className="w-4 h-4" /> Leitura Selada
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSealAltar(chapter.id)}
                          disabled={savingProgress === chapter.id}
                          className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-black font-bold rounded-full shadow-lg shadow-amber-500/20 hover:bg-amber-400 transition-all active:scale-95 text-xs sm:text-sm disabled:opacity-50"
                        >
                          {savingProgress === chapter.id ? (
                            <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                          ) : (
                            <Flame className="w-4 h-4 fill-black" />
                          )}
                          Acender Chama no Altar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Modal de Compartilhamento */}
      <AnimatePresence>
        {isShareOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsShareOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card w-full max-w-sm rounded-3xl p-6 shadow-2xl relative border border-border" 
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setIsShareOpen(false)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold mb-6 text-center text-foreground font-santuario">Compartilhar Jornada</h3>
              <div className="grid grid-cols-4 gap-3">
                {/* WhatsApp */}
                <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent((journey?.title || "Lugar Secreto") + " - " + (typeof window !== 'undefined' ? window.location.href : ''))}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group hover:scale-105 transition-transform">
                  <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-lg"><MessageCircle className="w-6 h-6" /></div>
                  <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground">WhatsApp</span>
                </a>
                {/* Facebook */}
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group hover:scale-105 transition-transform">
                  <div className="w-12 h-12 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center shadow-lg"><Facebook className="w-6 h-6" /></div>
                  <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground">Facebook</span>
                </a>
                {/* Twitter */}
                <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(journey?.title || '')}`} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-2 group hover:scale-105 transition-transform">
                  <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg"><Twitter className="w-6 h-6" /></div>
                  <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground">X</span>
                </a>
                {/* Copiar */}
                <button onClick={handleCopyLink} className="flex flex-col items-center gap-2 group hover:scale-105 transition-transform">
                  <div className="w-12 h-12 rounded-2xl bg-muted text-foreground flex items-center justify-center shadow-lg"><LinkIcon className="w-6 h-6" /></div>
                  <span className="text-[11px] font-bold text-muted-foreground group-hover:text-foreground">Copiar</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
