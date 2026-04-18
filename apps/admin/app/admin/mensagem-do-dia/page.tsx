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
  X,
  Flame,
  MessageCircle,
  Bell,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { BIBLE_BOOKS } from "@/lib/bible-data";
import { cn } from "@/lib/utils";
import moment from "moment";

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
  likes?: string[];
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
  const [shouldNotify, setShouldNotify] = useState(true);

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

      // Detecta referência bíblica
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

      setSearchResults(found.slice(0, 150));
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
    setBookAbbrev(result.bookAbbrev.toUpperCase());
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
      // 1. Desativar versículos atuais
      await supabase
        .from('daily_verses')
        .update({ is_active: false })
        .eq('is_active', true);

      // 2. Inserir Novo (Normalizado)
      const { data, error } = await supabase
        .from('daily_verses')
        .insert({
          content,
          reference,
          book_abbrev: bookAbbrev.toUpperCase(),
          chapter,
          verse,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      // 3. Notificação Global (Sinal de Edificação)
      if (shouldNotify) {
        await supabase.from('system_errors').insert({
          module: 'notifications',
          error_message: `[MENSAGEM_DIA] Nova Palavra do Dia publicada: ${reference}`,
          metadata: { id: data.id, ref: reference }
        });
      }

      setVerses([data, ...verses.map(v => ({ ...v, is_active: false }))]);
      setContent("");
      setReference("");
      toast.success("Nova Palavra do Dia enviada para toda a rede! 🙌");
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
        await supabase.from('daily_verses').update({ is_active: false }).neq('id', id);
      }

      const { error } = await supabase
        .from('daily_verses')
        .update({ is_active: !current })
        .eq('id', id);

      if (error) throw error;
      
      setVerses(verses.map(v => {
        if (v.id === id) return { ...v, is_active: !current };
        if (!current) return { ...v, is_active: false };
        return v;
      }));
      
      toast.success(current ? "Palavra recolhida" : "Palavra do Dia atualizada!");
    } catch (error) {
      toast.error("Erro ao alterar status");
    }
  }

  async function deleteVerse(id: string) {
    if (!confirm("Tem certeza que deseja apagar este histórico?")) return;
    try {
      const { error } = await supabase.from('daily_verses').delete().eq('id', id);
      if (error) throw error;
      setVerses(verses.filter(v => v.id !== id));
      toast.success("Expurgado com sucesso");
    } catch (error) {
      toast.error("Erro ao excluir");
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-whatsapp-dark dark:text-white flex items-center gap-3">
            <Sparkles className="text-whatsapp-green animate-pulse" />
            Console de Edificação Diária
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-medium italic">Controle atômico da marcação espiritual que todos os usuários verão ao abrir o App.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-whatsapp-green/10 text-whatsapp-green rounded-full border border-whatsapp-green/20 text-[10px] font-black uppercase tracking-widest">
           {verses.filter(v => v.is_active).length > 0 ? "Bússola Ativa" : "Vazio Espiritual"}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editor Column */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-whatsapp-green/5 blur-3xl -mr-16 -mt-16 group-hover:bg-whatsapp-green/10 transition-all duration-1000" />
            
            <h2 className="text-xs font-black uppercase tracking-widest mb-8 flex items-center gap-2 text-whatsapp-teal">
              <Plus size={16} className="text-whatsapp-green" />
              Preparar Nova Mensagem
            </h2>

            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Scanner Bíblico</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleBibleSearch(e as any); } }}
                    placeholder="Busque por tema ou referência..."
                    className="flex-1 bg-whatsapp-light dark:bg-whatsapp-dark border border-black/5 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-whatsapp-green transition-all outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={handleBibleSearch}
                    className="px-5 py-4 bg-whatsapp-green text-whatsapp-dark rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-whatsapp-green/20"
                  >
                    {searchLoading ? <RefreshCw className="animate-spin" size={18} /> : <Search size={18} />}
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <div className="max-h-60 overflow-y-auto space-y-1 rounded-2xl border border-whatsapp-green/10 p-2 bg-gray-50 dark:bg-whatsapp-dark animate-in slide-in-from-top-2 duration-300">
                    {searchResults.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => selectVerse(r)}
                        className="w-full text-left p-4 rounded-xl hover:bg-white dark:hover:bg-white/5 transition-all group"
                      >
                        <span className="text-[10px] font-black text-whatsapp-green uppercase tracking-wider">{r.book} {r.chapter}:{r.verse}</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic line-clamp-2 leading-relaxed font-medium">"{r.text}"</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Corpo do Versículo</label>
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Cole aqui ou use o buscador acima..."
                  className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border border-black/5 dark:border-white/5 rounded-3xl p-6 text-sm min-h-[140px] focus:ring-2 focus:ring-whatsapp-green transition-all outline-none font-medium text-gray-700 dark:text-gray-200"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Referência Visível</label>
                    <input 
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Ex: Salmos 23:1"
                      className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border border-black/5 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-2 focus:ring-whatsapp-green transition-all outline-none"
                      required
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">ID Livro (Sync)</label>
                    <input 
                      type="text"
                      value={bookAbbrev}
                      onChange={(e) => setBookAbbrev(e.target.value.toUpperCase())}
                      className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border border-black/5 dark:border-white/5 rounded-2xl px-5 py-4 text-sm font-black focus:ring-2 focus:ring-whatsapp-green transition-all outline-none text-whatsapp-teal"
                    />
                 </div>
              </div>

              <div className="flex items-center gap-4 bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5">
                 <button 
                  type="button"
                  onClick={() => setShouldNotify(!shouldNotify)}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                    shouldNotify ? "bg-whatsapp-green text-whatsapp-dark" : "bg-gray-200 text-gray-400"
                  )}
                 >
                   <Bell size={18} />
                 </button>
                 <div>
                   <p className="text-[10px] font-black uppercase tracking-widest dark:text-white">Broadcast Global</p>
                   <p className="text-[9px] text-gray-400 font-bold uppercase">Avisar toda a rede sobre a nova palavra</p>
                 </div>
              </div>

              <button 
                type="submit"
                disabled={saving}
                className="w-full py-5 bg-whatsapp-dark dark:bg-whatsapp-green text-white dark:text-whatsapp-dark rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-whatsapp-green/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 mt-6 mb-2"
              >
                {saving ? "Propagando..." : (
                  <>
                    <Save size={18} />
                    Firmar Palavra do Dia
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Impact History Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 dark:text-white">
              <History size={16} className="text-gray-400" />
              Métricas de Impacto
            </h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter italic">Resultados reais da edificação</p>
          </div>

          {loading ? (
             <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-40 bg-white/5 rounded-[40px] animate-pulse border border-white/5" />
                ))}
             </div>
          ) : verses.length === 0 ? (
            <div className="py-24 text-center bg-white dark:bg-whatsapp-darkLighter rounded-[40px] border border-dashed border-gray-200 dark:border-white/10 shadow-inner">
              <AlertCircle className="mx-auto w-12 h-12 text-gray-300 mb-4 opacity-20" />
              <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px]">Histórico Inexistente</p>
            </div>
          ) : (
            <div className="space-y-5">
              {verses.map((v) => (
                <div 
                  key={v.id} 
                  className={cn(
                    "relative overflow-hidden bg-white dark:bg-whatsapp-darkLighter p-8 rounded-[40px] border transition-all duration-500 group",
                    v.is_active ? "border-whatsapp-green shadow-xl shadow-whatsapp-green/10" : "border-gray-100 dark:border-white/5 hover:bg-gray-50/50 hover:dark:bg-white/[0.03]"
                  )}
                >
                  {v.is_active && (
                    <div className="absolute top-0 right-0 py-2 px-6 bg-whatsapp-green text-whatsapp-dark text-[10px] font-black uppercase tracking-widest rounded-bl-[24px] shadow-lg animate-pulse">
                      Em Exibição
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1.5 rounded-xl bg-whatsapp-teal/10 text-whatsapp-teal flex items-center gap-2 border border-whatsapp-teal/20">
                          <BookOpen size={14} />
                          <span className="text-[11px] font-black uppercase tracking-widest">{v.reference}</span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 tracking-tighter">
                          {moment(v.created_at).calendar()}
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium dark:text-gray-200 leading-relaxed italic border-l-2 border-whatsapp-green/20 pl-4 py-1">"{v.content}"</p>
                      
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 text-orange-500 rounded-full border border-orange-500/10">
                           <Flame size={12} className={v.is_active ? "animate-bounce" : ""} />
                           <span className="text-[10px] font-black">{v.likes?.length || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-whatsapp-green/10 text-whatsapp-green rounded-full border border-whatsapp-green/10">
                           <MessageCircle size={12} />
                           <span className="text-[10px] font-black">Auditado</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-start bg-gray-50 dark:bg-white/5 p-2 rounded-2xl border border-black/5 dark:border-white/5">
                      <button 
                        onClick={() => toggleActive(v.id, v.is_active)}
                        className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all shadow-sm active:scale-90",
                          v.is_active 
                            ? "bg-whatsapp-green text-whatsapp-dark shadow-whatsapp-green/30" 
                            : "bg-white dark:bg-white/5 text-gray-400 hover:text-whatsapp-green"
                        )}
                        title={v.is_active ? "Recolher do Feed" : "Propagar no Feed"}
                      >
                        <CheckCircle2 size={20} />
                      </button>
                      <button 
                        onClick={() => deleteVerse(id)}
                        className="w-12 h-12 rounded-xl bg-white dark:bg-white/5 text-gray-400 hover:bg-red-500/10 hover:text-red-500 transition-all flex items-center justify-center shadow-sm active:scale-90"
                        title="Expurgar do Histórico"
                      >
                        <Trash2 size={20} />
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
