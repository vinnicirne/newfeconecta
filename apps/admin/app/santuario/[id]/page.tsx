"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, CheckCircle, Flame, Clock, Lock, BookOpen, Share2, MessageCircle, Facebook, Twitter, Link as LinkIcon, X, MoreVertical, Edit2, EyeOff, Eye, Trash2, Calendar } from "lucide-react";
import Link from "next/link";
import { BIBLE_BOOKS } from "@/lib/bible-data";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ZenReaderPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [journey, setJourney] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [completedChapters, setCompletedChapters] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
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
      toast.success(`Devocional ${!journey.is_published ? "publicado" : "privado"} com sucesso!`);
    } catch (e) {
      toast.error("Erro ao alterar privacidade.");
    }
    setIsOptionsOpen(false);
  };

  const deleteJourney = async () => {
    if (!window.confirm("Tem certeza que deseja excluir esta jornada? Essa ação não pode ser desfeita e excluirá também o post no feed.")) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from("sanctuary_journeys").delete().eq("id", id);
      if (error) throw error;
      
      // Deletar o post correspondente
      await supabase.from("posts").delete().eq("media_url", id);
      
      toast.success("Jornada excluída.");
      router.push("/santuario");
    } catch (e) {
      toast.error("Erro ao excluir.");
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    // If mobile, try native share first
    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: journey.title,
          text: journey.description,
          url: window.location.href,
        });
        return;
      } catch (err) {
        console.error("Share failed", err);
      }
    }
    // Otherwise open modal
    setIsShareOpen(true);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copiado para a área de transferência!");
    setIsShareOpen(false);
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
        parts.push(<strong key={match.index} className="font-black text-zinc-900 dark:text-white">{fullMatch.slice(2, -2)}</strong>);
      } else if (fullMatch.startsWith("*") && fullMatch.endsWith("*")) {
        parts.push(<em key={match.index} className="italic">{fullMatch.slice(1, -1)}</em>);
      } else if (fullMatch.startsWith("__") && fullMatch.endsWith("__")) {
        parts.push(<u key={match.index} className="underline underline-offset-2 decoration-amber-500/50 decoration-2">{fullMatch.slice(2, -2)}</u>);
      } else if (fullMatch.startsWith("==") && fullMatch.endsWith("==")) {
        parts.push(<mark key={match.index} className="bg-amber-200 dark:bg-amber-500/40 text-inherit px-1 rounded-sm">{fullMatch.slice(2, -2)}</mark>);
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
                className="text-amber-500 font-bold hover:underline bg-amber-500/10 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 mx-0.5"
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
    const fetchJourneyAndChapters = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        if (userId) setCurrentUserId(userId);

        const { data: journeyData, error } = await supabase
          .from("sanctuary_journeys")
          .select("*, author:profiles(id, full_name, avatar_url, is_verified)")
          .eq("id", id)
          .single();

        if (error) throw error;
        setJourney(journeyData);

        const { data: chaptersData } = await supabase
          .from("sanctuary_chapters")
          .select("*")
          .eq("journey_id", id)
          .order("order_index", { ascending: true });

        if (chaptersData) setChapters(chaptersData);

        if (userId) {
          const { data: progress } = await supabase
            .from("sanctuary_progress")
            .select("chapter_id")
            .eq("user_id", userId);
            
          if (progress) {
            setCompletedChapters(progress.map(p => p.chapter_id));
          }
        }
      } catch (err) {
        console.error(err);
        toast.error("Jornada não encontrada ou indisponível.");
        router.push("/santuario");
      } finally {
        setLoading(false);
      }
    };
    
    if (id) fetchJourneyAndChapters();
  }, [id, router]);

  const handleSealAltar = async (chapterId: string) => {
    setSavingProgress(chapterId);
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id;
      if (!userId) {
        toast.error("Faça login para salvar no seu Altar Digital.");
        return;
      }

      const { error } = await supabase
        .from("sanctuary_progress")
        .insert({
          user_id: userId,
          chapter_id: chapterId,
          is_completed: true,
          completed_at: new Date().toISOString()
        });

      if (error && error.code !== '23505') throw error;

      setCompletedChapters(prev => [...prev, chapterId]);
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
    <div className="min-h-screen bg-background text-foreground selection:bg-amber-500/30 transition-colors duration-300">
      {/* Sticky Header */}
      <div className="fixed top-0 w-full bg-background/80 backdrop-blur-md z-10 border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-amber-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-500">
              <Flame className="w-4 h-4 fill-current" /> {progressPercentage}%
            </div>
            {currentUserId === journey?.author_id && (
              <div className="relative">
                <button onClick={() => setIsOptionsOpen(!isOptionsOpen)} className="p-2 text-zinc-500 hover:bg-muted rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
                {isOptionsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-xl overflow-hidden py-1 z-50">
                    <button onClick={() => router.push(`/santuario/create?edit=${id}`)} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left">
                      <Edit2 className="w-4 h-4" /> Editar Jornada
                    </button>
                    <button onClick={togglePrivacy} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors text-left">
                      {journey.is_published ? <><EyeOff className="w-4 h-4" /> Privar (Ocultar)</> : <><Eye className="w-4 h-4" /> Publicar (Exibir)</>}
                    </button>
                    <div className="h-px bg-border my-1" />
                    <button onClick={deleteJourney} disabled={isDeleting} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition-colors text-left">
                      <Trash2 className="w-4 h-4" /> {isDeleting ? "Excluindo..." : "Excluir Definitivamente"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="pt-24 pb-32 px-4 md:px-6 max-w-3xl mx-auto">
        
        {/* CABEÇALHO */}
        <div className="mb-12 text-center">
          {journey.cover_url && (
            <div className="w-full h-48 md:h-64 mb-8 rounded-3xl overflow-hidden relative shadow-lg">
              <img src={journey.cover_url} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}
          <div className="flex items-center justify-center mb-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-santuario text-zinc-900 dark:text-white leading-tight truncate max-w-full">
              {journey.title}
            </h1>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto mb-8 leading-relaxed">
            {journey.description}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mt-6">
            <div className="flex items-center gap-3 bg-card px-4 py-2 rounded-full border border-border shadow-sm">
              {journey.author?.avatar_url ? (
                <img src={journey.author.avatar_url} alt="Author" className="w-10 h-10 rounded-full object-cover shadow-sm border border-border" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted" />
              )}
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-zinc-900 dark:text-white">{journey.author?.full_name}</span>
                  {journey.author?.is_verified && <CheckCircle className="w-4 h-4 text-whatsapp-teal" />}
                </div>
                <span className="text-xs text-zinc-500 block">Autor Verificado</span>
              </div>
            </div>
            
            <div className="w-1.5 h-1.5 rounded-full bg-border hidden sm:block" />
            
            <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 bg-card px-4 py-3 rounded-full border border-border shadow-sm">
              <Calendar className="w-4 h-4" />
              {new Date(journey.created_at).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* MÓDULOS */}
        <div className="space-y-12">
          {chapters.map((chapter, index) => {
            const isCompleted = completedChapters.includes(chapter.id);
            const isUnlocked = index <= completedChapters.length;
            const contentText = chapter.content_blocks[0]?.text || "";

            if (!isUnlocked) {
              return (
                <div key={chapter.id} className="relative opacity-50 select-none">
                  {index !== chapters.length - 1 && (
                    <div className="absolute left-6 top-16 bottom-[-3rem] w-0.5 bg-santuario-gold/10 dark:bg-santuario-gold/5" />
                  )}
                  <div className="flex gap-4 md:gap-6">
                    <div className="shrink-0 mt-1">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-border/50 bg-background/50 text-muted-foreground z-10 relative">
                        <Lock className="w-5 h-5" />
                      </div>
                    </div>
                    <div className="flex-1 bg-card/50 p-6 rounded-3xl border border-border/50 flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold font-santuario text-zinc-500 dark:text-zinc-600">Dia {index + 1} • Selado</h3>
                        <p className="text-sm text-zinc-400 mt-1">Continue sua jornada para revelar este capítulo.</p>
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
                  <div className="absolute left-6 top-24 bottom-[-3rem] w-0.5 bg-santuario-gold/20 dark:bg-santuario-gold/10" />
                )}

                <div className="flex gap-4 md:gap-6">
                  {/* Indicador de Status */}
                  <div className="shrink-0 mt-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 z-10 relative bg-background ${isCompleted ? 'border-amber-500 text-amber-500' : 'border-border text-muted-foreground'}`}>
                      {isCompleted ? <Flame className="w-6 h-6 fill-current" /> : <span className="font-bold">{index + 1}</span>}
                    </div>
                  </div>

                  {/* Conteúdo do Capítulo */}
                  <div className="flex-1 bg-card p-6 md:p-8 rounded-3xl shadow-sm border border-border">
                    <h2 className="text-2xl font-bold font-santuario text-zinc-900 dark:text-white mb-6">
                      {chapter.title}
                    </h2>
                    
                    <article className={`prose prose-lg dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:text-zinc-600 dark:prose-p:text-zinc-300 mb-10 ${journey.typography || 'font-santuario'}`}>
                      {contentText.split('\n').map((para: string, idx: number) => (
                        <p key={idx} className="mb-4">{renderRichText(para)}</p>
                      ))}
                    </article>

                    <div className="pt-6 border-t border-border flex justify-end gap-3">
                      <button
                        onClick={handleShare}
                        className="flex items-center gap-2 px-6 py-3 bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-300 rounded-full hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors font-bold text-sm"
                      >
                        <Share2 className="w-4 h-4" /> Compartilhar
                      </button>

                      {isCompleted ? (
                        <div className="flex items-center gap-2 px-6 py-3 bg-amber-500/10 rounded-full text-amber-500 font-bold text-sm border border-amber-500/20">
                          <CheckCircle className="w-4 h-4" /> Leitura Selada
                        </div>
                      ) : (
                        <button
                          onClick={() => handleSealAltar(chapter.id)}
                          disabled={savingProgress === chapter.id}
                          className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-amber-500 text-white dark:text-black font-bold rounded-full shadow-lg hover:opacity-90 transition-all active:scale-95 text-sm"
                        >
                          {savingProgress === chapter.id ? (
                            <div className="animate-spin w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full" />
                          ) : (
                            <Flame className="w-4 h-4" />
                          )}
                          Acender Chama
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

      {/* Share Modal */}
      {isShareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setIsShareOpen(false)}>
          <div className="bg-card w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button onClick={() => setIsShareOpen(false)} className="absolute top-4 right-4 p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-6 text-center text-foreground font-santuario">Compartilhar</h3>
            <div className="grid grid-cols-4 gap-4">
               {/* WhatsApp */}
               <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(journey?.title + " - " + (typeof window !== 'undefined' ? window.location.href : ''))}`} target="_blank" className="flex flex-col items-center gap-2 group hover:scale-105 transition-transform">
                 <div className="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg"><MessageCircle className="w-6 h-6" /></div>
                 <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">WhatsApp</span>
               </a>
               {/* Facebook */}
               <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} target="_blank" className="flex flex-col items-center gap-2 group hover:scale-105 transition-transform">
                 <div className="w-14 h-14 rounded-full bg-[#1877F2] text-white flex items-center justify-center shadow-lg"><Facebook className="w-6 h-6" /></div>
                 <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">Facebook</span>
               </a>
               {/* Twitter */}
               <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${encodeURIComponent(journey?.title || '')}`} target="_blank" className="flex flex-col items-center gap-2 group hover:scale-105 transition-transform">
                 <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center shadow-lg"><Twitter className="w-6 h-6" /></div>
                 <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">X (Twitter)</span>
               </a>
               {/* Copiar */}
               <button onClick={handleCopyLink} className="flex flex-col items-center gap-2 group hover:scale-105 transition-transform">
                 <div className="w-14 h-14 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shadow-lg"><LinkIcon className="w-6 h-6" /></div>
                 <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">Copiar</span>
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
