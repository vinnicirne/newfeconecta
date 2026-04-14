"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Search, BookOpen, ChevronRight, ChevronLeft, 
  MessageCircle, Heart, Send, ScrollText,
  X, FileText, ChevronDown, Sparkles, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import moment from "moment";
import "moment/locale/pt-br";

moment.locale("pt-br");

// MAPA DE TRADUÇÃO PARA BIBLE-API.COM (Nomes em Inglês para URL)
const BOOK_URL_NAMES: Record<string, string> = {
  "gn": "genesis", "ex": "exodus", "lv": "leviticus", "nm": "numbers", "dt": "deuteronomy",
  "js": "joshua", "jz": "judges", "rt": "ruth", "1sm": "1samuel", "2sm": "2samuel",
  "1rs": "1kings", "2rs": "2kings", "1cr": "1chronicles", "2cr": "2chronicles",
  "ez": "ezra", "ne": "nehemiah", "et": "esther", "jo": "job", "sl": "psalms",
  "pv": "proverbs", "ec": "ecclesiastes", "ct": "songofsolomon", "is": "isaiah",
  "jr": "jeremiah", "lm": "lamentations", "eze": "ezekiel", "dn": "daniel",
  "os": "hosea", "jl": "joel", "am": "amos", "ob": "obadiah", "jn": "jonah",
  "mq": "micah", "na": "nahum", "hc": "habakkuk", "sf": "zephaniah", "ag": "haggai",
  "zc": "zechariah", "ml": "malachi",
  "mt": "matthew", "mc": "mark", "lc": "lucas", "joo": "john", "at": "acts",
  "rm": "romans", "1co": "1corinthians", "2co": "2corinthians", "gl": "galatians",
  "ef": "ephesians", "fp": "philippians", "cl": "colossians", "1ts": "1thessalonians",
  "2ts": "2thessalonians", "1tm": "1timothy", "2tm": "2timothy", "tt": "titus",
  "fm": "philemon", "hb": "hebrews", "tg": "james", "1pe": "1peter", "2pe": "2peter",
  "1jo": "1john", "2jo": "2john", "3jo": "3john", "jd": "jude", "ap": "revelation"
};

