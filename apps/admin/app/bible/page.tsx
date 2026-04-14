"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, BookOpen, ChevronRight, ChevronLeft, 
  Heart, Send, ScrollText,
  X, FileText, ChevronDown, Sparkles, Plus, ChevronUp, Check, Columns3, Loader2, Highlighter, Eraser
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import moment from "moment";
import "moment/locale/pt-br";

moment.locale("pt-br");

import { BIBLE_BOOKS } from "@/lib/bible-data";

const BIBLE_VERSIONS = [
  { id: "nvi", name: "NVI", label: "Nova Versão Internacional", color: "#00A884" },
  { id: "aa",  name: "AA",  label: "Almeida Atualizada",        color: "#f59e0b" },
  { id: "acf", name: "ACF", label: "Almeida Corrigida Fiel",   color: "#6366f1" },
];

// Cache por versão
const bibleCache: Record<string, any> = {};

// Cores do marca-texto
const HIGHLIGHT_COLORS = [
  { id: "yellow",  bg: "rgba(250, 204, 21, 0.25)",  bgDark: "rgba(250, 204, 21, 0.15)",  dot: "#facc15", label: "Amarelo" },
  { id: "green",   bg: "rgba(34, 197, 94, 0.20)",   bgDark: "rgba(34, 197, 94, 0.12)",   dot: "#22c55e", label: "Verde" },
  { id: "blue",    bg: "rgba(59, 130, 246, 0.20)",   bgDark: "rgba(59, 130, 246, 0.12)",  dot: "#3b82f6", label: "Azul" },
  { id: "pink",    bg: "rgba(236, 72, 153, 0.20)",   bgDark: "rgba(236, 72, 153, 0.12)",  dot: "#ec4899", label: "Rosa" },
  { id: "orange",  bg: "rgba(249, 115, 22, 0.20)",   bgDark: "rgba(249, 115, 22, 0.12)",  dot: "#f97316", label: "Laranja" },
  { id: "purple",  bg: "rgba(139, 92, 246, 0.20)",   bgDark: "rgba(139, 92, 246, 0.12)",  dot: "#8b5cf6", label: "Roxo" },
];

interface Verse {
  number: number;
  text: string;
}

interface Interaction {
  id?: string;
  verse_number: number;
  comment?: string;
  is_favorite?: boolean;
  highlight_color?: string;
  created_at?: string;
}



