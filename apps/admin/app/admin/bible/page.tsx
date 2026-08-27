"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  BookOpen, Sparkles, Search, RefreshCw, Check, 
  Share2, Heart, Highlighter, FileText, ArrowUpRight,
  MessageSquare, Send, CheckCircle2, Wand2, Eye, EyeOff, Flame
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import moment from "moment";
import "moment/locale/pt-br";
import { BIBLE_BOOKS } from "@/lib/bible-data";

moment.locale("pt-br");

interface BibleConfig {
  default_version: "nvi" | "acf" | "arc" | "nvt";
  featured_verse: {
    book: string;
    chapter: number;
    verse: number;
    text: string;
    version: string;
    theme: string;
  };
  enable_ai_exegesis: boolean;
  allow_verse_comments: boolean;
  enable_verse_feed_share: boolean;
  reading_plan_active: boolean;
}

interface FeedControls {
  show_daily_verse: boolean;
  show_fenamoro_banner: boolean;
}

interface RealStats {
  favoritesCount: number;
  highlightsCount: number;
  notesCount: number;
  sharesCount: number;
}

export default function AdminBiblePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingVerse, setApplyingVerse] = useState(false);
  const [fetchingText, setFetchingText] = useState(false);
  const [searchBook, setSearchBook] = useState("");
  const [selectedTestament, setSelectedTestament] = useState<"ALL" | "VT" | "NT">("ALL");

  const [config, setConfig] = useState<BibleConfig>({
    default_version: "nvi",
    featured_verse: {
      book: "Salmos",
      chapter: 23,
      verse: 1,
      text: "O Senhor é o meu pastor; de nada terei falta.",
      version: "NVI",
      theme: "Confiança e Provisão",
    },
    enable_ai_exegesis: true,
    allow_verse_comments: true,
    enable_verse_feed_share: true,
    reading_plan_active: true,
  });

  // Controles de Visibilidade no Feed (Palavra do Dia e FéNamoro)
  const [feedControls, setFeedControls] = useState<FeedControls>({
    show_daily_verse: true,
    show_fenamoro_banner: true,
  });

  // Métricas 100% REAIS diretamente do Supabase (Zero Mocks)
  const [stats, setStats] = useState<RealStats>({
    favoritesCount: 0,
    highlightsCount: 0,
    notesCount: 0,
    sharesCount: 0,
  });

  useEffect(() => {
    loadAllData();

    // Sincronização em tempo real via WebSocket
    const channel = supabase.channel("admin_bible_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_configs" },
        () => loadConfigsOnly()
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  }, []);

  const loadConfigsOnly = async () => {
    try {
      const [bibleRes, feedRes] = await Promise.allSettled([
        supabase.from("system_configs").select("value").eq("key", "bible_system_config_v2").maybeSingle(),
        supabase.from("system_configs").select("value").eq("key", "feed_display_controls_v1").maybeSingle(),
      ]);

      if (bibleRes.status === "fulfilled" && bibleRes.value.data?.value) {
        setConfig(bibleRes.value.data.value);
      }

      if (feedRes.status === "fulfilled" && feedRes.value.data?.value) {
        setFeedControls({
          show_daily_verse: feedRes.value.data.value.show_daily_verse ?? true,
          show_fenamoro_banner: feedRes.value.data.value.show_fenamoro_banner ?? true,
        });
      }
    } catch (err) {
      console.warn("[Bible] Erro ao sincronizar configs:", err);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        configRes,
        feedRes,
        favRes,
        highRes,
        noteRes,
        shareRes
      ] = await Promise.allSettled([
        supabase.from("system_configs").select("value").eq("key", "bible_system_config_v2").maybeSingle(),
        supabase.from("system_configs").select("value").eq("key", "feed_display_controls_v1").maybeSingle(),
        supabase.from("bible_interactions").select("*", { count: "exact", head: true }).eq("is_favorite", true),
        supabase.from("bible_interactions").select("*", { count: "exact", head: true }).not("highlight_color", "is", null),
        supabase.from("bible_interactions").select("*", { count: "exact", head: true }).not("comment", "is", null),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("post_type", "verse_share"),
      ]);

      if (configRes.status === "fulfilled" && configRes.value.data?.value) {
        setConfig(configRes.value.data.value);
      }

      if (feedRes.status === "fulfilled" && feedRes.value.data?.value) {
        setFeedControls({
          show_daily_verse: feedRes.value.data.value.show_daily_verse ?? true,
          show_fenamoro_banner: feedRes.value.data.value.show_fenamoro_banner ?? true,
        });
      }

      setStats({
        favoritesCount: favRes.status === "fulfilled" ? (favRes.value.count || 0) : 0,
        highlightsCount: highRes.status === "fulfilled" ? (highRes.value.count || 0) : 0,
        notesCount: noteRes.status === "fulfilled" ? (noteRes.value.count || 0) : 0,
        sharesCount: shareRes.status === "fulfilled" ? (shareRes.value.count || 0) : 0,
      });

    } catch (err) {
      console.error("[Bible] Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  // Alternar Visibilidade dos Cards do Feed Instantaneamente
  const handleToggleFeedControl = async (key: keyof FeedControls) => {
    const updated = {
      ...feedControls,
      [key]: !feedControls[key]
    };
    setFeedControls(updated);

    try {
      await supabase.from("system_configs").upsert({
        key: "feed_display_controls_v1",
        value: updated,
        updated_at: new Date().toISOString(),
      });

      const label = key === "show_daily_verse" ? "Palavra do Dia no Feed" : "Card FéNamoro no Feed";
      const statusText = updated[key] ? "ATIVADO" : "DESATIVADO";
      toast.success(`${label} ${statusText} com sucesso! 🙌`);
    } catch (err: any) {
      toast.error("Erro ao atualizar controle do feed: " + err.message);
    }
  };

  // 📖 Busca automática do texto do versículo diretamente dos arquivos da Bíblia
  const handleAutoFetchVerseText = async (bookName = config.featured_verse.book, chapter = config.featured_verse.chapter, verse = config.featured_verse.verse, version = config.featured_verse.version) => {
    setFetchingText(true);
    try {
      const bookObj = BIBLE_BOOKS.find(b => b.name.toLowerCase() === bookName.toLowerCase() || b.abbrev.toLowerCase() === bookName.toLowerCase());
      if (!bookObj) {
        toast.error("Livro não encontrado no catálogo.");
        return;
      }

      const versionFile = version.toLowerCase() === "acf" ? "acf" : (version.toLowerCase() === "aa" ? "aa" : "nvi");
      const res = await fetch(`/bible/${versionFile}.json`);
      if (!res.ok) throw new Error("Arquivo da versão bíblica não encontrado.");

      const bibleData = await res.json();
      const targetBook = bibleData.find((b: any) => b.abbrev.toLowerCase() === bookObj.abbrev.toLowerCase());

      if (targetBook && targetBook.chapters[chapter - 1] && targetBook.chapters[chapter - 1][verse - 1]) {
        const foundText = targetBook.chapters[chapter - 1][verse - 1];
        setConfig(prev => ({
          ...prev,
          featured_verse: {
            ...prev.featured_verse,
            book: bookObj.name,
            chapter,
            verse,
            text: foundText,
            version,
          }
        }));
        toast.success(`Texto de ${bookObj.name} ${chapter}:${verse} carregado!`);
      } else {
        toast.warning(`Capítulo ou versículo não localizado em ${bookObj.name}.`);
      }
    } catch (err: any) {
      toast.error("Erro ao buscar texto: " + err.message);
    } finally {
      setFetchingText(false);
    }
  };

  // 🚀 Ação Direta: Aplicar e Publicar Palavra do Dia
  const handleApplyFeaturedVerse = async () => {
    setApplyingVerse(true);
    const toastId = toast.loading("Aplicando e publicando Palavra do Dia na rede...");
    try {
      const referenceText = `${config.featured_verse.book} ${config.featured_verse.chapter}:${config.featured_verse.verse}`;

      // 1. Atualiza nas configurações gerais da Bíblia
      await supabase.from("system_configs").upsert({
        key: "bible_system_config_v2",
        value: config,
        updated_at: new Date().toISOString(),
      });

      // 2. Desativa os versículos ativos anteriores
      await supabase
        .from("daily_verses")
        .update({ is_active: false })
        .eq("is_active", true);

      // 3. Insere o novo Versículo do Dia no schema real
      const { error: insertError } = await supabase.from("daily_verses").insert({
        reference: referenceText,
        content: config.featured_verse.text,
        translation: config.featured_verse.version,
        is_active: true,
        scheduled_for: new Date().toISOString().split("T")[0],
      });

      if (insertError) throw insertError;

      toast.success(`Palavra do Dia (${referenceText}) aplicada e publicada com sucesso! 🙌✨`, { id: toastId });
    } catch (err: any) {
      console.error("[Bible] Erro ao aplicar versículo:", err);
      toast.error("Erro ao aplicar: " + err.message, { id: toastId });
    } finally {
      setApplyingVerse(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const toastId = toast.loading("Salvando parâmetros gerais da Bíblia...");
    try {
      await handleApplyFeaturedVerse();
      toast.success("Todas as configurações foram salvas com sucesso! 📖", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const filteredBooks = BIBLE_BOOKS.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(searchBook.toLowerCase()) || b.abbrev.toLowerCase().includes(searchBook.toLowerCase());
    const matchesTestament = selectedTestament === "ALL" || b.testament === selectedTestament;
    return matchesSearch && matchesTestament;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* ─── HEADER PRINCIPAL COM UI/UX REFINADA ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Controle da Bíblia Sagrada & Estudos
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <BookOpen className="h-3.5 w-3.5" />
              Palavra & Exegese
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gerencie traduções bíblicas, versículo em destaque no feed e ferramentas de IA teológica.
          </p>
        </div>

        {/* Botões de Ação do Header */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href="/bible"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors shadow-sm"
          >
            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
            <span>Abrir Leitor da Bíblia</span>
          </Link>

          <button
            onClick={loadAllData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-whatsapp-green")} />
            <span>Atualizar</span>
          </button>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-whatsapp-teal text-white text-xs font-semibold hover:bg-whatsapp-tealLight transition-colors shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>{saving ? "Salvando..." : "Salvar Configuração"}</span>
          </button>
        </div>
      </div>

      {/* ─── CONTROLES DE EXIBIÇÃO NO FEED (ATIVAR / DESATIVAR PALAVRA DO DIA & FÉNAMORO) ─── */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Controles de Visibilidade no Feed da Comunidade
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Ative ou desative os cards no topo do feed dos membros em tempo real.
            </p>
          </div>
          <span className="text-[10px] font-bold text-whatsapp-teal dark:text-whatsapp-green bg-whatsapp-teal/10 px-2 py-0.5 rounded">
            Tempo Real (WebSocket)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Toggle: Palavra do Dia no Feed */}
          <div
            onClick={() => handleToggleFeedControl("show_daily_verse")}
            className={cn(
              "flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none",
              feedControls.show_daily_verse 
                ? "bg-amber-500/5 border-amber-500/30 hover:bg-amber-500/10" 
                : "bg-muted/20 border-border opacity-70 hover:opacity-100"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                feedControls.show_daily_verse ? "bg-amber-500/10 text-amber-500" : "bg-muted text-muted-foreground"
              )}>
                {feedControls.show_daily_verse ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Palavra do Dia no Feed</p>
                <p className="text-[11px] text-muted-foreground">
                  {feedControls.show_daily_verse ? "Visível no topo do feed dos membros" : "Ocultado do feed de todos os usuários"}
                </p>
              </div>
            </div>

            <span className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
              feedControls.show_daily_verse ? "bg-amber-500" : "bg-muted-foreground/30"
            )}>
              <span className={cn(
                "inline-block size-3.5 rounded-full bg-white transition-transform",
                feedControls.show_daily_verse ? "translate-x-4" : "translate-x-1"
              )} />
            </span>
          </div>

          {/* Toggle: Card FéNamoro no Feed */}
          <div
            onClick={() => handleToggleFeedControl("show_fenamoro_banner")}
            className={cn(
              "flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none",
              feedControls.show_fenamoro_banner 
                ? "bg-pink-500/5 border-pink-500/30 hover:bg-pink-500/10" 
                : "bg-muted/20 border-border opacity-70 hover:opacity-100"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                feedControls.show_fenamoro_banner ? "bg-pink-500/10 text-pink-500" : "bg-muted text-muted-foreground"
              )}>
                <Heart className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Card Promocional FéNamoro</p>
                <p className="text-[11px] text-muted-foreground">
                  {feedControls.show_fenamoro_banner ? "Banner ativo no feed e no menu" : "Card e link ocultados de toda a rede"}
                </p>
              </div>
            </div>

            <span className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0",
              feedControls.show_fenamoro_banner ? "bg-pink-500" : "bg-muted-foreground/30"
            )}>
              <span className={cn(
                "inline-block size-3.5 rounded-full bg-white transition-transform",
                feedControls.show_fenamoro_banner ? "translate-x-4" : "translate-x-1"
              )} />
            </span>
          </div>
        </div>
      </div>

      {/* ─── 4 CARDS DE MÉTRICAS REAIS DO SUPABASE (ZERO MOCKS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Favoritados */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Versículos Favoritados</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Heart className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.favoritesCount.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] text-muted-foreground">por membros</span>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground border-t border-border/50 pt-2 flex items-center justify-between">
            <span>Interações salvas</span>
            <span className="text-amber-500 font-medium">Bíblia Pessoal</span>
          </div>
        </div>

        {/* Card 2: Marcações com Marca-Texto */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Versículos Grifados</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Highlighter className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.highlightsCount.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] text-muted-foreground">destaques</span>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground border-t border-border/50 pt-2 flex items-center justify-between">
            <span>Marcações coloridas</span>
            <span className="text-emerald-500 font-medium">6 Cores</span>
          </div>
        </div>

        {/* Card 3: Anotações & Devocionais */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Anotações Bíblicas</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.notesCount.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] text-muted-foreground">reflexões</span>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground border-t border-border/50 pt-2 flex items-center justify-between">
            <span>Devocionais pessoais</span>
            <span className="text-blue-500 font-medium">Estudos</span>
          </div>
        </div>

        {/* Card 4: Compartilhamentos no Feed */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Reposts no Feed</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Share2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.sharesCount.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] text-muted-foreground">compartilhados</span>
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground border-t border-border/50 pt-2 flex items-center justify-between">
            <span>Versículos na timeline</span>
            <span className="text-purple-500 font-medium">Feed da Fé</span>
          </div>
        </div>
      </div>

      {/* ─── GRID CENTRAL: CONFIGURAÇÕES & CATÁLOGO BÍBLICO ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA 1 & 2: VERSÍCULO EM DESTAQUE & PARÂMETROS */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Versículo em Destaque do Dia com Ação Direta de Aplicação */}
          <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
            <div className="border-b border-border pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">Versículo em Destaque do Dia</h3>
                <p className="text-xs text-muted-foreground">Exibido no cabeçalho da Bíblia e publicado como Palavra do Dia no feed</p>
              </div>
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 self-start sm:self-auto">
                Palavra do Dia
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Livro da Bíblia</label>
                <select
                  value={config.featured_verse.book}
                  onChange={(e) => {
                    const newBook = e.target.value;
                    setConfig({
                      ...config,
                      featured_verse: { ...config.featured_verse, book: newBook }
                    });
                    handleAutoFetchVerseText(newBook, config.featured_verse.chapter, config.featured_verse.verse);
                  }}
                  className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
                >
                  {BIBLE_BOOKS.map(b => (
                    <option key={b.id} value={b.name}>{b.name} ({b.abbrev.toUpperCase()})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Capítulo</label>
                <input
                  type="number"
                  min={1}
                  value={config.featured_verse.chapter}
                  onChange={(e) => setConfig({
                    ...config,
                    featured_verse: { ...config.featured_verse, chapter: Math.max(1, Number(e.target.value)) }
                  })}
                  className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Versículo</label>
                <input
                  type="number"
                  min={1}
                  value={config.featured_verse.verse}
                  onChange={(e) => setConfig({
                    ...config,
                    featured_verse: { ...config.featured_verse, verse: Math.max(1, Number(e.target.value)) }
                  })}
                  className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">Texto Sagrado</label>
                <button
                  type="button"
                  onClick={() => handleAutoFetchVerseText()}
                  disabled={fetchingText}
                  className="inline-flex items-center gap-1 text-[11px] text-whatsapp-teal dark:text-whatsapp-green hover:underline font-semibold disabled:opacity-50"
                >
                  <Wand2 className={cn("h-3 w-3", fetchingText && "animate-spin")} />
                  <span>{fetchingText ? "Buscando..." : "Buscar texto na Bíblia"}</span>
                </button>
              </div>
              <textarea
                rows={3}
                value={config.featured_verse.text}
                onChange={(e) => setConfig({
                  ...config,
                  featured_verse: { ...config.featured_verse, text: e.target.value }
                })}
                className="w-full rounded-lg border border-border bg-muted/30 p-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-serif leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Tema / Mensagem</label>
                <input
                  type="text"
                  value={config.featured_verse.theme}
                  onChange={(e) => setConfig({
                    ...config,
                    featured_verse: { ...config.featured_verse, theme: e.target.value }
                  })}
                  placeholder="Ex: Confiança e Provisão"
                  className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Versão Tradução</label>
                <select
                  value={config.featured_verse.version}
                  onChange={(e) => {
                    const newVer = e.target.value;
                    setConfig({
                      ...config,
                      featured_verse: { ...config.featured_verse, version: newVer }
                    });
                    handleAutoFetchVerseText(config.featured_verse.book, config.featured_verse.chapter, config.featured_verse.verse, newVer);
                  }}
                  className="h-9 w-full rounded-lg border border-border bg-muted/30 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
                >
                  <option value="NVI">NVI — Nova Versão Internacional</option>
                  <option value="ACF">ACF — Almeida Corrigida Fiel</option>
                  <option value="AA">AA — Almeida Atualizada</option>
                  <option value="ARC">ARC — Almeida Revista e Corrigida</option>
                </select>
              </div>
            </div>

            {/* 🚀 BOTÃO DEDICADO DE APLICAÇÃO DA PALAVRA DO DIA */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/40">
              <span className="text-[11px] text-muted-foreground text-center sm:text-left">
                Ao clicar em aplicar, a Palavra do Dia será publicada instantaneamente no feed da rede.
              </span>
              <button
                type="button"
                onClick={handleApplyFeaturedVerse}
                disabled={applyingVerse}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-9 px-5 rounded-lg bg-whatsapp-teal text-white text-xs font-bold hover:bg-whatsapp-tealLight transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0"
              >
                <Send className={cn("h-3.5 w-3.5", applyingVerse && "animate-spin")} />
                <span>{applyingVerse ? "Publicando..." : "Aplicar Palavra do Dia"}</span>
              </button>
            </div>
          </div>

          {/* Card: Parâmetros & Recursos de Exegese */}
          <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">Recursos & Inteligência Bíblica</h3>
              <p className="text-xs text-muted-foreground">Controle de comentários, plano de leitura e exegese teológica</p>
            </div>

            <div className="space-y-3">
              {/* Toggle 1: IA Exegese */}
              <div 
                onClick={() => setConfig({ ...config, enable_ai_exegesis: !config.enable_ai_exegesis })}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 cursor-pointer select-none hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Exegese Bíblica com IA (Gemini)</p>
                    <p className="text-[11px] text-muted-foreground">Permite aos membros consultar o contexto histórico, grego e hebraico dos versículos.</p>
                  </div>
                </div>
                <span className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  config.enable_ai_exegesis ? "bg-whatsapp-teal" : "bg-muted-foreground/30"
                )}>
                  <span className={cn(
                    "inline-block size-3.5 rounded-full bg-white transition-transform",
                    config.enable_ai_exegesis ? "translate-x-4" : "translate-x-1"
                  )} />
                </span>
              </div>

              {/* Toggle 2: Comentários nos Versículos */}
              <div 
                onClick={() => setConfig({ ...config, allow_verse_comments: !config.allow_verse_comments })}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 cursor-pointer select-none hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Comentários & Reflexões Comunitárias</p>
                    <p className="text-[11px] text-muted-foreground">Habilita a aba de reflexões cristãs e testemunhos vinculados a cada versículo.</p>
                  </div>
                </div>
                <span className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  config.allow_verse_comments ? "bg-whatsapp-teal" : "bg-muted-foreground/30"
                )}>
                  <span className={cn(
                    "inline-block size-3.5 rounded-full bg-white transition-transform",
                    config.allow_verse_comments ? "translate-x-4" : "translate-x-1"
                  )} />
                </span>
              </div>

              {/* Toggle 3: Compartilhamento Rápido no Feed */}
              <div 
                onClick={() => setConfig({ ...config, enable_verse_feed_share: !config.enable_verse_feed_share })}
                className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20 cursor-pointer select-none hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Share2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Botão de Compartilhar no Feed</p>
                    <p className="text-[11px] text-muted-foreground">Gera um card visual estilizado de repost bíblico com um clique.</p>
                  </div>
                </div>
                <span className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  config.enable_verse_feed_share ? "bg-whatsapp-teal" : "bg-muted-foreground/30"
                )}>
                  <span className={cn(
                    "inline-block size-3.5 rounded-full bg-white transition-transform",
                    config.enable_verse_feed_share ? "translate-x-4" : "translate-x-1"
                  )} />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA 3: CATÁLOGO DOS 66 LIVROS SAGRADOS */}
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                Livros da Bíblia (66)
              </h3>
              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                VT: 39 · NT: 27
              </span>
            </div>

            {/* Filtros de Livros */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar livro ou sigla (ex: sl, mt)..."
                  value={searchBook}
                  onChange={(e) => setSearchBook(e.target.value)}
                  className="h-8 w-full rounded-lg border border-border bg-muted/30 pl-8 pr-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green"
                />
              </div>

              <div className="flex items-center gap-1.5 pt-1">
                <button
                  onClick={() => setSelectedTestament("ALL")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors",
                    selectedTestament === "ALL" ? "bg-whatsapp-teal text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  Todos (66)
                </button>
                <button
                  onClick={() => setSelectedTestament("VT")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors",
                    selectedTestament === "VT" ? "bg-whatsapp-teal text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  VT (39)
                </button>
                <button
                  onClick={() => setSelectedTestament("NT")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors",
                    selectedTestament === "NT" ? "bg-whatsapp-teal text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  NT (27)
                </button>
              </div>
            </div>

            {/* Lista dos Livros */}
            <div className="max-h-[420px] overflow-y-auto space-y-1 pr-1 divide-y divide-border/30">
              {filteredBooks.map((b) => (
                <div
                  key={b.id}
                  className="pt-1.5 first:pt-0 flex items-center justify-between text-xs py-1.5 hover:bg-muted/30 px-2 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-muted-foreground w-5">
                      {b.id}.
                    </span>
                    <span className="font-semibold text-foreground">{b.name}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold bg-muted px-1.5 py-0.2 rounded">
                      {b.abbrev}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {b.chapters} caps
                    </span>
                    <Link
                      href={`/bible?verse=${b.abbrev}1:1`}
                      title={`Abrir leitor em ${b.name}`}
                      className="p-1 rounded-md bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green hover:bg-whatsapp-teal hover:text-white transition-colors opacity-80 group-hover:opacity-100"
                    >
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
