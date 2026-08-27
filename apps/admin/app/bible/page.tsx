"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search, ChevronRight, ChevronLeft, Heart, Send,
  X, FileText, ChevronDown, Sparkles, Plus, Check, Columns3, Loader2, Highlighter, Eraser, Play, Square, Trash2, Globe, Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { useBibleInteractions } from "@/hooks/useBibleInteractions";
import { useBibleChapter } from "@/hooks/useBibleChapter";
import { useBibleTTS } from "@/hooks/useBibleTTS";
import { useBibleAI } from "@/hooks/useBibleAI";
import { BIBLE_BOOKS } from "@/lib/bible-data";

const BIBLE_VERSIONS = [
  { id: "nvi", name: "NVI", label: "Nova Versão Internacional", color: "#00A884" },
  { id: "aa", name: "AA", label: "Almeida Atualizada", color: "#f59e0b" },
  { id: "acf", name: "ACF", label: "Almeida Corrigida Fiel", color: "#6366f1" },
];

const HIGHLIGHT_COLORS = [
  { id: "yellow", bg: "rgba(250, 204, 21, 0.25)", bgDark: "rgba(250, 204, 21, 0.15)", dot: "#facc15", label: "Amarelo" },
  { id: "green", bg: "rgba(34, 197, 94, 0.20)", bgDark: "rgba(34, 197, 94, 0.12)", dot: "#22c55e", label: "Verde" },
  { id: "blue", bg: "rgba(59, 130, 246, 0.20)", bgDark: "rgba(59, 130, 246, 0.12)", dot: "#3b82f6", label: "Azul" },
  { id: "pink", bg: "rgba(236, 72, 153, 0.20)", bgDark: "rgba(236, 72, 153, 0.12)", dot: "#ec4899", label: "Rosa" },
  { id: "orange", bg: "rgba(249, 115, 22, 0.20)", bgDark: "rgba(249, 115, 22, 0.12)", dot: "#f97316", label: "Laranja" },
  { id: "purple", bg: "rgba(139, 92, 246, 0.20)", bgDark: "rgba(139, 92, 246, 0.12)", dot: "#8b5cf6", label: "Roxo" },
];

function BibleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedBook, setSelectedBook] = useState<string>("gn");
  const [selectedBookName, setSelectedBookName] = useState<string>("Gênesis");
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [maxChapters, setMaxChapters] = useState<number>(50);
  const [selectedVersion, setSelectedVersion] = useState(BIBLE_VERSIONS[0]);
  
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const versionPickerRef = useRef<HTMLDivElement>(null);
  const [showSelector, setShowSelector] = useState(false);
  const [selectorStep, setSelectorStep] = useState<'books' | 'chapters'>('books');
  const [activeTestamentTab, setActiveTestamentTab] = useState<'VT' | 'NT'>('VT');
  const [searchQuery, setSearchQuery] = useState("");
  const [focusedVerse, setFocusedVerse] = useState<number | null>(null);
  const [highlightPickerVerse, setHighlightPickerVerse] = useState<number | null>(null);

  // Hook Atômico 1: Fetch e Cache de Capítulo
  const { verses, loading } = useBibleChapter(selectedBook, selectedChapter, selectedVersion, selectedBookName);

  // Hook Atômico 2: Text to Speech
  const { isSpeaking, toggleTTS } = useBibleTTS(verses, selectedBookName, selectedChapter);

  // Hook Atômico 3: Inteligência Artificial
  const { isStudying, aiStudyResult, studyVerse, aiOperational, handleAIStudy, closeStudy } = useBibleAI(selectedBookName, selectedChapter, selectedVersion.name);

  const [authUser, setAuthUser] = useState<any>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (versionPickerRef.current && !versionPickerRef.current.contains(e.target as Node)) {
        setShowVersionPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setAuthUser(user);
    };
    initAuth();
  }, []);

  const { 
    favoritesMap: favorites, 
    highlightsMap: highlights, 
    commentsMap: interactions, 
    updateInteraction 
  } = useBibleInteractions(authUser?.id || null, selectedBook, selectedChapter);

  const [commentingVerse, setCommentingVerse] = useState<any>(null);
  const [tempComment, setTempComment] = useState("");

  const [compareVerse, setCompareVerse] = useState<any>(null);
  const [compareData, setCompareData] = useState<Record<string, string>>({});

  useEffect(() => {
    const prefill = searchParams.get('verse');
    if (prefill) {
      const match = prefill.match(/(\d?[a-z]+)\s?(\d+)(?::(\d+))?/i);
      if (match) {
        const abbrev = match[1].toLowerCase();
        const chapter = parseInt(match[2]);
        const verseNum = match[3] ? parseInt(match[3]) : null;
        const book = BIBLE_BOOKS.find(b => b.abbrev === abbrev);
        if (book) {
          setSelectedBook(abbrev);
          setSelectedBookName(book.name);
          setSelectedChapter(chapter);
          setMaxChapters(book.chapters);
          if (verseNum) setFocusedVerse(verseNum);
        }
      }
    }
  }, [searchParams]);

  useEffect(() => {
    setHighlightPickerVerse(null);
  }, [selectedBook, selectedChapter]);

  useEffect(() => {
    if (focusedVerse && verses.length > 0 && !loading) {
      setTimeout(() => {
        const el = document.getElementById(`verse-${focusedVerse}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  }, [focusedVerse, verses, loading]);

  const goToPrevChapter = () => {
    if (selectedChapter > 1) {
      setSelectedChapter(prev => prev - 1);
    } else {
      const currentIndex = BIBLE_BOOKS.findIndex(b => b.abbrev === selectedBook);
      if (currentIndex > 0) {
        const prevBook = BIBLE_BOOKS[currentIndex - 1];
        setSelectedBook(prevBook.abbrev);
        setSelectedBookName(prevBook.name);
        setMaxChapters(prevBook.chapters);
        setSelectedChapter(prevBook.chapters);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextChapter = () => {
    if (selectedChapter < maxChapters) {
      setSelectedChapter(prev => prev + 1);
    } else {
      const currentIndex = BIBLE_BOOKS.findIndex(b => b.abbrev === selectedBook);
      if (currentIndex < BIBLE_BOOKS.length - 1) {
        const nextBook = BIBLE_BOOKS[currentIndex + 1];
        setSelectedBook(nextBook.abbrev);
        setSelectedBookName(nextBook.name);
        setMaxChapters(nextBook.chapters);
        setSelectedChapter(1);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isFirstChapterOverall = selectedChapter === 1 && selectedBook === BIBLE_BOOKS[0].abbrev;
  const isLastChapterOverall = selectedChapter === maxChapters && selectedBook === BIBLE_BOOKS[BIBLE_BOOKS.length - 1].abbrev;

  async function toggleFavorite(verse: any) {
    try {
      const newState = !favorites[verse.number];
      await updateInteraction(verse, { is_favorite: newState });
      toast.success(newState ? "Favoritado! ❤️" : "Removido");
    } catch (error) { toast.error("Erro ao favoritar"); }
  }

  async function updateHighlight(verse: any, color: string | null) {
    try {
      await updateInteraction(verse, { highlight_color: color });
    } catch (error) { toast.error("Erro ao salvar marcação"); }
  }

  async function saveComment() {
    if (!commentingVerse || !tempComment.trim()) return;
    try {
      await updateInteraction(commentingVerse, { comment: tempComment });
      toast.success("Anotação salva! 📖"); setCommentingVerse(null); setTempComment("");
    } catch (error) { toast.error("Erro ao salvar anotação"); }
  }

  function createNoteFromVerse(verse: any) {
    const content = `📖 Versículo: ${selectedBookName} ${selectedChapter}:${verse.number}\n"${verse.text}"\n\n💭 Reflexão: `;
    localStorage.setItem("prefill_note", content); 
    router.push("/notes");
  }

  async function shareToFeed(verse: any) {
    try {
      if (!authUser) return;
      const postContent = `📖 ${selectedBookName} ${selectedChapter}:${verse.number}\n"${verse.text}"`;
      const { error } = await supabase.from("posts").insert({ 
        author_id: authUser.id, 
        user_id: authUser.id, 
        profile_id: authUser.id,
        content: postContent, 
        post_type: 'verse_share' 
      });
      if (error) throw error;
      toast.success("Publicado no Feed! 🙌");
    } catch (error) { toast.error("Erro ao compartilhar"); }
  }

  async function openCompare(verse: any) {
    setCompareData({});
    for (const version of BIBLE_VERSIONS) {
      try {
        const res = await fetch(`/bible/${version.id}.json`);
        if (res.ok) {
           const data = await res.json();
           const bookData = data.find((b: any) => b.abbrev === selectedBook);
           if (bookData?.chapters[selectedChapter - 1]) {
             setCompareData(prev => ({ ...prev, [version.id]: bookData.chapters[selectedChapter - 1][verse.number - 1] }));
           }
        }
      } catch(e) {}
    }
  }

  const vtBooks = useMemo(() => BIBLE_BOOKS.filter(b => b.testament === "VT" && b.name.toLowerCase().includes(searchQuery.toLowerCase())), [searchQuery]);
  const ntBooks = useMemo(() => BIBLE_BOOKS.filter(b => b.testament === "NT" && b.name.toLowerCase().includes(searchQuery.toLowerCase())), [searchQuery]);

  return (
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#0A0A0A] font-inter">
      <div className="sticky top-0 z-[60] pt-[env(safe-area-inset-top)] bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setSelectorStep('books'); setShowSelector(true); }} className="text-lg font-black dark:text-white flex items-center gap-1 hover:text-whatsapp-teal transition-colors">
              {selectedBookName} {selectedChapter} <ChevronDown size={18} className="ml-1 opacity-50" />
            </button>
            <button onClick={toggleTTS} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-whatsapp-teal hover:bg-whatsapp-teal hover:text-white transition-all active:scale-90">
              {isSpeaking ? <Square fill="currentColor" size={12} /> : <Play fill="currentColor" size={14} className="ml-0.5" />}
            </button>
          </div>
          <div className="flex items-center gap-2" ref={versionPickerRef}>
            <button onClick={() => setShowVersionPicker(v => !v)} className="px-3 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border" style={{ color: selectedVersion.color, borderColor: `${selectedVersion.color}30`, backgroundColor: `${selectedVersion.color}10` }}>
              {selectedVersion.name}
            </button>
            {showVersionPicker && (
              <div className="absolute right-16 top-14 mt-2 z-50 bg-white dark:bg-[#111] rounded-[24px] shadow-2xl border border-gray-100 dark:border-white/10 min-w-[200px]">
                {BIBLE_VERSIONS.map(v => (
                  <button key={v.id} onClick={() => { setSelectedVersion(v); setShowVersionPicker(false); }} className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5">
                    <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: v.color }}>{v.name}</span>
                    {selectedVersion.id === v.id && <Check size={14} style={{ color: v.color }} />}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => router.push('/bible/search')} className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-whatsapp-teal"><Search size={20} /></button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10 pb-[calc(env(safe-area-inset-bottom)+100px)]">
        <div className="flex items-center justify-between mb-8 md:mb-16 px-2">
          <button disabled={selectedChapter === 1} onClick={() => setSelectedChapter(prev => prev - 1)} className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-white/5 text-gray-400 hover:text-whatsapp-teal disabled:opacity-0 transition-all border"><ChevronLeft /></button>
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-whatsapp-teal/60 mb-2">Capítulo</span>
            <span className="text-3xl font-black dark:text-white">{selectedChapter}</span>
          </div>
          <button disabled={selectedChapter === maxChapters} onClick={() => setSelectedChapter(prev => prev + 1)} className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-white/5 text-gray-400 hover:text-whatsapp-teal disabled:opacity-0 transition-all border"><ChevronRight /></button>
        </div>

        <div className={cn("space-y-8 transition-all", loading ? "opacity-20 blur-md" : "opacity-100")}>
          {loading ? (
             Array.from({ length: 15 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4 animate-pulse">
                   <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-white/10 shrink-0"></div>
                   <div className="space-y-3 flex-1 mt-1">
                      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-5/6"></div>
                   </div>
                </div>
             ))
          ) : verses.map((verse) => (
            <div id={`verse-${verse.number}`} key={verse.number} className="group relative">
              <div className={cn("flex gap-4 p-4 rounded-[32px] transition-all", favorites[verse.number] && "bg-amber-500/5")} style={highlights[verse.number] ? { backgroundColor: HIGHLIGHT_COLORS.find(c => c.id === highlights[verse.number])?.bg } : undefined}>
                <div className="pt-1.5 shrink-0 flex flex-col items-center gap-2">
                  <span className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-xl text-[11px] font-black border transition-colors shadow-sm",
                    favorites[verse.number] 
                      ? "bg-amber-500 text-white border-amber-400" 
                      : "bg-white dark:bg-white/15 text-gray-900 dark:text-white border-gray-200 dark:border-white/20"
                  )}>
                    {verse.number}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 dark:text-white leading-relaxed text-lg font-medium font-outfit">
                    {verse.text}
                  </p>
                  
                  {interactions[verse.number] && interactions[verse.number].map((interaction: any, idx: number) => (
                    <div key={idx} className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 group/comment">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FileText size={14} className="text-emerald-600 dark:text-emerald-500" />
                          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Sua Anotação</span>
                        </div>
                        <button 
                          onClick={() => {
                            if (confirm("Tem certeza que deseja apagar esta anotação?")) {
                              updateInteraction(verse, { comment: null });
                              toast.success("Anotação excluída");
                            }
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-500 hover:text-white transition-all active:scale-90 opacity-0 group-hover/comment:opacity-100"
                          title="Excluir anotação"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="text-sm text-emerald-900 dark:text-emerald-100 font-medium font-outfit leading-relaxed">{interaction.comment}</p>
                    </div>
                  ))}

                  <div className="flex flex-wrap items-center gap-6 mt-6 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all bg-white/5 dark:bg-white/5 p-3 rounded-2xl md:bg-transparent w-fit">
                    <button title="Favoritar Versículo" onClick={() => toggleFavorite(verse)} className={cn("flex items-center gap-1.5 transition-all active:scale-90", favorites[verse.number] ? "text-amber-500 scale-110" : "text-gray-400 hover:text-amber-500")}>
                      <Heart size={20} className={favorites[verse.number] ? "fill-current" : ""} />
                    </button>
                    <button title="Nova Anotação" onClick={() => setCommentingVerse(verse)} className="flex items-center gap-1.5 text-gray-400 hover:text-emerald-500 transition-all hover:scale-110 active:scale-90">
                      <Plus size={22} />
                    </button>
                    <button title="Criar Devocional Diário" onClick={() => createNoteFromVerse(verse)} className="flex items-center gap-1.5 text-gray-400 hover:text-blue-500 transition-all hover:scale-110 active:scale-90">
                      <FileText size={20} />
                    </button>
                    <button title="Compartilhar no Feed" onClick={() => shareToFeed(verse)} className="flex items-center gap-1.5 text-gray-400 hover:text-whatsapp-teal transition-all hover:scale-110 active:scale-90">
                      <Send size={20} />
                    </button>
                    {aiOperational && (
                      <button title="Estudo Bíblico com Inteligência Artificial" onClick={() => handleAIStudy(verse)} className="flex items-center gap-1.5 text-whatsapp-teal animate-in fade-in duration-1000 transition-all hover:scale-125 active:scale-90">
                        <Sparkles size={20} className="fill-whatsapp-teal/20" />
                      </button>
                    )}
                    <button title="Comparar Versões" onClick={() => { setCompareVerse(verse); openCompare(verse); }} className="flex items-center gap-1.5 text-gray-400 hover:text-violet-500 transition-all hover:scale-110 active:scale-90">
                      <Columns3 size={20} />
                    </button>
                    <button title="Destacar / Colorir" onClick={() => setHighlightPickerVerse(verse.number)} className="flex items-center gap-1.5 text-gray-400 hover:text-yellow-500 transition-all hover:scale-110 active:scale-90">
                      <Highlighter size={20} />
                    </button>
                  </div>
                  {highlightPickerVerse === verse.number && (
                    <div className="flex gap-2 mt-2">
                      {HIGHLIGHT_COLORS.map(c => <button key={c.id} onClick={() => { updateHighlight(verse, c.id); setHighlightPickerVerse(null); }} className="w-6 h-6 rounded-full" style={{ backgroundColor: c.dot }} />)}
                      <button onClick={() => { updateHighlight(verse, null); setHighlightPickerVerse(null); }}><Eraser size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Reprodutor de Áudio e Navegação de Capítulo Inferior */}
        {!loading && verses.length > 0 && (
          <div className="mt-12 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-8">
            <button 
              onClick={toggleTTS} 
              className="w-14 h-14 shrink-0 bg-[#1f1f1f] hover:bg-[#2f2f2f] dark:bg-white/10 dark:hover:bg-white/20 rounded-[20px] flex items-center justify-center text-white transition-all active:scale-95 shadow-lg"
            >
              {isSpeaking ? <Square fill="currentColor" size={20} /> : <Play fill="currentColor" size={24} className="ml-1" />}
            </button>
            
            <div className="flex-1 h-14 bg-[#1f1f1f] dark:bg-white/10 rounded-[20px] flex items-center justify-between px-2 shadow-lg">
              <button 
                onClick={goToPrevChapter} 
                disabled={isFirstChapterOverall} 
                className="w-10 h-10 flex items-center justify-center text-white opacity-50 hover:opacity-100 disabled:opacity-20 active:scale-90 transition-all"
              >
                <ChevronLeft />
              </button>
              <button 
                onClick={() => { setShowSelector(true); setSelectorStep('books'); }} 
                className="flex-1 text-center text-white font-outfit font-medium text-[15px] hover:text-whatsapp-teal transition-colors truncate px-2"
              >
                {selectedBookName} {selectedChapter}
              </button>
              <button 
                onClick={goToNextChapter} 
                disabled={isLastChapterOverall} 
                className="w-10 h-10 flex items-center justify-center text-white opacity-50 hover:opacity-100 disabled:opacity-20 active:scale-90 transition-all"
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {commentingVerse && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-[#111] w-full max-w-xl rounded-[40px] p-8">
            <textarea value={tempComment} onChange={(e) => setTempComment(e.target.value)} className="w-full bg-transparent text-xl font-medium outline-none min-h-[120px] dark:text-white" placeholder="Sua meditação..." autoFocus />
            <button onClick={saveComment} className="w-full py-5 bg-whatsapp-teal text-white rounded-3xl font-black text-xs uppercase mt-4">Guardar</button>
            <button onClick={() => setCommentingVerse(null)} className="w-full mt-2 text-gray-400 text-[10px] uppercase font-bold">Cancelar</button>
          </div>
        </div>
      )}

      {compareVerse && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-[#111] w-full max-w-2xl rounded-[40px] p-8 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between mb-4"><h3 className="font-black dark:text-white">Versão Comparada</h3><X onClick={() => setCompareVerse(null)} className="cursor-pointer" /></div>
            {BIBLE_VERSIONS.map(v => (
              <div key={v.id} className="mb-4 p-4 rounded-2xl border" style={{ borderColor: `${v.color}20` }}>
                <span className="text-[10px] font-black uppercase" style={{ color: v.color }}>{v.name}</span>
                <p className="text-sm dark:text-gray-300 mt-1">{compareData[v.id] || "..."}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(isStudying || aiStudyResult) && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0c0c0c] w-full max-w-2xl rounded-[40px] border border-whatsapp-teal/20 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b bg-whatsapp-teal/5 flex justify-between items-center">
              <div><h3 className="font-black dark:text-white">Estudo com análise bíblica</h3><p className="text-[10px] text-whatsapp-teal font-bold uppercase">Motor Gemini 2.5 flash Ativo</p></div>
              <X onClick={closeStudy} className="cursor-pointer text-gray-400" />
            </div>
            <div className="p-10 overflow-y-auto bg-inherit">
              {isStudying ? <div className="flex flex-col items-center py-20"><Loader2 className="animate-spin text-whatsapp-teal w-10 h-10" /><p className="mt-4 font-black text-[10px] uppercase">Revelando Contextos...</p></div> :
                <div className="space-y-4 text-gray-700 dark:text-gray-300 leading-relaxed font-outfit">
                  {aiStudyResult?.split('\n').map((l, i) => <p key={i} className={l.match(/^\d\./) ? "font-black text-whatsapp-teal uppercase mt-4" : ""}>{l}</p>)}
                </div>}
            </div>
            {!isStudying && aiStudyResult && (
              <div className="p-8 pt-0">
                <button 
                  onClick={() => { 
                    const content = `📖 Versículo: ${selectedBookName} ${selectedChapter}:${studyVerse?.number}\n"${studyVerse?.text}"\n\n${aiStudyResult}`;
                    const title = `Estudo: ${selectedBookName} ${selectedChapter}:${studyVerse?.number}`;
                    const tags = `EstudoIA,${selectedBookName}`;
                    localStorage.setItem("prefill_note", content); 
                    localStorage.setItem("prefill_title", title);
                    localStorage.setItem("prefill_tags", tags);
                    window.location.href = "/notes"; 
                  }} 
                  className="w-full py-5 bg-whatsapp-teal text-white rounded-3xl font-black text-xs uppercase hover:bg-whatsapp-teal/90 transition-all shadow-lg active:scale-95"
                >
                  Salvar no Diário
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showSelector && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-[#0A0A0A] p-6 flex flex-col pt-[calc(env(safe-area-inset-top)+24px)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between shrink-0">
            <h2 className="text-2xl font-black dark:text-white">
              {selectorStep === 'books' ? 'Livros' : selectedBookName}
            </h2>
            <button onClick={() => setShowSelector(false)} className="w-10 h-10 bg-gray-50 dark:bg-white/10 rounded-full flex items-center justify-center text-gray-500 active:scale-95 transition-all">
              <X size={20} />
            </button>
          </div>

          {selectorStep === 'books' ? (
            <div className="flex flex-col h-full overflow-hidden mt-6">
              <div className="flex bg-gray-50 dark:bg-white/5 p-1 rounded-2xl mb-4 shrink-0">
                <button 
                  onClick={() => setActiveTestamentTab('VT')} 
                  className={cn("flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", activeTestamentTab === 'VT' ? "bg-white dark:bg-[#1a1a1a] shadow-sm text-whatsapp-teal" : "text-gray-500")}
                >
                  Antigo Testamento
                </button>
                <button 
                  onClick={() => setActiveTestamentTab('NT')} 
                  className={cn("flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", activeTestamentTab === 'NT' ? "bg-white dark:bg-[#1a1a1a] shadow-sm text-whatsapp-teal" : "text-gray-500")}
                >
                  Novo Testamento
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pb-32 space-y-2 pr-2">
                {(activeTestamentTab === 'VT' ? vtBooks : ntBooks).map(b => (
                  <button 
                    key={b.abbrev} 
                    onClick={() => { setSelectedBook(b.abbrev); setSelectedBookName(b.name); setMaxChapters(b.chapters); setSelectorStep('chapters'); }} 
                    className="w-full flex items-center justify-between p-4 bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-2xl transition-colors active:scale-[0.98]"
                  >
                    <span className="font-bold text-gray-800 dark:text-white text-base">{b.name}</span>
                    <span className="text-[10px] text-whatsapp-teal font-black uppercase">{b.chapters} Cap.</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden mt-6">
              <h3 className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-4">Escolha o Capítulo</h3>
              <div className="grid grid-cols-5 gap-3 overflow-y-auto pb-32 pr-2">
                {Array.from({ length: maxChapters }, (_, i) => i + 1).map(num => (
                  <button 
                    key={num} 
                    onClick={() => { setSelectedChapter(num); setShowSelector(false); }} 
                    className="aspect-square flex items-center justify-center bg-gray-50 dark:bg-white/5 hover:bg-whatsapp-teal hover:text-white rounded-2xl text-gray-700 dark:text-white font-black text-lg transition-colors active:scale-90"
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


export default function BiblePage() {
  return (
    <React.Suspense fallback={null}>
      <BibleContent />
    </React.Suspense>
  );
}
