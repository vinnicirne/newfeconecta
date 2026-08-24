"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Star, Plus, Trash2, Globe, Lock, Search, 
  BookOpen, Feather, Sparkles, Share2, List,
  Edit3, Bookmark, RotateCcw, Check, Tag, Hash, X,
  Calendar, Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useNotes } from "@/hooks/useNotes";
import { BIBLE_BOOKS } from "@/lib/bible-data";
import Link from "next/link";
import BottomNav from "@/components/feed/BottomNav";

interface Note {
  id: string;
  title: string;
  content: string;
  is_public: boolean;
  is_favorite: boolean;
  type: 'note' | 'devotional';
  tags: string[];
  created_at: string;
}

export default function NotesPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Parser de Referências Bíblicas
  const renderNoteContent = (content: string) => {
    if (!content) return null;
    const regex = /((?:[1-3]\s*)?[A-ZÇÃÉÍÓÚÔÊa-zçãéíóúôê]+)\.?\s*(\d+):(\d+(?:-\d+)?)/gi;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      
      const fullMatch = match[0];
      const bookStr = match[1].trim();
      const chapter = match[2];
      const verse = match[3];

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
      
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return <>{parts}</>;
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUser(user);
    };
    initAuth();
  }, []);

  const [filter, setFilter] = useState<'all' | 'favorites' | 'public'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Estado do Editor
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isDevotional, setIsDevotional] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  const { 
    notes, 
    isLoading: loading, 
    saveNote, 
    deleteNote: deleteNoteHook, 
    toggleFavorite: toggleFavoriteHook 
  } = useNotes(currentUser?.id || null);

  useEffect(() => {
    // LIMPEZA IMEDIATA E CONFIRMAÇÃO
    if (typeof window !== 'undefined') {
      const prefillNote = localStorage.getItem("prefill_note");
      if (prefillNote) {
        setContent(prefillNote);
        setTitle(localStorage.getItem("prefill_title") || "");
        setTags(localStorage.getItem("prefill_tags")?.split(',') || []);
        setIsDevotional(true);
        localStorage.removeItem("prefill_note");
        localStorage.removeItem("prefill_title");
        localStorage.removeItem("prefill_tags");
        toast.info("Análise Bíblica importada com sucesso! 🙌");
      }
    }
  }, []);

  // Busca Filtrada Avançada (Título, Conteúdo, Tags e DATAS) + Filtro de Abas
  const filteredNotes = useMemo(() => {
    let result = notes || [];
    
    if (filter === 'favorites') result = result.filter((n: any) => n.is_favorite);
    else if (filter === 'public') result = result.filter((n: any) => n.is_public);

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase();
    
    return result.filter((n: any) => {
      const dateStr = format(new Date(n.created_at), "dd/MM/yyyy").toLowerCase();
      const monthStr = format(new Date(n.created_at), "MMMM", { locale: ptBR }).toLowerCase();
      
      return (
        n.title?.toLowerCase().includes(q) || 
        n.content?.toLowerCase().includes(q) ||
        n.tags?.some((t: string) => t.toLowerCase().includes(q)) ||
        dateStr.includes(q) ||
        monthStr.includes(q)
      );
    });
  }, [notes, searchQuery, filter]);

  // Autosave
  useEffect(() => {
    if (!isEditorExpanded) return;
    if (!content.trim() && !title.trim()) return;

    const timeoutId = setTimeout(() => {
      handleAutosave();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [title, content, tags, isPublic, isDevotional, isEditorExpanded]);

  async function handleAutosave() {
    if (!content.trim() || !currentUser?.id) return;
    try {
      const noteData = {
        user_id: currentUser.id,
        profile_id: currentUser.id,
        title: title || (isDevotional ? `Devocional - ${format(new Date(), 'dd/MM')}` : ""),
        content,
        is_public: isPublic,
        type: isDevotional ? 'devotional' : 'note',
        tags: tags
      };

      const saved = await saveNote(noteData, editingId);
      // Se for a primeira vez salvando, captura o ID real gerado pelo backend
      if (!editingId && saved && saved.id) {
        setEditingId(saved.id);
      }
    } catch (error) {
      console.error("Autosave error", error);
    }
  }

  async function handleClose() {
    await handleAutosave();
    setIsEditorExpanded(false);
    resetEditor();
  }

  function resetEditor() {
    setEditingId(null);
    setTitle("");
    setContent("");
    setTags([]);
    setTagInput("");
    setIsPublic(false);
    setIsDevotional(false);
  }

  function startEditing(note: Note) {
    setEditingId(note.id);
    setTitle(note.title || "");
    setContent(note.content || "");
    setTags(note.tags || []);
    setIsPublic(note.is_public);
    setIsDevotional(note.type === 'devotional');
    setIsEditorExpanded(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/^#/, "").toLowerCase(); 
      if (newTag && !tags.includes(newTag)) {
        setTags([...tags, newTag]);
      }
      setTagInput("");
    }
  };

  const removeTag = (t: string) => setTags(tags.filter((item: string) => item !== t));

  async function deleteNote(id: string) {
    if (confirm("Remover esta nota?")) {
      await deleteNoteHook(id);
      toast.success("Nota removida");
    }
  }

  async function toggleFavorite(id: string, currentState: boolean) {
    try {
      await toggleFavoriteHook(id, currentState);
    } catch (error) {
      toast.error("Erro ao favoritar");
    }
  }

  async function shareToFeed(note: Note) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("posts")
        .insert({
          author_id: user.id,
          user_id: user.id,
          profile_id: user.id,
          content: note.content.includes("📖") ? note.content : `📖 Devocional\n\n${note.content}`,
          post_type: 'text'
        });

      if (error) throw error;
      toast.success("Publicado no seu Feed como testemunho! 🙌");
    } catch (error) {
      toast.error("Erro ao compartilhar no feed");
    }
  }

  return (
    <div className="min-h-screen bg-whatsapp-light dark:bg-whatsapp-dark">
      <div className="max-w-3xl mx-auto px-4 py-8 pb-32">
        
        {/* HEADER GIGANTE PREMIUM */}
        <div className="relative mb-10 p-8 rounded-[32px] bg-gradient-to-br from-whatsapp-teal to-emerald-600 overflow-hidden shadow-2xl shadow-whatsapp-teal/20">
          <div className="relative z-10">
            <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
              <BookOpen className="w-8 h-8" />
              Notas
            </h1>
            <p className="text-white/80 font-medium">Capture suas orações, aprendizados e momentos com Deus.</p>
          </div>
          <Sparkles className="absolute -right-4 -top-4 w-32 h-32 text-white/10 rotate-12" />
        </div>

        {/* EDITOR DE NOTAS (LUMINA / KEEP STYLE) */}
        <div className="mb-10 max-w-2xl mx-auto">
          {!isEditorExpanded ? (
            <div 
              onClick={() => setIsEditorExpanded(true)}
              className="bg-white dark:bg-whatsapp-darkLighter rounded-[20px] p-5 shadow-sm border border-gray-200 dark:border-white/10 cursor-text flex items-center justify-between text-gray-500 hover:shadow-md transition-all"
            >
              <span className="font-normal text-[16px] leading-[24px] text-gray-400">Criar uma nota...</span>
              <div className="flex gap-4 text-gray-400">
                <button title="Nova nota" className="hover:text-whatsapp-teal transition-colors">
                  <Check className="w-5 h-5" />
                </button>
                <button 
                  title="Novo devocional" 
                  className="hover:text-amber-500 transition-colors"
                  onClick={(e) => { e.stopPropagation(); setIsDevotional(true); setIsEditorExpanded(true); setContent("📖 Versículo:\n\n💭 Reflexão:\n\n🙏 Oração:"); }}
                >
                  <Feather className="w-5 h-5 text-amber-500" />
                </button>
              </div>
            </div>
          ) : (
            <div className={cn(
              "bg-white dark:bg-whatsapp-darkLighter rounded-[24px] border transition-all duration-300 shadow-2xl overflow-hidden",
              editingId ? "border-amber-500 ring-1 ring-amber-500/20" : "border-gray-200 dark:border-white/10"
            )}>
              <div className="p-6 space-y-4">
                 {/* Visibility Toggle Pills */}
                 <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1 w-fit border border-gray-200/50 dark:border-white/5">
                   <button 
                     onClick={() => setIsPublic(true)}
                     className={cn(
                       "px-3.5 py-1.5 rounded-lg text-[14px] leading-[16px] font-semibold tracking-[0.01em] flex items-center gap-1.5 transition-all",
                       isPublic 
                         ? "bg-white dark:bg-whatsapp-darkLighter shadow-sm text-blue-600 dark:text-blue-400" 
                         : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                     )}
                   >
                     <Globe className="w-4 h-4" /> Público
                   </button>
                   <button 
                     onClick={() => setIsPublic(false)}
                     className={cn(
                       "px-3.5 py-1.5 rounded-lg text-[14px] leading-[16px] font-semibold tracking-[0.01em] flex items-center gap-1.5 transition-all",
                       !isPublic 
                         ? "bg-white dark:bg-whatsapp-darkLighter shadow-sm text-amber-600 dark:text-amber-400" 
                         : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                     )}
                   >
                     <Lock className="w-4 h-4" /> Privado
                   </button>
                 </div>

                 {/* Title Input */}
                 <input
                    placeholder="Título da nota"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-transparent text-[24px] sm:text-[28px] md:text-[32px] leading-[30px] sm:leading-[34px] md:leading-[40px] font-semibold tracking-[-0.02em] outline-none border-none placeholder:text-gray-400 text-gray-900 dark:text-white px-0"
                  />

                  {/* Body Textarea */}
                  <textarea
                    autoFocus
                    placeholder={isDevotional ? "Preencha seu devocional..." : "Comece a escrever sua nota aqui..."}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full bg-transparent text-[18px] leading-[28px] font-normal outline-none min-h-[300px] resize-none border-none placeholder:text-gray-400 text-gray-800 dark:text-gray-200 px-0"
                  />
                  
                  {/* Tags e Tag Input */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 dark:border-white/5">
                    {tags.map((t: string) => (
                      <span key={t} className="flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-white/5 rounded-full text-[12px] leading-[16px] font-semibold text-gray-700 dark:text-gray-300">
                        #{t} <X onClick={() => removeTag(t)} className="w-3 h-3 cursor-pointer hover:text-red-500" />
                      </span>
                    ))}
                    <input
                      placeholder="Adicionar tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      className="bg-transparent text-[14px] leading-[20px] font-normal outline-none border-none w-28 focus:w-36 transition-all placeholder:text-gray-400"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3">
                     <div className="flex items-center gap-2 text-gray-400">
                        {/* Ferramentas Inferiores */}
                        <button 
                          title="Modo Devocional" 
                          onClick={() => setIsDevotional(!isDevotional)} 
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border",
                            isDevotional 
                              ? "bg-amber-500/10 border-amber-500/30 text-amber-500" 
                              : "border-transparent hover:bg-gray-100 dark:hover:bg-white/5"
                          )}
                        >
                          <Feather className="w-4 h-4" /> Devocional
                        </button>
                        <span className="text-[12px] opacity-60 flex items-center gap-1 ml-1"><Check className="w-3.5 h-3.5 text-emerald-500"/> Salvo</span>
                     </div>
                     <button 
                       onClick={handleClose}
                       className="px-5 py-2 text-sm font-bold bg-whatsapp-teal text-white hover:bg-whatsapp-tealLight rounded-xl transition-all shadow-md active:scale-95"
                     >
                       Concluir
                     </button>
                  </div>
              </div>
            </div>
          )}
        </div>

        {/* BARRA DE BUSCA E FILTROS */}
        <div className="space-y-4 mb-8">
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
               <input 
                 placeholder="Buscar por data (ex: 14/04), título ou #tag..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full bg-white dark:bg-whatsapp-darkLighter border border-gray-100 dark:border-white/5 pl-12 pr-4 py-4 rounded-[20px] shadow-sm outline-none focus:ring-2 focus:ring-whatsapp-teal/20 transition-all font-medium"
               />
               {searchQuery && (
                 <X 
                   onClick={() => setSearchQuery("")}
                   className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 cursor-pointer hover:text-gray-500 transition-colors" 
                 />
               )}
            </div>

            <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar font-outfit">
               <button
                 onClick={() => setFilter('all')}
                 className={cn(
                   "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border",
                   filter === 'all' 
                     ? "bg-whatsapp-teal border-whatsapp-teal text-white shadow-md shadow-whatsapp-teal/20" 
                     : "bg-white dark:bg-whatsapp-darkLighter border-gray-100 dark:border-white/5 text-gray-500"
                 )}
               >
                 <List className="w-4 h-4" /> Tudo
               </button>
               <button
                 onClick={() => setFilter('favorites')}
                 className={cn(
                   "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border",
                   filter === 'favorites' 
                     ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20" 
                     : "bg-white dark:bg-whatsapp-darkLighter border-gray-100 dark:border-white/5 text-gray-500"
                 )}
               >
                 <Star className="w-4 h-4" /> Favoritos
               </button>
               <button
                 onClick={() => setFilter('public')}
                 className={cn(
                   "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border",
                   filter === 'public' 
                     ? "bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-500/20" 
                     : "bg-white dark:bg-whatsapp-darkLighter border-gray-100 dark:border-white/5 text-gray-400"
                 )}
               >
                 <Globe className="w-4 h-4" /> Públicos
               </button>
            </div>
        </div>

        {/* LISTA DE NOTAS MASONRY KEEP STYLE */}
        <div>
          {loading ? (
            <div className="py-20 text-center text-gray-400 animate-pulse font-medium">Lendo seu diário...</div>
          ) : filteredNotes.length === 0 ? (
            <div className="py-20 text-center space-y-4 bg-white/5 rounded-[40px] border border-dashed border-white/10">
              <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-300">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Nada encontrado na sua busca</p>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="text-whatsapp-teal text-xs font-black uppercase underline"
                >
                  Limpar Busca
                </button>
              )}
            </div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
              {filteredNotes.map((note: Note) => {
                const isExpanded = expandedIds.has(note.id);
                return (
                  <div 
                    key={note.id} 
                    className="break-inside-avoid bg-white dark:bg-whatsapp-darkLighter border border-gray-200 dark:border-white/10 rounded-[16px] overflow-hidden hover:shadow-lg transition-shadow group relative flex flex-col"
                  >
                    <div className="p-5 cursor-pointer flex-1" onClick={() => startEditing(note)}>
                      {note.title && (
                        <h3 className="font-semibold text-[17px] sm:text-[18px] text-gray-900 dark:text-white mb-2 leading-[22px] sm:leading-[24px] tracking-[-0.01em] pr-8">
                          {note.title}
                        </h3>
                      )}
                      <p className={cn(
                        "text-gray-700 dark:text-gray-300 text-[15px] sm:text-[16px] leading-[22px] sm:leading-[24px] font-normal whitespace-pre-wrap",
                        !isExpanded && "line-clamp-6"
                      )}>
                        {renderNoteContent(note.content)}
                      </p>
                      
                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {note.tags.map((t: string) => (
                            <span key={t} className="px-2.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded-full text-[11px] leading-[14px] font-semibold text-gray-500 dark:text-gray-400">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions Hover */}
                    <div className="px-4 py-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                       <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleFavorite(note.id, note.is_favorite); }}
                            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                          >
                            <Star className={cn("w-4 h-4", note.is_favorite ? "fill-amber-400 text-amber-400" : "text-gray-400")} />
                          </button>
                          {note.is_public && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); shareToFeed(note); }}
                              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-gray-400 hover:text-blue-500"
                              title="Compartilhar no Feed"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                          )}
                       </div>
                       <button 
                         onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                         className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors text-gray-400 hover:text-red-500"
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>

                    {/* Badge fixo se for devocional ou public */}
                    <div className="absolute top-4 right-4 flex gap-1 pointer-events-none">
                      {note.type === 'devotional' && <Feather className="w-4 h-4 text-amber-500/50" />}
                      {note.is_public && <Globe className="w-4 h-4 text-blue-500/50" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Menu Mobile Inferior */}
      <BottomNav />
    </div>
  );
}