export default function BiblePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [selectedBook, setSelectedBook] = useState<string>("gn");
  const [selectedBookName, setSelectedBookName] = useState<string>("Gênesis");
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [maxChapters, setMaxChapters] = useState<number>(50);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedVerse, setFocusedVerse] = useState<number | null>(null);
  const [selectedVersion, setSelectedVersion] = useState(BIBLE_VERSIONS[0]);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const versionPickerRef = useRef<HTMLDivElement>(null);

  const [showSelector, setShowSelector] = useState(false);
  const [selectorStep, setSelectorStep] = useState<'books' | 'chapters'>('books');
  const [activeTestamentTab, setActiveTestamentTab] = useState<'VT' | 'NT'>('VT');
  const [searchQuery, setSearchQuery] = useState("");

  // Marca-texto
  const [highlights, setHighlights] = useState<Record<number, string>>({});
  const [highlightPickerVerse, setHighlightPickerVerse] = useState<number | null>(null);

  // Close version picker when clicking outside
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
    let cancelled = false;

    async function loadData() {
      await fetchChapter();
      if (!cancelled) {
        // Delay para evitar race condition no auth lock do Supabase
        await new Promise(r => setTimeout(r, 100));
        if (!cancelled) fetchInteractions();
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [selectedBook, selectedChapter, selectedVersion]);

  // Remove old highlight sync effect
  useEffect(() => {
    setHighlightPickerVerse(null);
  }, [selectedBook, selectedChapter]);

  // Scroll to focused verse when loaded
  useEffect(() => {
    if (focusedVerse && verses.length > 0 && !loading) {
      setTimeout(() => {
        const el = document.getElementById(`verse-${focusedVerse}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
    }
  }, [focusedVerse, verses, loading]);

  // Handle URL pre-fill for "Verse of the Day"
  useEffect(() => {
    const prefill = searchParams.get('verse'); // format sl23:1
    if (prefill) {
      const match = prefill.match(/([a-z0-9]+)(\d+)(?::(\d+))?/i);
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
          if (verseNum) {
            setFocusedVerse(verseNum);
          }
        }
      }
    }
  }, [searchParams]);

  async function fetchChapter() {
    try {
      setLoading(true);
      
      const book = BIBLE_BOOKS.find(b => b.abbrev === selectedBook);
      if (!book) return;

      // Usar cache por versão ou buscar do JSON local
      if (!bibleCache[selectedVersion.id]) {
        const res = await fetch(`/bible/${selectedVersion.id}.json`);
        if (!res.ok) throw new Error(`Falha ao carregar versão ${selectedVersion.name}`);
        bibleCache[selectedVersion.id] = await res.json();
      }

      const bookData = bibleCache[selectedVersion.id].find((b: any) => b.abbrev === selectedBook);
      if (bookData && bookData.chapters[selectedChapter - 1]) {
        const chapterVerses = bookData.chapters[selectedChapter - 1];
        const mappedVerses = chapterVerses.map((v: string, index: number) => ({
          number: index + 1,
          text: v
        }));
        setVerses(mappedVerses);
      } else {
        setVerses([]);
      }
    } catch (error) {
      console.error("Erro ao carregar capítulos:", error);
      toast.error("Erro ao carregar capítulos da bíblia local");
    } finally {
      setLoading(false);
    }
  }

  const [interactions, setInteractions] = useState<Record<string, Interaction[]>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [commentingVerse, setCommentingVerse] = useState<Verse | null>(null);
  const [tempComment, setTempComment] = useState("");

  async function fetchInteractions() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const user = session.user;

      const { data, error } = await supabase
        .from("bible_interactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("book_abbrev", selectedBook)
        .eq("chapter", selectedChapter)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const notesMap: Record<string, Interaction[]> = {};
        const favsMap: Record<string, boolean> = {};
        const hlMap: Record<number, string> = {};
        
        data.forEach(i => {
          if (i.comment) {
            if (!notesMap[i.verse_number]) notesMap[i.verse_number] = [];
            notesMap[i.verse_number].push(i);
          }
          if (i.is_favorite) favsMap[i.verse_number] = true;
          if (i.highlight_color) hlMap[i.verse_number] = i.highlight_color;
        });
        
        setInteractions(notesMap);
        setFavorites(favsMap);
        setHighlights(hlMap);
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return; // Ignorar erros de lock cancelado
      console.warn("Biblia: Offline ou Erro de Auth nas interações", error);
    }
  }

  // Ações Limpas e sem gambiarras fallback
  async function toggleFavorite(verse: Verse) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      const newState = !favorites[verse.number];
      
      // Upsert limpo amparado pela constrait correta de BD: bible_interactions_user_verse_unique
      const { error } = await supabase.from("bible_interactions").upsert({
        user_id: session.user.id,
        book_abbrev: selectedBook,
        book_name: selectedBookName,
        chapter: selectedChapter,
        verse_number: verse.number,
        verse_text: verse.text,
        is_favorite: newState
      }, { onConflict: 'user_id,book_abbrev,chapter,verse_number' });
      
      if (error) throw error;

      setFavorites({ ...favorites, [verse.number]: newState });
      toast.success(newState ? "Favoritado! ❤️" : "Removido");
    } catch (error) { 
      toast.error("Erro ao favoritar"); 
    }
  }

  async function updateHighlight(verse: Verse, color: string | null) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase.from("bible_interactions").upsert({
        user_id: session.user.id,
        book_abbrev: selectedBook,
        book_name: selectedBookName,
        chapter: selectedChapter,
        verse_number: verse.number,
        verse_text: verse.text,
        highlight_color: color
      }, { onConflict: 'user_id,book_abbrev,chapter,verse_number' });

      if (error) throw error;

      const newHighlights = { ...highlights };
      if (color) {
        newHighlights[verse.number] = color;
      } else {
        delete newHighlights[verse.number];
      }
      setHighlights(newHighlights);
    } catch (error) {
      toast.error("Erro ao salvar marcação");
    }
  }

  async function saveComment() {
    if (!commentingVerse || !tempComment.trim()) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error } = await supabase.from("bible_interactions").upsert({
        user_id: session.user.id,
        book_abbrev: selectedBook,
        book_name: selectedBookName,
        chapter: selectedChapter,
        verse_number: commentingVerse.number,
        verse_text: commentingVerse.text,
        comment: tempComment,
        created_at: new Date().toISOString()
      }, { onConflict: 'user_id,book_abbrev,chapter,verse_number' }).select().single();

      if (error) throw error;
      
      const currentNotes = interactions[commentingVerse.number] || [];
      setInteractions({ 
        ...interactions, 
        [commentingVerse.number]: [data, ...currentNotes] 
      });
      
      toast.success("Nova página de revelação salva! 📖");
      setCommentingVerse(null);
      setTempComment("");
    } catch (error) { toast.error("Erro ao salvar anotação"); }
  }

  function createNoteFromVerse(verse: Verse) {
    const history = interactions[verse.number] || [];
    const latestComment = history[0]?.comment ? `\n\nAnotação Recente:\n${history[0].comment}` : "";
    const content = `📖 Versículo: ${selectedBookName} ${selectedChapter}:${verse.number}\n"${verse.text}"${latestComment}\n\n💭 Reflexão de hoje (${moment().format('LL')}): `;
    localStorage.setItem("prefill_note", content);
    router.push("/notes");
  }

  async function shareToFeed(verse: Verse) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const history = interactions[verse.number] || [];
      const commentText = history[0]?.comment ? `\n\nMinha Reflexão: ${history[0].comment}` : "";
      const postContent = `📖 ${selectedBookName} ${selectedChapter}:${verse.number}\n"${verse.text}"${commentText}`;
      const { error } = await supabase.from("posts").insert({
        author_id: user.id,
        user_id: user.id,
        content: postContent,
        post_type: 'text',
        is_testimony: true
      });
      if (error) throw error;
      toast.success("Publicado no Feed! 🙌");
    } catch (error) { toast.error("Erro ao compartilhar"); }
  }

  const vtBooks = useMemo(() => BIBLE_BOOKS.filter(b => b.testament === "VT" && b.name.toLowerCase().includes(searchQuery.toLowerCase())), [searchQuery]);
  const ntBooks = useMemo(() => BIBLE_BOOKS.filter(b => b.testament === "NT" && b.name.toLowerCase().includes(searchQuery.toLowerCase())), [searchQuery]);

  // ========== COMPARAÇÃO DE VERSÕES ==========
  const [compareVerse, setCompareVerse] = useState<Verse | null>(null);
  const [compareData, setCompareData] = useState<Record<string, string>>({});
  const [compareLoading, setCompareLoading] = useState(false);

  async function openCompare(verse: Verse) {
    setCompareVerse(verse);
    setCompareLoading(true);
    setCompareData({});

    try {
      const texts: Record<string, string> = {};

      for (const version of BIBLE_VERSIONS) {
        // Carrega a versão se ainda não estiver em cache
        if (!bibleCache[version.id]) {
          const res = await fetch(`/bible/${version.id}.json`);
          if (!res.ok) continue;
          bibleCache[version.id] = await res.json();
        }

        const bookData = bibleCache[version.id]?.find((b: any) => b.abbrev === selectedBook);
        if (bookData && bookData.chapters[selectedChapter - 1]) {
          const verseText = bookData.chapters[selectedChapter - 1][verse.number - 1];
          if (verseText) texts[version.id] = verseText;
        }
      }

      setCompareData(texts);
    } catch (error) {
      console.error("Erro ao comparar versões:", error);
      toast.error("Erro ao carregar versões para comparação");
    } finally {
      setCompareLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#0A0A0A] font-inter">
      
      {/* HEADER FIXO */}
      <div className="sticky top-0 z-[60] bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-whatsapp-teal/10 flex items-center justify-center text-whatsapp-teal">
                <BookOpen className="w-6 h-6" />
             </div>
             <button 
                onClick={() => { 
                   const book = BIBLE_BOOKS.find(b => b.abbrev === selectedBook);
                   setActiveTestamentTab(book?.testament === 'NT' ? 'NT' : 'VT');
                   setSelectorStep('books'); 
                   setShowSelector(true); 
                }}
                className="text-lg font-black dark:text-white flex items-center gap-1 hover:text-whatsapp-teal transition-colors"
              >
                {selectedBookName} {selectedChapter}
                <ChevronDown size={18} className="ml-1 opacity-50" />
             </button>
          </div>

          <div className="flex items-center gap-2">
             {/* VERSION PICKER */}
             <div className="relative" ref={versionPickerRef}>
               <button
                 onClick={() => setShowVersionPicker(v => !v)}
                 className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border"
                 style={{ 
                   color: selectedVersion.color,
                   borderColor: `${selectedVersion.color}30`,
                   backgroundColor: `${selectedVersion.color}10`
                 }}
               >
                 {selectedVersion.name}
                 {showVersionPicker ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
               </button>

               {showVersionPicker && (
                 <div className="absolute right-0 top-full mt-2 z-50 bg-white dark:bg-[#111] rounded-[24px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden min-w-[200px] animate-in fade-in zoom-in-95 duration-200">
                   {BIBLE_VERSIONS.map(v => (
                     <button
                       key={v.id}
                       onClick={() => { setSelectedVersion(v); setShowVersionPicker(false); }}
                       className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                     >
                       <div className="text-left">
                         <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: v.color }}>{v.name}</span>
                         <p className="text-[10px] text-gray-400 mt-0.5">{v.label}</p>
                       </div>
                       {selectedVersion.id === v.id && <Check size={14} style={{ color: v.color }} />}
                     </button>
                   ))}
                 </div>
               )}
             </div>

             <div className="flex items-center bg-gray-50 dark:bg-white/5 p-1 rounded-2xl border border-gray-100 dark:border-white/5">
                <button 
                  onClick={() => { setActiveTestamentTab('VT'); setShowSelector(true); setSelectorStep('books'); }}
                  className="px-3 py-1.5 text-[10px] font-black text-whatsapp-teal hover:bg-whatsapp-teal/10 rounded-xl transition-all"
                >
                  VT
                </button>
                <div className="w-[1px] h-3 bg-gray-200 dark:bg-white/10 mx-1" />
                <button 
                  onClick={() => { setActiveTestamentTab('NT'); setShowSelector(true); setSelectorStep('books'); }}
                  className="px-3 py-1.5 text-[10px] font-black text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all"
                >
                  NT
                </button>
             </div>

             <button 
                onClick={() => router.push('/bible/search')}
                className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-whatsapp-teal transition-all"
             >
                <Search size={20} />
             </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10 pb-40">
        
        {/* NAVEGAÇÃO SUPERIOR - MAIS COMPACTA NO MOBILE */}
        <div className="flex items-center justify-between mb-8 md:mb-16 px-2">
           <button 
            disabled={selectedChapter === 1}
            onClick={() => setSelectedChapter(prev => prev - 1)}
            className="w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center bg-white dark:bg-white/5 text-gray-400 hover:text-whatsapp-teal hover:shadow-xl disabled:opacity-0 transition-all border border-gray-100 dark:border-white/5 shadow-sm"
           >
             <ChevronLeft size={20} className="md:w-6 md:h-6" />
           </button>

           <div className="flex flex-col items-center">
             <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-whatsapp-teal/60 mb-1 md:mb-2">Capítulo</span>
             <span className="text-3xl md:text-5xl font-black dark:text-white tracking-tighter">{selectedChapter}</span>
           </div>

           <button 
            disabled={selectedChapter === maxChapters}
            onClick={() => setSelectedChapter(prev => prev + 1)}
            className="w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center bg-white dark:bg-white/5 text-gray-400 hover:text-whatsapp-teal hover:shadow-xl disabled:opacity-0 transition-all border border-gray-100 dark:border-white/5 shadow-sm"
           >
             <ChevronRight size={20} className="md:w-6 md:h-6" />
           </button>
        </div>

        {/* TEXTO BÍBLICO */}
        <div className={cn(
          "space-y-8 md:space-y-12 transition-all duration-700",
          loading ? "opacity-20 blur-md scale-95" : "opacity-100 blur-0 scale-100"
        )}>
           {verses.length > 0 ? verses.map((verse) => (
             <div 
              id={`verse-${verse.number}`}
              key={verse.number} 
              className={cn(
                "group relative animate-in fade-in slide-in-from-bottom-6 duration-700",
                focusedVerse === verse.number && "ring-2 ring-whatsapp-teal ring-offset-8 dark:ring-offset-[#0A0A0A] rounded-[32px] transition-all duration-1000"
              )}
             >
                <div className={cn(
                  "flex gap-4 md:gap-8 p-4 rounded-[32px] transition-all",
                  !highlights[verse.number] && interactions[verse.number]?.length > 0 && "bg-whatsapp-teal/[0.03] dark:bg-whatsapp-teal/[0.05] border border-whatsapp-teal/10"
                )}
                style={highlights[verse.number] ? {
                  backgroundColor: HIGHLIGHT_COLORS.find(c => c.id === highlights[verse.number])?.bg,
                  border: `1px solid ${HIGHLIGHT_COLORS.find(c => c.id === highlights[verse.number])?.dot}30`
                } : undefined}
                >
                   <div className="pt-1.5 flex-shrink-0 flex flex-col items-center gap-2">
                       {focusedVerse === verse.number && (
                         <span className="text-[7px] font-black bg-whatsapp-teal text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter animate-bounce">Dia</span>
                       )}
                       <span className={cn(
                         "flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black transition-all border",
                        favorites[verse.number] 
                          ? "bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/30" 
                          : interactions[verse.number]?.length > 0
                             ? "bg-whatsapp-teal text-white border-whatsapp-teal shadow-lg shadow-whatsapp-teal/20"
                             : "bg-white dark:bg-white/5 text-whatsapp-teal/30 dark:text-white/20 border-gray-100 dark:border-white/5"
                      )}>
                        {verse.number}
                      </span>
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        {interactions[verse.number]?.length > 0 && (
                          <ScrollText className="w-4 h-4 text-whatsapp-teal mt-1 flex-shrink-0 opacity-60" />
                        )}
                        <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg md:text-xl font-medium tracking-tight transition-colors group-hover:text-black dark:group-hover:text-white font-outfit">
                          {verse.text}
                        </p>
                      </div>

                      {/* AÇÕES RESPONSIVAS */}
                      <div className="flex flex-wrap items-center gap-x-4 md:gap-x-6 gap-y-3 mt-5 md:mt-6 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all md:translate-y-2 md:group-hover:translate-y-0">
                         <button onClick={() => toggleFavorite(verse)} className={cn("flex items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest", favorites[verse.number] ? "text-amber-500" : "text-gray-400 hover:text-amber-500")}>
                           <Heart size={14} className={favorites[verse.number] ? "fill-current" : ""} />
                           <span className="hidden xs:inline">{favorites[verse.number] ? "Favorito" : "Favoritar"}</span>
                         </button>
                         <button onClick={() => { setCommentingVerse(verse); setTempComment(""); }} className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-emerald-500">
                           <Plus size={14} /> <span className="hidden xs:inline">Anotar</span>
                         </button>
                         <button onClick={() => createNoteFromVerse(verse)} className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-500">
                           <FileText size={14} /> <span className="hidden xs:inline">No Diário</span>
                         </button>
                         <button onClick={() => shareToFeed(verse)} className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-whatsapp-teal">
                           <Send size={14} /> <span className="hidden xs:inline">No Feed</span>
                         </button>
                         <button onClick={() => openCompare(verse)} className="flex items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-violet-500">
                           <Columns3 size={14} /> <span className="hidden xs:inline">Comparar</span>
                         </button>
                         <button 
                           onClick={() => setHighlightPickerVerse(highlightPickerVerse === verse.number ? null : verse.number)} 
                           className={cn(
                             "flex items-center gap-1.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest",
                             highlights[verse.number] ? "text-current" : "text-gray-400 hover:text-yellow-500"
                           )}
                           style={highlights[verse.number] ? { color: HIGHLIGHT_COLORS.find(c => c.id === highlights[verse.number])?.dot } : undefined}
                         >
                           <Highlighter size={14} /> <span className="hidden xs:inline">Marcar</span>
                         </button>
                       </div>

                       {/* PALETA DE CORES DO MARCA-TEXTO */}
                       {highlightPickerVerse === verse.number && (
                         <div className="flex items-center gap-2 mt-4 p-3 bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/10 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
                           <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mr-1">Cor:</span>
                           {HIGHLIGHT_COLORS.map(color => (
                             <button
                               key={color.id}
                               onClick={() => {
                                 if (highlights[verse.number] === color.id) {
                                   updateHighlight(verse, null);
                                 } else {
                                   updateHighlight(verse, color.id);
                                 }
                                 setHighlightPickerVerse(null);
                               }}
                               className={cn(
                                 "w-7 h-7 rounded-full transition-all hover:scale-125 flex items-center justify-center",
                                 highlights[verse.number] === color.id ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#1a1a1a] scale-110" : "hover:shadow-lg"
                               )}
                               style={{ 
                                 backgroundColor: color.dot,
                                 "--tw-ring-color": highlights[verse.number] === color.id ? color.dot : undefined
                               } as React.CSSProperties}
                               title={color.label}
                             >
                               {highlights[verse.number] === color.id && <Check size={12} className="text-white" />}
                             </button>
                           ))}
                           {/* Botão apagar */}
                           {highlights[verse.number] && (
                             <button
                               onClick={() => {
                                 updateHighlight(verse, null);
                                 setHighlightPickerVerse(null);
                               }}
                               className="w-7 h-7 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-500/20 transition-all hover:scale-110"
                               title="Remover destaque"
                             >
                               <Eraser size={12} className="text-gray-500" />
                             </button>
                           )}
                         </div>
                       )}
                   </div>
                </div>
             </div>
           )) : (
             !loading && (
               <div className="py-20 text-center space-y-4">
                  <div className="w-20 h-20 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-300">
                    <ScrollText className="w-10 h-10" />
                  </div>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Capítulo não disponível</p>
                  <button onClick={fetchChapter} className="text-whatsapp-teal font-black text-xs uppercase tracking-widest pt-2">Recarregar</button>
               </div>
             )
           )}
        </div>
      </div>

      {/* MODAL COMENTÁRIO - COM HISTÓRICO DE PÁGINAS */}
      {commentingVerse && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-[#111] w-full max-w-xl rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 border border-white/5 flex flex-col max-h-[90vh]">
              <div className="p-6 md:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between flex-shrink-0">
                 <div className="flex flex-col">
                    <h3 className="font-black dark:text-white uppercase tracking-widest text-xs">Minha Meditação</h3>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">Lendo de novo? Adicione uma nova página!</p>
                 </div>
                 <button onClick={() => setCommentingVerse(null)} className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center">
                   <X size={20} className="text-gray-400" />
                 </button>
              </div>
              
              <div className="p-6 md:p-8 overflow-y-auto space-y-8">
                 {/* VERSE INFO */}
                 <div className="p-5 bg-whatsapp-teal/5 dark:bg-whatsapp-teal/10 rounded-3xl border border-whatsapp-teal/10">
                    <p className="text-[10px] font-black text-whatsapp-teal uppercase tracking-widest mb-2">{selectedBookName} {selectedChapter}:{commentingVerse.number}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic font-medium leading-relaxed">"{commentingVerse.text}"</p>
                 </div>

                 {/* AGORA - NOVA ANOTAÇÃO */}
                 <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-whatsapp-teal animate-pulse" />
                       <span className="text-[10px] font-black uppercase tracking-widest text-whatsapp-teal">Nova Página - {moment().format('DD [de] MMMM')}</span>
                    </div>
                    <textarea 
                      placeholder="O que essa passagem falou ao seu coração hoje?"
                      value={tempComment}
                      onChange={(e) => setTempComment(e.target.value)}
                      className="w-full bg-transparent text-xl font-medium outline-none min-h-[120px] resize-none dark:text-white placeholder:text-gray-300"
                      autoFocus
                    />
                 </div>

                 {/* HISTÓRICO DE REVELAÇÕES */}
                 {(interactions[commentingVerse.number]?.length || 0) > 0 && (
                   <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-white/5">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Páginas Anteriores</h4>
                      <div className="space-y-4">
                        {interactions[commentingVerse.number].map((note, idx) => (
                          <div key={note.id || idx} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                             <p className="text-[9px] font-black text-gray-400 uppercase mb-2">Página de {moment(note.created_at).format('LL')}</p>
                             <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed font-medium">{note.comment}</p>
                          </div>
                        ))}
                      </div>
                   </div>
                 )}
              </div>

              <div className="p-6 md:p-8 pt-0 flex-shrink-0">
                 <button onClick={saveComment} className="w-full py-5 bg-whatsapp-teal text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-whatsapp-teal/30 hover:scale-[1.02] active:scale-95 transition-all">
                   Guardar Anotação de Hoje
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL COMPARAÇÃO DE VERSÕES */}
      {compareVerse && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
           <div className="bg-white dark:bg-[#111] w-full max-w-3xl rounded-[40px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 border border-white/5 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-6 md:p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between flex-shrink-0">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
                       <Columns3 size={22} />
                    </div>
                    <div>
                       <h3 className="font-black dark:text-white text-base">{selectedBookName} {selectedChapter}:{compareVerse.number}</h3>
                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Comparar Versões</p>
                    </div>
                 </div>
                 <button onClick={() => setCompareVerse(null)} className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                   <X size={20} className="text-gray-400" />
                 </button>
              </div>

              {/* Conteúdo */}
              <div className="p-6 md:p-8 overflow-y-auto space-y-5">
                 {compareLoading ? (
                   <div className="flex flex-col items-center justify-center py-16 gap-4">
                     <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
                     <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Carregando versões...</p>
                   </div>
                 ) : (
                   BIBLE_VERSIONS.map((version, idx) => (
                     <div 
                       key={version.id}
                       className="relative p-6 rounded-[28px] border transition-all animate-in fade-in slide-in-from-bottom-4 duration-500"
                       style={{ 
                         animationDelay: `${idx * 100}ms`,
                         borderColor: `${version.color}20`,
                         backgroundColor: `${version.color}05`
                       }}
                     >
                       {/* Version label */}
                       <div className="flex items-center gap-3 mb-4">
                         <span 
                           className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white"
                           style={{ backgroundColor: version.color }}
                         >
                           {version.name}
                         </span>
                         <span className="text-[10px] text-gray-400 font-bold">{version.label}</span>
                       </div>

                       {/* Verse text */}
                       <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-base md:text-lg font-medium tracking-tight">
                         {compareData[version.id] || (
                           <span className="text-gray-400 italic text-sm">Versículo não disponível nesta versão</span>
                         )}
                       </p>

                       {/* Active indicator */}
                       {selectedVersion.id === version.id && (
                         <div className="absolute top-4 right-4 flex items-center gap-1.5">
                           <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: version.color }} />
                           <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: version.color }}>Atual</span>
                         </div>
                       )}
                     </div>
                   ))
                 )}
              </div>

              {/* Footer */}
              <div className="p-6 md:p-8 pt-0 flex-shrink-0">
                 <div className="flex gap-3">
                   <button 
                     onClick={() => { 
                       const allTexts = BIBLE_VERSIONS.map(v => 
                         `📖 ${v.name} — ${selectedBookName} ${selectedChapter}:${compareVerse.number}\n"${compareData[v.id] || 'N/A'}"`
                       ).join('\n\n');
                       navigator.clipboard.writeText(allTexts);
                       toast.success("Comparação copiada! 📋");
                     }}
                     className="flex-1 py-4 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-violet-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                   >
                     Copiar Todas as Versões
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* SELETOR DE LIVROS */}
      {showSelector && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-[#0A0A0A] animate-in slide-in-from-bottom duration-500">
           <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-inherit z-10">
              <div className="flex items-center gap-4">
                 <button onClick={() => setShowSelector(false)} className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5">
                   <ChevronLeft size={24} className="dark:text-white" />
                 </button>
                 <h2 className="text-2xl font-black dark:text-white">
                   {selectorStep === 'books' ? "Escrituras" : `${selectedBookName}`}
                 </h2>
              </div>
              {selectorStep === 'chapters' && (
                <button onClick={() => setSelectorStep('books')} className="text-xs font-black uppercase text-whatsapp-teal">Voltar</button>
              )}
           </div>

           {selectorStep === 'books' ? (
             <>
               <div className="p-4 bg-gray-50 dark:bg-[#0E0E0E] sticky top-[89px] z-10 border-b border-gray-100 dark:border-white/5">
                   <div className="relative max-w-2xl mx-auto">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input placeholder="Buscar livro..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white dark:bg-black p-5 pl-14 rounded-[24px] outline-none shadow-sm dark:text-white font-bold" />
                   </div>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-12 pb-20">
                   <div className="max-w-4xl mx-auto">
                      <div className="flex items-center gap-3 mb-8 px-2 border-l-4 border-gray-200 dark:border-white/10 pl-4">
                         <span className={cn(
                           "text-[10px] font-black uppercase tracking-[0.5em]",
                           activeTestamentTab === 'VT' ? "text-whatsapp-teal" : "text-amber-500"
                         )}>
                           {activeTestamentTab === 'VT' ? "Antigo Testamento" : "Novo Testamento"}
                         </span>
                      </div>

                      <div key={activeTestamentTab} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {activeTestamentTab === 'VT' ? (
                          vtBooks.map(book => (
                            <button key={book.abbrev} onClick={() => { setSelectedBook(book.abbrev); setSelectedBookName(book.name); setMaxChapters(book.chapters); setSelectorStep('chapters'); }} className="p-6 rounded-[32px] border border-gray-100 dark:border-white/5 bg-white dark:bg-white/5 text-left hover:border-whatsapp-teal transition-all group shadow-sm">
                               <span className="text-sm font-black dark:text-white group-hover:text-whatsapp-teal">{book.name}</span>
                               <span className="text-[10px] text-gray-400 block mt-1 uppercase tracking-widest">{book.chapters} CH</span>
                            </button>
                          ))
                        ) : (
                          ntBooks.map(book => (
                            <button key={book.abbrev} onClick={() => { setSelectedBook(book.abbrev); setSelectedBookName(book.name); setMaxChapters(book.chapters); setSelectorStep('chapters'); }} className="p-6 rounded-[32px] border border-amber-500/10 bg-amber-500/[0.03] text-left hover:border-amber-500 transition-all group">
                               <span className="text-sm font-black dark:text-white group-hover:text-amber-500">{book.name}</span>
                               <span className="text-[10px] text-amber-600/60 block mt-1 uppercase tracking-widest">{book.chapters} CH</span>
                            </button>
                          ))
                        )}
                      </div>
                   </div>
               </div>
             </>
           ) : (
             <div className="flex-1 overflow-y-auto p-10 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 max-w-4xl mx-auto pb-40">
                {Array.from({ length: maxChapters }, (_, i) => i + 1).map(num => (
                  <button key={num} onClick={() => { setSelectedChapter(num); setShowSelector(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={cn("w-16 h-16 rounded-[24px] flex items-center justify-center text-lg font-black transition-all border", selectedChapter === num ? "bg-whatsapp-teal text-white border-whatsapp-teal shadow-xl shadow-whatsapp-teal/30 scale-110" : "bg-white dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/5 hover:border-whatsapp-teal")}>
                    {num}
                  </button>
                ))}
             </div>
           )}
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[100] bg-white/10 backdrop-blur-[2px]">
           <div className="w-16 h-16 border-4 border-whatsapp-teal/20 border-t-whatsapp-teal rounded-full animate-spin" />
        </div>
      )}

    </div>
  );
}
