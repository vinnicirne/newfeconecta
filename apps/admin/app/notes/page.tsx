"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Heart, Plus, Trash2, Globe, Lock, Search, 
  BookOpen, Feather, Sparkles, Share2, Filter,
  MoreVertical, Edit3, Bookmark
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Note {
  id: string;
  title: string;
  content: string;
  is_public: boolean;
  is_favorite: boolean;
  type: 'note' | 'devotional';
  created_at: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'favorites' | 'public'>('all');
  
  // Estado do Editor
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [isDevotional, setIsDevotional] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotes();
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
      if (filter === 'public') query = query.eq('is_public', true);
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

  async function addNote() {
    if (!content.trim()) {
      toast.error("A nota não pode estar vazia");
      return;
    }

    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newNote = {
        user_id: user.id,
        title: title || (isDevotional ? `Devocional - ${format(new Date(), 'dd/MM')}` : ""),
        content,
        is_public: isPublic,
        type: isDevotional ? 'devotional' : 'note',
      };

      const { data, error } = await supabase
        .from("user_notes")
        .insert(newNote)
        .select()
        .single();

      if (error) throw error;

      setNotes([data, ...notes]);
      setTitle("");
      setContent("");
      setIsPublic(false);
      setIsDevotional(false);
      toast.success("Nota salva no seu diário!");
    } catch (error) {
      toast.error("Erro ao salvar nota");
    } finally {
      setSaving(false);
    }
  }

  async function deleteNote(id: string) {
    const { error } = await supabase.from("user_notes").delete().eq("id", id);
    if (!error) {
      setNotes(notes.filter((n) => n.id !== id));
      toast.success("Nota removida");
    }
  }

  async function toggleFavorite(id: string, currentState: boolean) {
    const { error } = await supabase
      .from("user_notes")
      .update({ is_favorite: !currentState })
      .eq("id", id);
    
    if (!error) {
      setNotes(notes.map((n) => n.id === id ? { ...n, is_favorite: !currentState } : n));
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
          content: note.content,
          post_type: 'text',
          is_testimony: true // Flag para identificar que veio do diário
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
        <div className="bg-white dark:bg-whatsapp-darkLighter rounded-[24px] border border-gray-100 dark:border-white/5 shadow-xl overflow-hidden mb-10">
          <div className="p-6 space-y-4">
            <div className="flex gap-4 mb-2">
              <button 
                onClick={() => setIsDevotional(false)}
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
                  if (!content) setContent("📖 Versículo:\n\n💭 Reflexão:\n\n🙏 Oração:");
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

            <input
              placeholder="Título da sua reflexão..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-xl font-bold outline-none placeholder:text-gray-300 dark:placeholder:text-white/10"
            />

            <textarea
              placeholder={isDevotional ? "Preencha seu devocional..." : "O que Deus falou com você hoje?"}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-transparent text-lg outline-none min-h-[150px] resize-none placeholder:text-gray-300 dark:placeholder:text-white/5 leading-relaxed"
            />

            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-white/5">
              <div className="flex gap-2">
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
              </div>

              <button 
                onClick={addNote}
                disabled={saving}
                className="px-8 py-3 bg-whatsapp-teal text-white rounded-2xl font-black text-sm shadow-lg shadow-whatsapp-teal/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Guardar Nota"}
              </button>
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 no-scrollbar font-outfit">
          {[
            { id: 'all', label: 'Tudo', icon: List },
            { id: 'favorites', label: 'Favoritos', icon: Bookmark },
            { id: 'public', label: 'Públicos', icon: Globe },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id as any)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border",
                filter === item.id 
                  ? "bg-whatsapp-teal border-whatsapp-teal text-white shadow-md shadow-whatsapp-teal/20" 
                  : "bg-white dark:bg-whatsapp-darkLighter border-gray-100 dark:border-white/5 text-gray-500"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </div>

        {/* LISTA DE NOTAS */}
        <div className="grid gap-6">
          {loading ? (
            <div className="py-20 text-center text-gray-400">Carregando diário...</div>
          ) : notes.length === 0 ? (
            <div className="py-20 text-center space-y-4">
              <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-300">
                <Feather className="w-8 h-8" />
              </div>
              <p className="text-gray-400 font-medium">Nenhuma nota por aqui ainda.</p>
            </div>
          ) : (
            notes.map((note) => (
              <div 
                key={note.id} 
                className="group bg-white dark:bg-whatsapp-darkLighter rounded-[24px] border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {note.type === 'devotional' && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest">
                            Devocional
                          </span>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          {format(new Date(note.created_at), "dd 'de' MMMM", { locale: ptBR })}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold dark:text-white leading-tight">
                        {note.title || "Sem título"}
                      </h2>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => toggleFavorite(note.id, note.is_favorite)}
                        className={cn(
                          "p-2 rounded-xl transition-colors",
                          note.is_favorite ? "text-red-500 bg-red-50" : "text-gray-400 hover:bg-gray-50"
                        )}
                      >
                        <Heart size={18} className={note.is_favorite ? "fill-current" : ""} />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed pb-6">
                    {note.content}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-white/5">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400">
                        {note.is_public ? <Globe size={12} className="text-blue-500" /> : <Lock size={12} />}
                        {note.is_public ? "Visível para a comunidade" : "Apenas para você"}
                      </span>
                    </div>
                    {note.is_public && (
                      <button 
                        onClick={() => shareToFeed(note)}
                        className="flex items-center gap-2 text-whatsapp-teal text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
                      >
                        <Share2 size={14} />
                        Compartilhar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Icons for the list
function List(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" 
      fill="none" stroke="currentColor" strokeWidth="2" 
      strokeLinecap="round" strokeLinejoin="round"
    >
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  );
}