const BIBLE_BOOKS = [
  { name: "Gênesis", abbrev: "gn", chapters: 50, testament: "VT" },
  { name: "Êxodo", abbrev: "ex", chapters: 40, testament: "VT" },
  { name: "Levítico", abbrev: "lv", chapters: 27, testament: "VT" },
  { name: "Números", abbrev: "nm", chapters: 36, testament: "VT" },
  { name: "Deuteronômio", abbrev: "dt", chapters: 34, testament: "VT" },
  { name: "Josué", abbrev: "js", chapters: 24, testament: "VT" },
  { name: "Juízes", abbrev: "jz", chapters: 21, testament: "VT" },
  { name: "Rute", abbrev: "rt", chapters: 4, testament: "VT" },
  { name: "1 Samuel", abbrev: "1sm", chapters: 31, testament: "VT" },
  { name: "2 Samuel", abbrev: "2sm", chapters: 24, testament: "VT" },
  { name: "1 Reis", abbrev: "1rs", chapters: 22, testament: "VT" },
  { name: "2 Reis", abbrev: "2rs", chapters: 25, testament: "VT" },
  { name: "1 Crônicas", abbrev: "1cr", chapters: 29, testament: "VT" },
  { name: "2 Crônicas", abbrev: "2cr", chapters: 36, testament: "VT" },
  { name: "Esdras", abbrev: "ez", chapters: 10, testament: "VT" },
  { name: "Neemias", abbrev: "ne", chapters: 13, testament: "VT" },
  { name: "Ester", abbrev: "et", chapters: 10, testament: "VT" },
  { name: "Jó", abbrev: "jo", chapters: 42, testament: "VT" },
  { name: "Salmos", abbrev: "sl", chapters: 150, testament: "VT" },
  { name: "Provérbios", abbrev: "pv", chapters: 31, testament: "VT" },
  { name: "Eclesiastes", abbrev: "ec", chapters: 12, testament: "VT" },
  { name: "Cânticos", abbrev: "ct", chapters: 8, testament: "VT" },
  { name: "Isaías", abbrev: "is", chapters: 66, testament: "VT" },
  { name: "Jeremias", abbrev: "jr", chapters: 52, testament: "VT" },
  { name: "Lamentações", abbrev: "lm", chapters: 5, testament: "VT" },
  { name: "Ezequiel", abbrev: "eze", chapters: 48, testament: "VT" },
  { name: "Daniel", abbrev: "dn", chapters: 12, testament: "VT" },
  { name: "Oséias", abbrev: "os", chapters: 14, testament: "VT" },
  { name: "Joel", abbrev: "jl", chapters: 3, testament: "VT" },
  { name: "Amós", abbrev: "am", chapters: 9, testament: "VT" },
  { name: "Obadias", abbrev: "ob", chapters: 1, testament: "VT" },
  { name: "Jonas", abbrev: "jn", chapters: 4, testament: "VT" },
  { name: "Miquéias", abbrev: "mq", chapters: 7, testament: "VT" },
  { name: "Naum", abbrev: "na", chapters: 3, testament: "VT" },
  { name: "Habacuque", abbrev: "hc", chapters: 3, testament: "VT" },
  { name: "Sofonias", abbrev: "sf", chapters: 3, testament: "VT" },
  { name: "Ageu", abbrev: "ag", chapters: 2, testament: "VT" },
  { name: "Zacarias", abbrev: "zc", chapters: 14, testament: "VT" },
  { name: "Malaquias", abbrev: "ml", chapters: 4, testament: "VT" },
  { name: "Mateus", abbrev: "mt", chapters: 28, testament: "NT" },
  { name: "Marcos", abbrev: "mc", chapters: 16, testament: "NT" },
  { name: "Lucas", abbrev: "lc", chapters: 24, testament: "NT" },
  { name: "João", abbrev: "joo", chapters: 21, testament: "NT" },
  { name: "Atos", abbrev: "at", chapters: 28, testament: "NT" },
  { name: "Romanos", abbrev: "rm", chapters: 16, testament: "NT" },
  { name: "1 Coríntios", abbrev: "1co", chapters: 16, testament: "NT" },
  { name: "2 Coríntios", abbrev: "2co", chapters: 13, testament: "NT" },
  { name: "Gálatas", abbrev: "gl", chapters: 6, testament: "NT" },
  { name: "Efésios", abbrev: "ef", chapters: 6, testament: "NT" },
  { name: "Filipenses", abbrev: "fp", chapters: 4, testament: "NT" },
  { name: "Colossenses", abbrev: "cl", chapters: 4, testament: "NT" },
  { name: "1 Tessalonicenses", abbrev: "1ts", chapters: 5, testament: "NT" },
  { name: "2 Tessalonicenses", abbrev: "2ts", chapters: 3, testament: "NT" },
  { name: "1 Timóteo", abbrev: "1tm", chapters: 6, testament: "NT" },
  { name: "2 Timóteo", abbrev: "2tm", chapters: 4, testament: "NT" },
  { name: "Tito", abbrev: "tt", chapters: 3, testament: "NT" },
  { name: "Filemom", abbrev: "fm", chapters: 1, testament: "NT" },
  { name: "Hebreus", abbrev: "hb", chapters: 13, testament: "NT" },
  { name: "Tiago", abbrev: "tg", chapters: 5, testament: "NT" },
  { name: "1 Pedro", abbrev: "1pe", chapters: 5, testament: "NT" },
  { name: "2 Pedro", abbrev: "2pe", chapters: 3, testament: "NT" },
  { name: "1 João", abbrev: "1jo", chapters: 5, testament: "NT" },
  { name: "2 João", abbrev: "2jo", chapters: 1, testament: "NT" },
  { name: "3 João", abbrev: "3jo", chapters: 1, testament: "NT" },
  { name: "Judas", abbrev: "jd", chapters: 1, testament: "NT" },
  { name: "Apocalipse", abbrev: "ap", chapters: 22, testament: "NT" },
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
  
  const [showSelector, setShowSelector] = useState(false);
  const [selectorStep, setSelectorStep] = useState<'books' | 'chapters'>('books');
  const [activeTestamentTab, setActiveTestamentTab] = useState<'VT' | 'NT'>('VT');
  const [searchQuery, setSearchQuery] = useState("");

  // A bible-api.com só tem a versão 'almeida' em PT
  const selectedVersion = "almeida";

  useEffect(() => {
    fetchChapter();
    fetchInteractions();
  }, [selectedBook, selectedChapter]);

  // Handle URL pre-fill for "Verse of the Day"
  useEffect(() => {
    const prefill = searchParams.get('verse'); // format sl23:1
    if (prefill) {
      const match = prefill.match(/([a-z]+)(\d+)(?::(\d+))?/);
      if (match) {
        const abbrev = match[1];
        const chapter = parseInt(match[2]);
        const book = BIBLE_BOOKS.find(b => b.abbrev === abbrev);
        if (book) {
          setSelectedBook(abbrev);
          setSelectedBookName(book.name);
          setSelectedChapter(chapter);
          setMaxChapters(book.chapters);
        }
      }
    }
  }, [searchParams]);

  async function fetchChapter() {
    try {
      setLoading(true);
      // MAPPING PARA URL (Ex: gn -> genesis)
      const apiBookName = BOOK_URL_NAMES[selectedBook] || selectedBook;
      
      // NOVA URL: bible-api.com
      const url = `https://bible-api.com/${apiBookName}+${selectedChapter}?translation=${selectedVersion}`;
      const response = await fetch(url);
      
      if (!response.ok) throw new Error("API Offline");
      
      const data = await response.json();
      if (data.verses) {
        // Adaptando o formato da bible-api (verse -> number)
        const mappedVerses = data.verses.map((v: any) => ({
          number: v.verse,
          text: v.text
        }));
        setVerses(mappedVerses);
      }
    } catch (error) {
      console.error("Erro na busca:", error);
      // Removido toast de erro para não poluir a experiência do usuário
    } finally {
      setLoading(false);
    }
  }

  const [interactions, setInteractions] = useState<Record<string, Interaction[]>>({});
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [commentingVerse, setCommentingVerse] = useState<Verse | null>(null);
  const [tempComment, setTempComment] = useState("");

  async function fetchInteractions() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("bible_interactions")
      .select("*")
      .eq("user_id", user.id)
      .eq("book_abbrev", selectedBook)
      .eq("chapter", selectedChapter)
      .order("created_at", { ascending: false });

    if (data) {
      const notesMap: Record<string, Interaction[]> = {};
      const favsMap: Record<string, boolean> = {};
      
      data.forEach(i => {
        if (i.comment) {
          if (!notesMap[i.verse_number]) notesMap[i.verse_number] = [];
          notesMap[i.verse_number].push(i);
        }
        if (i.is_favorite) favsMap[i.verse_number] = true;
      });
      
      setInteractions(notesMap);
      setFavorites(favsMap);
    }
  }

  async function toggleFavorite(verse: Verse) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const newState = !favorites[verse.number];
      
      // Para favoritos, mantemos a lógica de um único registro ou atualizamos o mais recente
      const { error } = await supabase.from("bible_interactions").upsert({
        user_id: user.id,
        book_abbrev: selectedBook,
        book_name: selectedBookName,
        chapter: selectedChapter,
        verse_number: verse.number,
        verse_text: verse.text,
        is_favorite: newState
      }, { onConflict: 'user_id,book_abbrev,chapter,verse_number' }); // Tenta upsert se o constraint ainda existir
      
      if (error) {
        // Se falhar por causa da remoção do constraint, fazemos um insert simples
        await supabase.from("bible_interactions").insert({
          user_id: user.id,
          book_abbrev: selectedBook,
          book_name: selectedBookName,
          chapter: selectedChapter,
          verse_number: verse.number,
          verse_text: verse.text,
          is_favorite: newState
        });
      }

      setFavorites({ ...favorites, [verse.number]: newState });
      toast.success(newState ? "Favoritado! ❤️" : "Removido");
    } catch (error) { toast.error("Erro ao favoritar"); }
  }

  async function saveComment() {
    if (!commentingVerse || !tempComment.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.from("bible_interactions").insert({
        user_id: user.id,
        book_abbrev: selectedBook,
        book_name: selectedBookName,
        chapter: selectedChapter,
        verse_number: commentingVerse.number,
        verse_text: commentingVerse.text,
        comment: tempComment,
        created_at: new Date().toISOString()
      }).select().single();

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
                   // Decide qual tab abrir baseado no livro atual
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
             <div className="hidden sm:block px-3 py-1 bg-gray-50 dark:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 line-clamp-1">
               Versão Almeida
             </div>
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
             <div key={verse.number} className="group relative animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className={cn(
                  "flex gap-4 md:gap-8 p-4 rounded-[32px] transition-all",
                  interactions[verse.number]?.length > 0 && "bg-whatsapp-teal/[0.03] dark:bg-whatsapp-teal/[0.05] border border-whatsapp-teal/10"
                )}>
                   <div className="pt-1.5 flex-shrink-0">
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
                      </div>
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
