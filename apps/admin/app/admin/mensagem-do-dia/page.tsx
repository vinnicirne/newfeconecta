"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Sparkles, Save, History, CheckCircle2, AlertCircle,
  Plus, Trash2, BookOpen, Search, X, Flame, Bell, 
  RefreshCw, Calendar, Send, Edit2, Clock, Check
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { BIBLE_BOOKS } from "@/lib/bible-data";
import { cn } from "@/lib/utils";
import moment from "moment";
import "moment/locale/pt-br";

moment.locale("pt-br");

const bibleCache: Record<string, any> = {};

interface DailyVerse {
  id: string;
  content: string;
  reference: string;
  translation?: string;
  book_abbrev?: string;
  chapter?: number;
  verse?: number;
  is_active: boolean;
  scheduled_for?: string;
  push_sent?: boolean;
  created_at: string;
}

export default function DailyVerseAdmin() {
  const [verses, setVerses] = useState<DailyVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Versículo de Hoje
  const [activeVerseId, setActiveVerseId] = useState<string | null>(null);
  const [reference, setReference] = useState("Jeremias 29:11");
  const [translation, setTranslation] = useState("Almeida Revista e Corrigida");
  const [content, setContent] = useState(
    "Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz, e não de mal, para vos dar o fim que esperais."
  );
  const [sendPush, setSendPush] = useState(true);

  // Scanner Bíblico
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Modal de Agendamento
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    reference: "",
    translation: "NVI (Nova Versão Internacional)",
    content: "",
    scheduled_for: moment().add(1, "day").format("YYYY-MM-DD"),
  });

  useEffect(() => {
    fetchVerses();

    // ⚡ Escuta Realtime de Versículos Diários
    const channel = supabase.channel("daily-verses-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "daily_verses" },
        () => {
          fetchVerses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchVerses() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("daily_verses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = data || [];
      setVerses(list);

      const active = list.find((v: DailyVerse) => v.is_active);
      if (active) {
        setActiveVerseId(active.id);
        setReference(active.reference || "Jeremias 29:11");
        setContent(active.content || "");
        setTranslation(active.translation || "Almeida Revista e Corrigida");
      }
    } catch (error: any) {
      console.error("[Versículo] Erro ao carregar versículos:", error);
      toast.error("Erro ao carregar versículo diário.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBibleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim().toLocaleLowerCase("pt-BR");
    if (q.length < 3) {
      toast.error("Digite pelo menos 3 caracteres para buscar na Bíblia.");
      return;
    }

    try {
      setSearchLoading(true);
      if (!bibleCache["nvi"]) {
        const res = await fetch("/bible/nvi.json");
        if (!res.ok) throw new Error("Arquivo da Bíblia não encontrado");
        bibleCache["nvi"] = await res.json();
      }

      // Detecção de livro e capítulo
      let refBook: any = null;
      let refChap: number | null = null;
      let refVerse: number | null = null;
      const refMatch = q.match(/^([a-záéíóúãõâêîôûç0-9\s]+?)\s+(\d+)(?:[:.\\-\sv]+(\d+))?$/i);
      if (refMatch) {
        const possibleBook = refMatch[1].trim();
        refChap = parseInt(refMatch[2]);
        if (refMatch[3]) refVerse = parseInt(refMatch[3]);
        const bMeta = BIBLE_BOOKS.find(
          (b) =>
            b.name.toLocaleLowerCase("pt-BR") === possibleBook ||
            b.name.toLocaleLowerCase("pt-BR").startsWith(possibleBook) ||
            b.abbrev.toLocaleLowerCase("pt-BR") === possibleBook
        );
        if (bMeta) refBook = bMeta;
      }

      const found: any[] = [];
      bibleCache["nvi"].forEach((book: any) => {
        const meta = BIBLE_BOOKS.find((b) => b.abbrev === book.abbrev);
        if (!meta) return;
        book.chapters.forEach((versesArr: string[], ci: number) => {
          const currentChap = ci + 1;
          versesArr.forEach((text: string, vi: number) => {
            const currentVerse = vi + 1;
            let isMatch = false;
            if (refBook && refBook.abbrev === meta.abbrev && currentChap === refChap) {
              isMatch = refVerse ? currentVerse === refVerse : true;
            } else if (!refBook) {
              isMatch = text.toLocaleLowerCase("pt-BR").includes(q);
            }
            if (isMatch) {
              found.push({
                book: meta.name,
                bookAbbrev: meta.abbrev,
                chapter: currentChap,
                verse: currentVerse,
                text,
              });
            }
          });
        });
      });

      setSearchResults(found.slice(0, 100));
      if (found.length === 0) toast.info("Nenhum versículo encontrado com este termo.");
    } catch {
      toast.error("Erro ao buscar no banco bíblico.");
    } finally {
      setSearchLoading(false);
    }
  }

  function selectVerse(result: any) {
    setContent(result.text);
    setReference(`${result.book} ${result.chapter}:${result.verse}`);
    setSearchResults([]);
    setSearchQuery("");
    toast.success(`Versículo selecionado: ${result.book} ${result.chapter}:${result.verse}`);
  }

  async function handleSaveActive() {
    if (!reference.trim() || !content.trim()) {
      toast.error("Preencha a referência e o texto do versículo.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Atualizando Versículo do Dia no feed...");
    try {
      // 1. Desativar versículos atuais
      await supabase
        .from("daily_verses")
        .update({ is_active: false })
        .eq("is_active", true);

      // 2. Inserir ou Atualizar Ativo
      const { data, error } = await supabase
        .from("daily_verses")
        .insert({
          reference: reference.trim(),
          content: content.trim(),
          translation: translation.trim(),
          is_active: true,
          scheduled_for: new Date().toISOString().split("T")[0],
        })
        .select()
        .single();

      if (error) throw error;

      // 3. Notificação Push opcional
      if (sendPush) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("fcm_token")
          .not("fcm_token", "is", null);

        if (profiles && profiles.length > 0) {
          const notifications = profiles.map((p) => ({
            user_id: null,
            fcm_token: p.fcm_token,
            title: `🙌 Versículo do Dia · ${reference.trim()}`,
            body: content.trim().substring(0, 120) + "...",
            metadata: { type: "daily_verse", id: data.id },
          }));

          for (let i = 0; i < notifications.length; i += 100) {
            await supabase.from("notifications").insert(notifications.slice(i, i + 100));
          }
        }
      }

      toast.success("Versículo do Dia salvo e publicado no topo do feed! 🙌", { id: toastId });
      fetchVerses();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar versículo: " + error.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateScheduled(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleData.reference.trim() || !scheduleData.content.trim()) {
      toast.error("Preencha a referência e o texto.");
      return;
    }

    const toastId = toast.loading("Agendando versículo...");
    try {
      const { error } = await supabase
        .from("daily_verses")
        .insert({
          reference: scheduleData.reference.trim(),
          content: scheduleData.content.trim(),
          translation: scheduleData.translation.trim(),
          is_active: false,
          scheduled_for: scheduleData.scheduled_for,
        });

      if (error) throw error;

      toast.success("Versículo agendado com sucesso! 📅", { id: toastId });
      setIsScheduleOpen(false);
      setScheduleData({
        reference: "",
        translation: "NVI (Nova Versão Internacional)",
        content: "",
        scheduled_for: moment().add(1, "day").format("YYYY-MM-DD"),
      });
      fetchVerses();
    } catch (error: any) {
      toast.error("Erro ao agendar: " + error.message, { id: toastId });
    }
  }

  async function handleDeleteVerse(id: string) {
    if (!confirm("Excluir este versículo do histórico?")) return;
    try {
      const { error } = await supabase.from("daily_verses").delete().eq("id", id);
      if (error) throw error;
      setVerses((prev) => prev.filter((v) => v.id !== id));
      toast.success("Versículo removido do histórico.");
    } catch (error: any) {
      toast.error("Erro ao excluir: " + error.message);
    }
  }

  async function handleActivateVerse(verseItem: DailyVerse) {
    const toastId = toast.loading(`Ativando ${verseItem.reference} como versículo de hoje...`);
    try {
      await supabase.from("daily_verses").update({ is_active: false }).neq("id", verseItem.id);
      await supabase.from("daily_verses").update({ is_active: true }).eq("id", verseItem.id);

      setReference(verseItem.reference);
      setContent(verseItem.content);
      setTranslation(verseItem.translation || "Almeida Revista e Corrigida");
      setActiveVerseId(verseItem.id);

      setVerses((prev) =>
        prev.map((v) => ({ ...v, is_active: v.id === verseItem.id }))
      );
      toast.success(`Versículo ${verseItem.reference} ativado no topo do feed!`, { id: toastId });
    } catch (error: any) {
      toast.error("Erro ao ativar versículo: " + error.message, { id: toastId });
    }
  }

  // Cálculo da data máxima programada
  const futureDates = verses
    .map((v) => v.scheduled_for)
    .filter(Boolean)
    .sort()
    .reverse();
  const maxScheduledDate = futureDates[0] ? moment(futureDates[0]).format("DD/MM/YYYY") : moment().format("DD/MM/YYYY");

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* ─── HEADER PRINCIPAL ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Versículo do dia
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green border border-whatsapp-teal/20">
              <Sparkles className="h-3 w-3" />
              Edificação Diária
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Programado até {maxScheduledDate} · {verses.length} versículos cadastrados no histórico
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchVerses}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-whatsapp-green")} />
            <span>Atualizar</span>
          </button>
          <button
            onClick={() => setIsScheduleOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-whatsapp-teal text-white text-xs font-semibold hover:bg-whatsapp-tealLight transition-colors shadow-sm active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Agendar versículo</span>
          </button>
        </div>
      </div>

      {/* ─── PAINEL: VERSÍCULO DE HOJE ─── */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
        <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-foreground">Versículo de hoje</h2>
            <p className="text-xs text-muted-foreground">Exibido no topo do feed principal e no disparo de push matinal</p>
          </div>

          {/* Scanner Rápido */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleBibleSearch(e); } }}
              placeholder="Buscar livro, cap:versículo..."
              className="w-full h-8 pl-8 pr-8 rounded-lg border border-border bg-muted/50 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
            />
            {searchLoading && (
              <RefreshCw className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-whatsapp-green" />
            )}
          </div>
        </div>

        {/* Dropdown de resultados do scanner bíblico */}
        {searchResults.length > 0 && (
          <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-border p-2 bg-muted/40 animate-in fade-in">
            <div className="flex items-center justify-between px-2 pb-1 border-b border-border/50 text-[10px] font-bold text-muted-foreground uppercase">
              <span>Resultados da Bíblia NVI</span>
              <button onClick={() => setSearchResults([])} className="hover:text-foreground">Fechar</button>
            </div>
            {searchResults.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectVerse(r)}
                className="w-full text-left p-2 rounded-lg hover:bg-card transition-colors text-xs space-y-0.5"
              >
                <span className="font-bold text-whatsapp-teal dark:text-whatsapp-green text-[11px] block">
                  {r.book} {r.chapter}:{r.verse}
                </span>
                <p className="text-muted-foreground line-clamp-1 italic text-[11px]">"{r.text}"</p>
              </button>
            ))}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Referência
              <span className="text-[11px] text-muted-foreground font-normal ml-1.5">(Livro, capítulo e versículo)</span>
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Ex: Jeremias 29:11"
              className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Tradução
              <span className="text-[11px] text-muted-foreground font-normal ml-1.5">(Versão bíblica utilizada)</span>
            </label>
            <input
              type="text"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              placeholder="Ex: Almeida Revista e Corrigida / NVI"
              className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-foreground mb-1">
              Texto Bíblico
              <span className="text-[11px] text-muted-foreground font-normal ml-1.5">(Aparece no card do feed e no app)</span>
            </label>
            <textarea
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Digite ou cole o texto das escrituras..."
              className="w-full rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green leading-relaxed"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-foreground mb-1">
              Disparo Automático de Push
              <span className="text-[11px] text-muted-foreground font-normal ml-1.5">(Dispara às 06:00 no fuso do usuário)</span>
            </label>
            <div 
              onClick={() => setSendPush(!sendPush)}
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 w-fit cursor-pointer select-none hover:bg-muted/60 transition-colors"
            >
              <span className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                sendPush ? "bg-whatsapp-teal" : "bg-muted-foreground/30"
              )}>
                <span className={cn(
                  "inline-block size-3.5 rounded-full bg-white transition-transform",
                  sendPush ? "translate-x-4" : "translate-x-1"
                )} />
              </span>
              <span className="text-xs font-medium text-foreground">
                {sendPush ? "Push diário matinal ativado" : "Push desativado"}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex items-center gap-2">
          <button
            onClick={handleSaveActive}
            disabled={saving}
            className="h-9 rounded-lg bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white px-4 text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Salvar alterações</span>
          </button>
          <button
            onClick={fetchVerses}
            className="h-9 rounded-lg border border-border px-4 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            Descartar
          </button>
        </div>
      </div>

      {/* ─── PAINEL: PROGRAMAÇÃO & HISTÓRICO ─── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border bg-muted/20">
          <h2 className="text-sm font-bold text-foreground">Programação & Histórico</h2>
          <p className="text-xs text-muted-foreground">Próximos versículos agendados e histórico de palavras publicadas</p>
        </div>

        <div className="divide-y divide-border/60">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              Carregando programação de versículos...
            </div>
          ) : verses.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <BookOpen className="h-8 w-8 text-whatsapp-teal dark:text-whatsapp-green mx-auto opacity-70" />
              <h3 className="text-sm font-semibold text-foreground">Nenhum versículo registrado</h3>
              <p className="text-xs text-muted-foreground">Cadastre o primeiro versículo usando o formulário acima.</p>
            </div>
          ) : (
            verses.map((verseItem) => {
              const isCurrent = verseItem.is_active;

              return (
                <div
                  key={verseItem.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {isCurrent ? "Hoje" : moment(verseItem.created_at).format("DD/MM")} · {verseItem.reference}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {isCurrent ? "Ativo no topo do feed · Disparo matinal configurado" : `"${verseItem.content.substring(0, 70)}..."`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Publicado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Histórico
                      </span>
                    )}

                    {!isCurrent && (
                      <button
                        onClick={() => handleActivateVerse(verseItem)}
                        className="text-[11px] font-semibold text-whatsapp-teal dark:text-whatsapp-green hover:underline"
                      >
                        Ativar Hoje
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteVerse(verseItem.id)}
                      className="p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── MODAL DE AGENDAR VERSÍCULO ─── */}
      <DialogPrimitive.Root open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card p-6 rounded-2xl z-50 border border-border shadow-2xl animate-in zoom-in-95 text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Agendar Novo Versículo</h3>
                  <p className="text-[11px] text-muted-foreground">Programe para publicação automática em uma data futura</p>
                </div>
              </div>
              <DialogPrimitive.Close className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            <form onSubmit={handleCreateScheduled} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground font-medium mb-1">Data de Publicação</label>
                  <input
                    type="date"
                    required
                    value={scheduleData.scheduled_for}
                    onChange={(e) => setScheduleData({ ...scheduleData, scheduled_for: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-muted/50 text-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground font-medium mb-1">Referência Bíblica</label>
                  <input
                    type="text"
                    required
                    value={scheduleData.reference}
                    onChange={(e) => setScheduleData({ ...scheduleData, reference: e.target.value })}
                    placeholder="Ex: Filipenses 4:13"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Tradução</label>
                <input
                  type="text"
                  value={scheduleData.translation}
                  onChange={(e) => setScheduleData({ ...scheduleData, translation: e.target.value })}
                  placeholder="Ex: NVI / ARC"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Texto Bíblico *</label>
                <textarea
                  rows={3}
                  required
                  value={scheduleData.content}
                  onChange={(e) => setScheduleData({ ...scheduleData, content: e.target.value })}
                  placeholder="Texto completo do versículo..."
                  className="w-full p-2.5 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                </DialogPrimitive.Close>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white font-semibold transition-colors"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
