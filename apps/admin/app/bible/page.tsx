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
  { id: "aa", name: "AA", label: "Almeida Atualizada", color: "#f59e0b" },
  { id: "acf", name: "ACF", label: "Almeida Corrigida Fiel", color: "#6366f1" },
];

const bibleCache: Record<string, any> = {};

const HIGHLIGHT_COLORS = [
  { id: "yellow", bg: "rgba(250, 204, 21, 0.25)", bgDark: "rgba(250, 204, 21, 0.15)", dot: "#facc15", label: "Amarelo" },
  { id: "green", bg: "rgba(34, 197, 94, 0.20)", bgDark: "rgba(34, 197, 94, 0.12)", dot: "#22c55e", label: "Verde" },
  { id: "blue", bg: "rgba(59, 130, 246, 0.20)", bgDark: "rgba(59, 130, 246, 0.12)", dot: "#3b82f6", label: "Azul" },
  { id: "pink", bg: "rgba(236, 72, 153, 0.20)", bgDark: "rgba(236, 72, 153, 0.12)", dot: "#ec4899", label: "Rosa" },
  { id: "orange", bg: "rgba(249, 115, 22, 0.20)", bgDark: "rgba(249, 115, 22, 0.12)", dot: "#f97316", label: "Laranja" },
  { id: "purple", bg: "rgba(139, 92, 246, 0.20)", bgDark: "rgba(139, 92, 246, 0.12)", dot: "#8b5cf6", label: "Roxo" },
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

  const [isStudying, setIsStudying] = useState(false);
  const [aiStudyResult, setAiStudyResult] = useState<string | null>(null);
  const [studyVerse, setStudyVerse] = useState<Verse | null>(null);
  const [aiOperational, setAiOperational] = useState(false);

  const [highlights, setHighlights] = useState<Record<number, string>>({});
  const [highlightPickerVerse, setHighlightPickerVerse] = useState<number | null>(null);

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
      const data = await fetchChapter();
      if (!cancelled && data) {
        setVerses(data);
        await new Promise(r => setTimeout(r, 100));
        if (!cancelled) fetchInteractions();
      }
    }
    loadData();
    checkAIStatus();
    return () => { cancelled = true; };
  }, [selectedBook, selectedChapter, selectedVersion]);

  async function checkAIStatus() {
    try {
      const res = await fetch('/api/ai/bible-study');
      const data = await res.json();
      setAiOperational(!!data.operational);
    } catch (err) {
      setAiOperational(false);
    }
  }

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

  async function fetchChapter() {
    try {
      setLoading(true);
      const book = BIBLE_BOOKS.find(b => b.abbrev === selectedBook);
      if (!book) return;
      if (!bibleCache[selectedVersion.id]) {
        const res = await fetch(`/bible/${selectedVersion.id}.json`);
        if (!res.ok) throw new Error(`Falha ao carregar versão ${selectedVersion.name}`);
        bibleCache[selectedVersion.id] = await res.json();
      }
      const bookData = bibleCache[selectedVersion.id].find((b: any) => b.abbrev === selectedBook || b.name === selectedBookName);
      if (bookData && bookData.chapters[selectedChapter - 1]) {
        return bookData.chapters[selectedChapter - 1].map((v: string, index: number) => ({
          number: index + 1,
          text: v
        }));
      }
      return [];
    } catch (error) {
      console.error("Erro ao carregar capítulos:", error);
      return null;
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
      const { data, error } = await supabase.from("bible_interactions")
        .select("*").eq("user_id", session.user.id).eq("book_abbrev", selectedBook).eq("chapter", selectedChapter);
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
    } catch (error) { }
  }

  async function toggleFavorite(verse: Verse) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const newState = !favorites[verse.number];
      const { error } = await supabase.from("bible_interactions").upsert({
        user_id: session.user.id, book_abbrev: selectedBook, book_name: selectedBookName,
        chapter: selectedChapter, verse_number: verse.number, verse_text: verse.text, is_favorite: newState
      }, { onConflict: 'user_id,book_abbrev,chapter,verse_number' });
      if (error) throw error;
      setFavorites({ ...favorites, [verse.number]: newState });
      toast.success(newState ? "Favoritado! ❤️" : "Removido");
    } catch (error) { toast.error("Erro ao favoritar"); }
  }

  async function updateHighlight(verse: Verse, color: string | null) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      await supabase.from("bible_interactions").upsert({
        user_id: session.user.id, book_abbrev: selectedBook, book_name: selectedBookName,
        chapter: selectedChapter, verse_number: verse.number, verse_text: verse.text, highlight_color: color
      }, { onConflict: 'user_id,book_abbrev,chapter,verse_number' });
      const newHighlights = { ...highlights };
      if (color) newHighlights[verse.number] = color; else delete newHighlights[verse.number];
      setHighlights(newHighlights);
    } catch (error) { toast.error("Erro ao salvar marcação"); }
  }

  async function saveComment() {
    if (!commentingVerse || !tempComment.trim()) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data, error } = await supabase.from("bible_interactions").upsert({
        user_id: session.user.id, book_abbrev: selectedBook, book_name: selectedBookName,
        chapter: selectedChapter, verse_number: commentingVerse.number, verse_text: commentingVerse.text,
        comment: tempComment, created_at: new Date().toISOString()
      }, { onConflict: 'user_id,book_abbrev,chapter,verse_number' }).select().single();
      if (error) throw error;
      const currentNotes = interactions[commentingVerse.number] || [];
      setInteractions({ ...interactions, [commentingVerse.number]: [data, ...currentNotes] });
      toast.success("Anotação salva! 📖"); setCommentingVerse(null); setTempComment("");
    } catch (error) { toast.error("Erro ao salvar anotação"); }
  }

  function createNoteFromVerse(verse: Verse) {
    const history = interactions[verse.number] || [];
    const content = `📖 Versículo: ${selectedBookName} ${selectedChapter}:${verse.number}\n"${verse.text}"\n\n💭 Reflexão: `;
    localStorage.setItem("prefill_note", content); router.push("/notes");
  }

  async function shareToFeed(verse: Verse) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const postContent = `📖 ${selectedBookName} ${selectedChapter}:${verse.number}\n"${verse.text}"`;
      const { error } = await supabase.from("posts").insert({ author_id: user.id, user_id: user.id, content: postContent, post_type: 'text' });
      if (error) throw error;
      toast.success("Publicado no Feed! 🙌");
    } catch (error) { toast.error("Erro ao compartilhar"); }
  }

  async function handleAIStudy(verse: Verse) {
    setIsStudying(true); setStudyVerse(verse); setAiStudyResult(null);
    try {
      const res = await fetch('/api/ai/bible-study', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verse: verse.text, book: selectedBookName, chapter: selectedChapter, verseNumber: verse.number, version: selectedVersion.name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.details || data.error || "Falha na API");
      setAiStudyResult(data.study);
    } catch (error: any) {
      toast.error(`Erro Teológico: ${error.message}`);
      setStudyVerse(null);
    } finally { setIsStudying(false); }
  }

  async function openCompare(verse: Verse) {
    setCompareData({});
    for (const version of BIBLE_VERSIONS) {
      if (!bibleCache[version.id]) {
        const res = await fetch(`/bible/${version.id}.json`);
        if (res.ok) bibleCache[version.id] = await res.json();
      }
      const bookData = bibleCache[version.id]?.find((b: any) => b.abbrev === selectedBook);
      if (bookData?.chapters[selectedChapter - 1]) {
        setCompareData(prev => ({ ...prev, [version.id]: bookData.chapters[selectedChapter - 1][verse.number - 1] }));
      }
    }
  }

  const vtBooks = useMemo(() => BIBLE_BOOKS.filter(b => b.testament === "VT" && b.name.toLowerCase().includes(searchQuery.toLowerCase())), [searchQuery]);
  const ntBooks = useMemo(() => BIBLE_BOOKS.filter(b => b.testament === "NT" && b.name.toLowerCase().includes(searchQuery.toLowerCase())), [searchQuery]);

  const [compareVerse, setCompareVerse] = useState<Verse | null>(null);
  const [compareData, setCompareData] = useState<Record<string, string>>({});

  return (
    <div className="min-h-screen bg-[#FDFDFD] dark:bg-[#0A0A0A] font-inter">
      <div className="sticky top-0 z-[60] bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-whatsapp-teal/10 flex items-center justify-center text-whatsapp-teal"><BookOpen className="w-6 h-6" /></div>
            <button onClick={() => { setSelectorStep('books'); setShowSelector(true); }} className="text-lg font-black dark:text-white flex items-center gap-1 hover:text-whatsapp-teal transition-colors">
              {selectedBookName} {selectedChapter} <ChevronDown size={18} className="ml-1 opacity-50" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowVersionPicker(v => !v)} className="px-3 py-2 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border" style={{ color: selectedVersion.color, borderColor: `${selectedVersion.color}30`, backgroundColor: `${selectedVersion.color}10` }}>
              {selectedVersion.name}
            </button>
            {showVersionPicker && (
              <div className="absolute right-20 top-full mt-2 z-50 bg-white dark:bg-[#111] rounded-[24px] shadow-2xl border border-gray-100 dark:border-white/10 min-w-[200px]">
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

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10 pb-40">
        <div className="flex items-center justify-between mb-8 md:mb-16 px-2">
          <button disabled={selectedChapter === 1} onClick={() => setSelectedChapter(prev => prev - 1)} className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-white/5 text-gray-400 hover:text-whatsapp-teal disabled:opacity-0 transition-all border"><ChevronLeft /></button>
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-whatsapp-teal/60 mb-2">Capítulo</span>
            <span className="text-3xl font-black dark:text-white">{selectedChapter}</span>
          </div>
          <button disabled={selectedChapter === maxChapters} onClick={() => setSelectedChapter(prev => prev + 1)} className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-white/5 text-gray-400 hover:text-whatsapp-teal disabled:opacity-0 transition-all border"><ChevronRight /></button>
        </div>

        <div className={cn("space-y-8 transition-all", loading ? "opacity-20 blur-md" : "opacity-100")}>
          {verses.map((verse) => (
            <div id={`verse-${verse.number}`} key={verse.number} className="group relative">
              <div className={cn("flex gap-4 p-4 rounded-[32px] transition-all", favorites[verse.number] && "bg-amber-500/5")} style={highlights[verse.number] ? { backgroundColor: HIGHLIGHT_COLORS.find(c => c.id === highlights[verse.number])?.bg } : undefined}>
                <div className="pt-1.5 shrink-0 flex flex-col items-center gap-2">
                  <span className={cn("flex items-center justify-center w-8 h-8 rounded-xl text-[10px] font-black border", favorites[verse.number] ? "bg-amber-500 text-white" : "bg-white dark:bg-white/5 text-whatsapp-teal/30")}>{verse.number}</span>
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg font-medium font-outfit">{verse.text}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => toggleFavorite(verse)} className={cn("text-[9px] font-black uppercase transition-all", favorites[verse.number] ? "text-amber-500 scale-110" : "text-gray-400 hover:text-amber-500")}>
                      <Heart size={14} className={favorites[verse.number] ? "fill-current" : ""} />
                    </button>
                    <button onClick={() => setCommentingVerse(verse)} className="text-[9px] font-black uppercase text-gray-400 hover:text-emerald-500 transition-all hover:scale-110">
                      <Plus size={14} />
                    </button>
                    <button onClick={() => createNoteFromVerse(verse)} className="text-[9px] font-black uppercase text-gray-400 hover:text-blue-500 transition-all hover:scale-110">
                      <FileText size={14} />
                    </button>
                    <button onClick={() => shareToFeed(verse)} className="text-[9px] font-black uppercase text-gray-400 hover:text-whatsapp-teal transition-all hover:scale-110">
                      <Send size={14} />
                    </button>
                    {aiOperational && (
                      <button onClick={() => handleAIStudy(verse)} className="text-[9px] font-black uppercase text-whatsapp-teal animate-in fade-in duration-1000 transition-all hover:scale-110">
                        <Sparkles size={14} className="fill-whatsapp-teal/20" />
                      </button>
                    )}
                    <button onClick={() => { setCompareVerse(verse); openCompare(verse); }} className="text-[9px] font-black uppercase text-gray-400 hover:text-violet-500 transition-all hover:scale-110">
                      <Columns3 size={14} />
                    </button>
                    <button onClick={() => setHighlightPickerVerse(verse.number)} className="text-[9px] font-black uppercase text-gray-400 hover:text-yellow-500 transition-all hover:scale-110">
                      <Highlighter size={14} />
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
              <X onClick={() => { setAiStudyResult(null); setIsStudying(false); }} className="cursor-pointer text-gray-400" />
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
                    console.log("🚀 INICIANDO EXPORTAÇÃO PARA DIÁRIO...");
                    const content = `📖 Versículo: ${selectedBookName} ${selectedChapter}:${studyVerse?.number}\n"${studyVerse?.text}"\n\n${aiStudyResult}`;
                    const title = `Estudo: ${selectedBookName} ${selectedChapter}:${studyVerse?.number}`;
                    const tags = `EstudoIA,${selectedBookName}`;

                    console.log("📦 PAYLOAD:", { title, tags, contentLength: content.length });

                    try {
                      localStorage.setItem("prefill_note", content); 
                      localStorage.setItem("prefill_title", title);
                      localStorage.setItem("prefill_tags", tags);
                      console.log("✅ LOCALSTORAGE SINCRONIZADO. FORÇANDO NAVEGAÇÃO REAL...");
                      window.location.href = "/notes"; 
                    } catch (e) {
                      console.error("❌ ERRO NO LOCALSTORAGE:", e);
                      toast.error("Falha ao preparar o diário. Limpe o cache do navegador.");
                    }
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
        <div className="fixed inset-0 z-[100] bg-white dark:bg-[#0A0A0A] p-6 flex flex-col pt-20">
          <X className="absolute top-6 right-6 cursor-pointer" onClick={() => setShowSelector(false)} />
          {selectorStep === 'books' ? (
            <div className="grid grid-cols-2 gap-2 overflow-y-auto">
              {BIBLE_BOOKS.map(b => <button key={b.abbrev} onClick={() => { setSelectedBook(b.abbrev); setSelectedBookName(b.name); setMaxChapters(b.chapters); setSelectorStep('chapters'); }} className="p-4 border rounded-2xl text-left dark:text-white font-bold">{b.name}</button>)}
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-2 overflow-y-auto">
              {Array.from({ length: maxChapters }, (_, i) => i + 1).map(num => <button key={num} onClick={() => { setSelectedChapter(num); setShowSelector(false); }} className="w-12 h-12 border rounded-xl dark:text-white font-black">{num}</button>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
