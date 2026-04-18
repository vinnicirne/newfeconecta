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
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'favorites' | 'public'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Estado do Editor
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem("prefill_title") || "" : ""));
  const [content, setContent] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem("prefill_note") || "" : ""));
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(() => (typeof window !== 'undefined' ? (localStorage.getItem("prefill_tags")?.split(',') || []) : []));
  const [isPublic, setIsPublic] = useState(false);
  const [isDevotional, setIsDevotional] = useState(() => (typeof window !== 'undefined' ? !!localStorage.getItem("prefill_note") : false));
  const [saving, setSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const hasAppliedPrefill = useRef(false);

  useEffect(() => {
    fetchNotes();
    
    // LIMPEZA IMEDIATA E CONFIRMAÇÃO
    if (typeof window !== 'undefined' && localStorage.getItem("prefill_note")) {
      localStorage.removeItem("prefill_note");
      localStorage.removeItem("prefill_title");
      localStorage.removeItem("prefill_tags");
      toast.info("Análise Bíblica importada com sucesso! 🙌");
    }
  }, [filter]);


  async function fetchNotes() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("user_notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (filter === 'favorites') query = query.eq('is_favorite', true);
      else if (filter === 'public') query = query.eq('is_public', true);
      else query = query.eq('user_id', user.id);

      const { data, error } = await query;
      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Erro ao buscar notas:", error);
    } finally {
      setLoading(false);
    }
  }

  // Busca Filtrada Avançada (Título, Conteúdo, Tags e DATAS)
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    
    return notes.filter(n => {
      const dateStr = format(new Date(n.created_at), "dd/MM/yyyy").toLowerCase();
      const monthStr = format(new Date(n.created_at), "MMMM", { locale: ptBR }).toLowerCase();
      
      return (
        n.title?.toLowerCase().includes(q) || 
        n.content?.toLowerCase().includes(q) ||
        n.tags?.some(t => t.toLowerCase().includes(q)) ||
        dateStr.includes(q) ||
        monthStr.includes(q)
      );
    });
  }, [notes, searchQuery]);

  async function handleSave() {
    if (!content.trim()) {
      toast.error("A nota não pode estar vazia");
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const noteData = {
        user_id: user.id,
        title: title || (isDevotional ? `Devocional - ${format(new Date(), 'dd/MM')}` : ""),
        content,
        is_public: isPublic,
        type: isDevotional ? 'devotional' : 'note',
        tags: tags
      };

      if (editingId) {
        const { data, error } = await supabase
          .from("user_notes")
          .update(noteData)
          .eq("id", editingId)
          .select()
          .single();

        if (error) throw error;
        setNotes(notes.map(n => n.id === editingId ? data : n));
        toast.success("Nota atualizada!");
      } else {
        const { data, error } = await supabase
          .from("user_notes")
          .insert(noteData)
          .select()
          .single();

        if (error) throw error;
        setNotes([data, ...notes]);
        toast.success("Nota salva no seu diário!");
      }

      resetEditor();
    } catch (error) {
      toast.error("Erro ao salvar nota");
    } finally {
      setSaving(false);
    }
  }

  function toggleExpand(id: string) {
    const next = new Set(expandedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedIds(next);
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
    setTitle(note.title);
    setContent(note.content);
    setTags(note.tags || []);
    setIsPublic(note.is_public);
    setIsDevotional(note.type === 'devotional');
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

  const removeTag = (t: string) => setTags(tags.filter(item => item !== t));

  async function deleteNote(id: string) {
    const { error } = await supabase.from("user_notes").delete().eq("id", id);
    if (!error) {
      setNotes(notes.filter((n) => n.id !== id));
      toast.success("Nota removida");
    } else {
      toast.error("Erro ao deletar nota");
    }
  }

  async function toggleFavorite(id: string, currentState: boolean) {
    try {
      const { error } = await supabase
        .from("user_notes")
        .update({ is_favorite: !currentState })
        .eq("id", id);
      
      if (error) throw error;
      setNotes(notes.map((n) => n.id === id ? { ...n, is_favorite: !currentState } : n));
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
              Meu Diário Espiritual
            </h1>
            <p className="text-white/80 font-medium">Capture suas orações, aprendizados e momentos com Deus.</p>
          </div>
          <Sparkles className="absolute -right-4 -top-4 w-32 h-32 text-white/10 rotate-12" />
        </div>

        {/* EDITOR DE NOTAS */}
        <div className={cn(
          "bg-white dark:bg-whatsapp-darkLighter rounded-[24px] border transition-all duration-300 shadow-xl overflow-hidden mb-10",
          editingId ? "border-amber-500 ring-2 ring-amber-500/20" : "border-gray-100 dark:border-white/5"
        )}>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    setIsDevotional(false);
                    setContent("");
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    !isDevotional ? "bg-whatsapp-teal text-white" : "bg-gray-100 dark:bg-white/5 text-gray-400"
                  )}
                >
                  Nota Simples
                </button>
                <button 
                  onClick={() => {
                    setIsDevotional(true);
                    setContent("📖 Versículo:\n\n💭 Reflexão:\n\n🙏 Oração:");
                  }}
                  className={cn(
                    "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    isDevotional ? "bg-amber-500 text-white" : "bg-gray-100 dark:bg-white/5 text-gray-400"
                  )}
                >
                  <Feather className="w-4 h-4" />
                  Modo Devocional
                </button>
              </div>
              
              {editingId && (
                <button onClick={resetEditor} className="p-2 text-gray-400 hover:text-red-500 transition-colors bg-red-50 dark:bg-red-500/10 rounded-xl">
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="space-y-4">
               <div>
                  <div className="flex justify-between items-end mb-1 px-1">
                    <label className="text-[10px] font-black uppercase tracking-tighter text-gray-400">Título da Reflexão</label>
                    <span className="text-[10px] font-black tracking-widest text-whatsapp-teal flex items-center gap-1 opacity-70">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                  <input
                    placeholder="Dê um nome a este momento..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-white/5 p-4 rounded-2xl text-lg font-bold outline-none border border-transparent focus:border-whatsapp-teal transition-all"
                  />
               </div>

               <div>
                  <label className="text-[10px] font-black uppercase tracking-tighter text-gray-400 mb-1 block px-1">Seu Diário</label>
                  <textarea
                    placeholder={isDevotional ? "Preencha seu devocional..." : "O que Deus falou com você hoje?"}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-white/5 p-4 rounded-2xl text-lg outline-none min-h-[150px] resize-none border border-transparent focus:border-whatsapp-teal transition-all leading-relaxed"
                  />
               </div>

               <div>
                  <label className="text-[10px] font-black uppercase tracking-tighter text-gray-400 mb-1 block px-1">Categorias (Tags)</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map(t => (
                      <span key={t} className="flex items-center gap-1.5 px-3 py-1 bg-whatsapp-teal/10 text-whatsapp-teal rounded-full text-xs font-bold">
                        #{t} <X onClick={() => removeTag(t)} className="w-3 h-3 cursor-pointer" />
                      </span>
                    ))}
                  </div>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      placeholder="Pressione Enter para adicionar tags..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                      className="w-full bg-gray-50 dark:bg-white/5 pl-12 pr-4 py-3 rounded-2xl text-sm outline-none border border-transparent focus:border-whatsapp-teal transition-all"
                    />
                  </div>
               </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
              <button
                onClick={() => setIsPublic(!isPublic)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all",
                  isPublic 
                    ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10" 
                    : "bg-gray-50 text-gray-500 dark:bg-white/5"
                )}
              >
                {isPublic ? <Globe size={14} /> : <Lock size={14} />}
                {isPublic ? "Público (Testemunho)" : "Privado"}
              </button>

              <button 
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  "px-8 py-3 rounded-2xl font-black text-sm shadow-lg transition-all disabled:opacity-50 flex items-center gap-2",
                  editingId 
                    ? "bg-amber-500 text-white shadow-amber-500/30" 
                    : "bg-whatsapp-teal text-white shadow-whatsapp-teal/30"
                )}
              >
                {saving ? "Processando..." : editingId ? (
                  <><Check className="w-4 h-4" /> Atualizar Nota</>
                ) : "Guardar Nota"}
              </button>
            </div>
          </div>
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

        {/* LISTA DE NOTAS */}
        <div className="grid gap-6">
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
            filteredNotes.map((note) => (
              <div 
                key={note.id} 
                className="group bg-white dark:bg-whatsapp-darkLighter rounded-[32px] border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
              >
                <div className="p-6 md:p-8">
                  <div className="flex justify-between items-start">
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => toggleExpand(note.id)}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {note.type === 'devotional' ? (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase tracking-widest border border-amber-500/20 flex items-center gap-1">
                            <Sparkles size={10} /> Estudo IA
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-whatsapp-green/10 text-whatsapp-green text-[9px] font-black uppercase tracking-widest border border-whatsapp-green/20">
                            Nota Simples
                          </span>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {format(new Date(note.created_at), "dd 'de' MMMM", { locale: ptBR })}
                        </span>
                      </div>
                      <h2 className={cn(
                        "text-xl font-black dark:text-white leading-tight transition-all",
                        expandedIds.has(note.id) ? "text-whatsapp-teal" : "group-hover:text-whatsapp-teal"
                      )}>
                        {note.title || "Sem título"}
                      </h2>
                    </div>

                    <div className="flex gap-1 md:gap-2">
                      <button
                        onClick={() => toggleFavorite(note.id, note.is_favorite)}
                        className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                          note.is_favorite ? "text-amber-500 bg-amber-500/10" : "text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                        )}
                      >
                        <Star size={18} className={note.is_favorite ? "fill-current" : ""} />
                      </button>
                      <button
                        onClick={() => startEditing(note)}
                        className="w-10 h-10 rounded-2xl text-gray-300 hover:text-whatsapp-teal hover:bg-whatsapp-teal/10 flex items-center justify-center transition-all"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button
                        onClick={() => { if(confirm("Remover esta nota?")) deleteNote(note.id) }}
                        className="w-10 h-10 rounded-2xl text-gray-300 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* CONTEÚDO EXPANSÍVEL (SÓ APARECE AO CLICAR) */}
                  {expandedIds.has(note.id) && (
                    <div className="mt-8 pt-8 border-t border-gray-50 dark:border-white/5 animate-in fade-in slide-in-from-top-4 duration-500">
                      <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed pb-8 text-base font-medium">
                        {note.content}
                      </p>

                      {note.tags && note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {note.tags.map(t => (
                            <span key={t} className="px-3 py-1 bg-gray-50 dark:bg-white/5 text-gray-400 rounded-lg text-xs font-bold border border-transparent">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-6 border-t border-gray-50 dark:border-white/5">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {note.is_public ? <Globe size={13} className="text-blue-500" /> : <Lock size={13} />}
                          {note.is_public ? "Comunidade" : "Privado"}
                        </span>
                        
                        {note.is_public && (
                          <button 
                            onClick={() => shareToFeed(note)}
                            className="flex items-center gap-2 text-whatsapp-teal text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
                          >
                            <Share2 size={15} />
                            Publicar Testemunho
                          </button>
                        )}
                      </div>

                      <button 
                        onClick={() => toggleExpand(note.id)}
                        className="mt-8 w-full py-4 text-[10px] font-black uppercase text-gray-400 bg-gray-50 dark:bg-white/5 rounded-2xl hover:text-whatsapp-teal transition-all"
                      >
                        ↑ Recolher Estudo
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
