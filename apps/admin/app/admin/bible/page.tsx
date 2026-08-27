"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  BookOpen, Sparkles, Search, RefreshCw, Check, 
  Share2, Eye, Flame, Bookmark, ArrowUpRight, Plus, 
  Sliders, MessageSquare, Layers, CheckCircle2, ShieldCheck,
  FileText, Globe
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

export default function AdminBiblePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  const [stats, setStats] = useState({
    totalChaptersRead: 14820,
    versesShared: 3412,
    mostReadBook: "Salmos (28%)",
    aiExegesisRequests: 894,
  });

  useEffect(() => {
    fetchConfigs();

    // ⚡ Realtime WebSockets para Configurações da Bíblia
    const channel = supabase.channel("bible-admin-monitor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_configs" },
        () => {
          fetchConfigs();
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("system_configs")
        .select("value")
        .eq("key", "bible_system_config_v2")
        .maybeSingle();

      if (data?.value) {
        setConfig(data.value);
      }
    } catch {
      console.warn("[Bible] Usando configurações padrão.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading("Salvando parâmetros da Bíblia Sagrada...");
    try {
      await Promise.all([
        supabase.from("system_configs").upsert({
          key: "bible_system_config_v2",
          value: config,
          updated_at: new Date().toISOString(),
        }),
        supabase.from("system_errors").insert({
          module: "bible_admin",
          error_message: `[BÍBLIA] Configurações e versículo em destaque atualizados`,
          metadata: config,
        }),
      ]);

      toast.success("Configurações da Bíblia salvas e aplicadas à rede! 📖✨", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao salvar configurações: " + err.message, { id: toastId });
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
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* ─── HEADER PRINCIPAL ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Controle da Bíblia Sagrada & Estudos
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <BookOpen className="h-3 w-3" />
              Palavra & Exegese
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Gerencie versões bíblicas, versículo em destaque, plano de leitura e recursos de IA no app.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchConfigs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-whatsapp-green")} />
            <span>Atualizar</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-whatsapp-teal text-white text-xs font-semibold hover:bg-whatsapp-tealLight transition-colors shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{saving ? "Salvando..." : "Salvar Configuração"}</span>
          </button>
        </div>
      </div>

      {/* ─── 4 CARDS DE MÉTRICAS (STATS GRID) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Capítulos Lidos */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Capítulos Lidos (Mês)</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {stats.totalChaptersRead.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              +12% mês
            </span>
          </div>
        </div>

        {/* Versículos Compartilhados */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Compartilhamentos no Feed</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Share2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {stats.versesShared.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
              Reposts bíblicos
            </span>
          </div>
        </div>

        {/* Livro Mais Lido */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Livro Mais Lido</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {stats.mostReadBook}
            </span>
          </div>
        </div>

        {/* Consultas IA Exegese */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Consultas de Exegese IA</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {stats.aiExegesisRequests.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
              Gemini AI Pro
            </span>
          </div>
        </div>
      </div>

      {/* ─── GRID DE CONFIGURAÇÃO E VERSÍCULO EM DESTAQUE ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA 1 & 2: VERSÍCULO EM DESTAQUE & PARÂMETROS */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Versículo em Destaque no Topo da Bíblia */}
          <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
            <div className="border-b border-border pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Versículo em Destaque do Dia</h3>
                <p className="text-xs text-muted-foreground">Exibido no cabeçalho da Bíblia e no feed dos membros</p>
              </div>
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                Palavra do Dia
              </span>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Livro</label>
                <input
                  type="text"
                  value={config.featured_verse.book}
                  onChange={(e) => setConfig({
                    ...config,
                    featured_verse: { ...config.featured_verse, book: e.target.value }
                  })}
                  className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Capítulo</label>
                <input
                  type="number"
                  value={config.featured_verse.chapter}
                  onChange={(e) => setConfig({
                    ...config,
                    featured_verse: { ...config.featured_verse, chapter: Number(e.target.value) }
                  })}
                  className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Versículo</label>
                <input
                  type="number"
                  value={config.featured_verse.verse}
                  onChange={(e) => setConfig({
                    ...config,
                    featured_verse: { ...config.featured_verse, verse: Number(e.target.value) }
                  })}
                  className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Texto Sagrado</label>
              <textarea
                rows={3}
                value={config.featured_verse.text}
                onChange={(e) => setConfig({
                  ...config,
                  featured_verse: { ...config.featured_verse, text: e.target.value }
                })}
                className="w-full rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-serif leading-relaxed"
              />
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Tema / Mensagem</label>
                <input
                  type="text"
                  value={config.featured_verse.theme}
                  onChange={(e) => setConfig({
                    ...config,
                    featured_verse: { ...config.featured_verse, theme: e.target.value }
                  })}
                  placeholder="Ex: Confiança e Provisão"
                  className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Versão Tradução</label>
                <select
                  value={config.featured_verse.version}
                  onChange={(e) => setConfig({
                    ...config,
                    featured_verse: { ...config.featured_verse, version: e.target.value }
                  })}
                  className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
                >
                  <option value="NVI">NVI — Nova Versão Internacional</option>
                  <option value="ACF">ACF — Almeida Corrigida Fiel</option>
                  <option value="ARC">ARC — Almeida Revista e Corrigida</option>
                  <option value="NVT">NVT — Nova Versão Transformadora</option>
                </select>
              </div>
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
                  placeholder="Buscar livro ou abrev..."
                  value={searchBook}
                  onChange={(e) => setSearchBook(e.target.value)}
                  className="h-8 w-full rounded-lg border border-border bg-muted/40 pl-8 pr-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green"
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
                  Todos
                </button>
                <button
                  onClick={() => setSelectedTestament("VT")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors",
                    selectedTestament === "VT" ? "bg-whatsapp-teal text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  Velho Testamento
                </button>
                <button
                  onClick={() => setSelectedTestament("NT")}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[10px] font-bold transition-colors",
                    selectedTestament === "NT" ? "bg-whatsapp-teal text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  Novo Testamento
                </button>
              </div>
            </div>

            {/* Lista dos Livros */}
            <div className="max-h-[380px] overflow-y-auto space-y-1.5 pr-1 divide-y divide-border/40">
              {filteredBooks.map((b) => (
                <div
                  key={b.id}
                  className="pt-1.5 first:pt-0 flex items-center justify-between text-xs py-1 hover:bg-muted/30 px-2 rounded-lg transition-colors"
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
                    <span className={cn(
                      "text-[9px] font-bold px-1.5 py-0.2 rounded",
                      b.testament === "VT" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    )}>
                      {b.testament}
                    </span>
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
