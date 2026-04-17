"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Sparkles, 
  Save, 
  History, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Trash2,
  BookOpen,
  Search,
  X
} from "lucide-react";
import { toast } from "sonner";
import { BIBLE_BOOKS } from "@/lib/bible-data";
import { cn } from "@/lib/utils";

const bibleCache: Record<string, any> = {};

interface DailyVerse {
  id: string;
  content: string;
  reference: string;
  book_abbrev: string;
  chapter: number;
  verse: number;
  is_active: boolean;
  created_at: string;
}

export default function DailyVerseAdmin() {
  const [verses, setVerses] = useState<DailyVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [content, setContent] = useState("");
  const [reference, setReference] = useState("");
  const [bookAbbrev, setBookAbbrev] = useState(BIBLE_BOOKS[0].abbrev);
  const [chapter, setChapter] = useState(1);
  const [verse, setVerse] = useState(1);

  // Bible search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    fetchVerses();
  }, []);

  async function fetchVerses() {
    try {
      const { data, error } = await supabase
        .from('daily_verses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVerses(data || []);
    } catch (error) {
      console.error("Erro ao buscar versículos:", error);
      toast.error("Erro ao carregar histórico");
    } finally {
      setLoading(false);
    }
  }

  async function handleBibleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim().toLocaleLowerCase('pt-BR');
    if (q.length < 3) { toast.error("Digite pelo menos 3 letras"); return; }
    try {
      setSearchLoading(true);
      if (!bibleCache['nvi']) {
        const res = await fetch('/bible/nvi.json');
        if (!res.ok) throw new Error('Falha ao carregar');
        bibleCache['nvi'] = await res.json();
      }

      // Detecta referência bíblica (ex: "salmos 91", "jo 3:16", "gn 1 5")
      let refBook: any = null;
      let refChap: number | null = null;
      let refVerse: number | null = null;
      const refMatch = q.match(/^([a-záéíóúãõâêîôûç0-9\s]+?)\s+(\d+)(?:[:.\\-\sv]+(\d+))?$/i);
      if (refMatch) {
        const possibleBook = refMatch[1].trim();
        refChap = parseInt(refMatch[2]);
        if (refMatch[3]) refVerse = parseInt(refMatch[3]);
        const bMeta = BIBLE_BOOKS.find(b =>
          b.name.toLocaleLowerCase('pt-BR') === possibleBook ||
          b.name.toLocaleLowerCase('pt-BR').startsWith(possibleBook) ||
          b.abbrev.toLocaleLowerCase('pt-BR') === possibleBook
        );
        if (bMeta) refBook = bMeta;
      }

      const found: any[] = [];
      bibleCache['nvi'].forEach((book: any) => {
        const meta = BIBLE_BOOKS.find(b => b.abbrev === book.abbrev);
        if (!meta) return;
        book.chapters.forEach((verses: string[], ci: number) => {
          const currentChap = ci + 1;
          verses.forEach((text: string, vi: number) => {
            const currentVerse = vi + 1;
            let isMatch = false;
            if (refBook && refBook.abbrev === meta.abbrev && currentChap === refChap) {
              isMatch = refVerse ? currentVerse === refVerse : true;
            } else if (!refBook) {
              isMatch = text.toLocaleLowerCase('pt-BR').includes(q);
            }
            if (isMatch) {
              found.push({ book: meta.name, bookAbbrev: meta.abbrev, chapter: currentChap, verse: currentVerse, text });
            }
          });
        });
      });

      setSearchResults(found.slice(0, 20));
      if (found.length === 0) toast.info("Nenhum versículo encontrado");
    } catch {
      toast.error("Erro ao buscar versículos");
    } finally {
      setSearchLoading(false);
    }
  }

  function selectVerse(result: any) {
    setContent(result.text);
    setReference(`${result.book} ${result.chapter}:${result.verse}`);
    setBookAbbrev(result.bookAbbrev);
    setChapter(result.chapter);
    setVerse(result.verse);
    setSearchResults([]);
    setSearchQuery("");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!content || !reference) return;

    setSaving(true);
    try {
      // Deactivate all others first (optional, but good for single active verse)
      await supabase
        .from('daily_verses')
        .update({ is_active: false })
        .eq('is_active', true);

      const { data, error } = await supabase
        .from('daily_verses')
        .insert({
          content,
          reference,
          book_abbrev: bookAbbrev,
          chapter,
          verse,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      setVerses([data, ...verses.map(v => ({ ...v, is_active: false }))]);
      setContent("");
      setReference("");
      toast.success("Novo versículo do dia publicado! 🙌");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao publicar versículo");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, current: boolean) {
    try {
      if (!current) {
        // Activating this one, deactivate others
        await supabase
          .from('daily_verses')
          .update({ is_active: false })
          .neq('id', id);
      }

      const { error } = await supabase
        .from('daily_verses')
        .update({ is_active: !current })
        .eq('id', id);

      if (error) throw error;
      
      setVerses(verses.map(v => {
        if (v.id === id) return { ...v, is_active: !current };
        if (!current) return { ...v, is_active: false }; // Deactivated others
        return v;
      }));
      
      toast.success(current ? "Versículo desativado" : "Versículo ativado com sucesso!");
    } catch (error) {
      toast.error("Erro ao alterar status");
    }
  }

  async function deleteVerse(id: string) {
    if (!confirm("Tem certeza que deseja excluir este registro?")) return;
    try {
      const { error } = await supabase.from('daily_verses').delete().eq('id', id);
      if (error) throw error;
      setVerses(verses.filter(v => v.id !== id));
      toast.success("Removido com sucesso");
    } catch (error) {
      toast.error("Erro ao excluir");
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black dark:text-white flex items-center gap-3">
            <Sparkles className="text-whatsapp-green" />
            Controle do Versículo do Dia
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Gerencie a mensagem e a marcação que aparece para todos os usuários.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/5">
            <h2 className="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
              <Plus size={16} className="text-whatsapp-green" />
              Novo Versículo
            </h2>

            <form onSubmit={handleCreate} className="space-y-5">
              {/* BUSCA BÍBLICA - preenche o formulário automaticamente */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Buscar Versículo</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleBibleSearch(e as any);
                      }
                    }}
                    placeholder="Ex: amor, paz, Salmos 23..."
                    className="flex-1 bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-whatsapp-green transition-all"
                  />
                  <button 
                    type="button" 
                    onClick={handleBibleSearch}
                    className="px-4 py-3 bg-whatsapp-green/20 text-whatsapp-green rounded-2xl hover:bg-whatsapp-green hover:text-white transition-all outline-none"
                  >
                    {searchLoading ? <span className="animate-spin inline-block">⟳</span> : <Search size={16} />}
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1 rounded-2xl border border-whatsapp-green/20 p-2 bg-whatsapp-light dark:bg-whatsapp-dark">
                    {searchResults.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectVerse(r)}
                        className="w-full text-left p-3 rounded-xl hover:bg-whatsapp-green/10 transition-colors"
                      >
                        <span className="text-[10px] font-black text-whatsapp-green uppercase">{r.book} {r.chapter}:{r.verse}</span>
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 truncate">{r.text}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Texto do Versículo</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ex: O Senhor é o meu pastor..."
                  className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-2xl p-4 text-sm min-h-[120px] focus:ring-2 focus:ring-whatsapp-green transition-all"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Referência (Texto)</label>
                <input 
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Ex: Salmos 23:1"
                  className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-whatsapp-green transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Livro</label>
                  <select 
                    value={bookAbbrev}
                    onChange={(e) => setBookAbbrev(e.target.value)}
                    className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-xl px-2 py-3 text-xs font-bold focus:ring-2 focus:ring-whatsapp-green transition-all"
                  >
                    {BIBLE_BOOKS.map(b => (
                      <option key={b.abbrev} value={b.abbrev}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Cap.</label>
                  <input 
                    type="number"
                    value={chapter}
                    onChange={(e) => setChapter(parseInt(e.target.value))}
                    className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-whatsapp-green transition-all"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vers.</label>
                  <input 
                    type="number"
                    value={verse}
                    onChange={(e) => setVerse(parseInt(e.target.value))}
                    className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-whatsapp-green transition-all"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-whatsapp-green text-whatsapp-dark rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-whatsapp-green/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
              >
                {saving ? "Salvando..." : (
                  <>
                    <Save size={16} />
                    Publicar Agora
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <History size={16} className="text-gray-400" />
              Histórico
            </h2>
          </div>

          {loading ? (
             <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-gray-100 dark:bg-white/5 rounded-[32px] animate-pulse" />
                ))}
             </div>
          ) : verses.length === 0 ? (
            <div className="py-20 text-center bg-white dark:bg-whatsapp-darkLighter rounded-[32px] border border-dashed border-gray-200 dark:border-white/10">
              <AlertCircle className="mx-auto w-10 h-10 text-gray-300 mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Nenhum registro encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {verses.map((v) => (
                <div 
                  key={v.id} 
                  className={cn(
                    "relative overflow-hidden bg-white dark:bg-whatsapp-darkLighter p-6 rounded-[32px] border transition-all group",
                    v.is_active ? "border-whatsapp-green/50 shadow-xl shadow-whatsapp-green/5" : "border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10"
                  )}
                >
                  {v.is_active && (
                    <div className="absolute top-0 right-0 py-1 px-4 bg-whatsapp-green text-whatsapp-dark text-[9px] font-black uppercase tracking-widest rounded-bl-2xl">
                      Ativo Agora
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-whatsapp-teal/10 text-whatsapp-teal">
                          <BookOpen size={16} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{v.reference}</span>
                      </div>
                      
                      <p className="text-sm font-medium dark:text-white leading-relaxed italic">"{v.content}"</p>
                      
                      <div className="flex items-center gap-4 text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                         <span>Criado em: {new Date(v.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                         <span className="w-1 h-1 bg-gray-300 rounded-full" />
                         <span className="text-whatsapp-teal">{v.book_abbrev} {v.chapter}:{v.verse}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button 
                        onClick={() => toggleActive(v.id, v.is_active)}
                        className={cn(
                          "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                          v.is_active 
                            ? "bg-whatsapp-green text-whatsapp-dark shadow-lg shadow-whatsapp-green/20" 
                            : "bg-gray-100 dark:bg-white/5 text-gray-400 hover:text-whatsapp-green"
                        )}
                        title={v.is_active ? "Desativar" : "Ativar"}
                      >
                        <CheckCircle2 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteVerse(v.id)}
                        className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-400 hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center justify-center"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
