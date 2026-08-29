"use client";

import React, { useState, useMemo } from "react";
import { 
  Eye, 
  Users,
  MousePointerClick, 
  Percent, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  BarChart3,
  Sparkles,
  Target,
  Flame,
  MessageCircle,
  Share2,
  Repeat,
  CheckCircle2,
  Check,
  Activity,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AnalyticsTimelineItem {
  data: string;
  impressoes: number;
  alcance: number;
  cliques: number;
  ctr: number;
  conversoes: number;
  gasto: number;
}

export interface CampaignAnalyticsData {
  campaign_id: string;
  nome: string;
  status: string;
  objetivo: string;
  acao_conversao?: string;
  orcamento: number;
  gasto: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  ctr: string;
  ctr_raw: number;
  cpc: string;
  cpm: string;
  conversoes: number;
  cpa: string;
  frequencia: string;
  likes: number;
  comments: number;
  shares: number;
  receita_gerada: string;
  roas: string;
  timeline: AnalyticsTimelineItem[];
}

const conversionActionLabels: Record<string, string> = {
  whatsapp: "Contatos no WhatsApp",
  compra: "Compras realizadas",
  cadastro: "Cadastros concluídos",
  link_externo: "Visitas na página",
  inscricao_evento: "Inscrições no Evento",
  visita_igreja: "Pedidos de Informação / Visita",
  instalacao_app: "Instalações do App",
  engajamento_social: "Engajamentos no Feed",
};

export type MetricKey = "impressoes" | "alcance" | "cliques" | "ctr" | "gasto" | "conversoes";

interface MetricDef {
  key: MetricKey;
  label: string;
  shortLabel: string;
  color: string;
  hex: string;
  bgActive: string;
  borderActive: string;
  badge: string;
  unit: string;
  icon: any;
  format: (v: number) => string;
}

const METRIC_DEFINITIONS: Record<MetricKey, MetricDef> = {
  impressoes: {
    key: "impressoes",
    label: "Impressões",
    shortLabel: "Vezes exibido",
    color: "text-emerald-400",
    hex: "#10b981",
    bgActive: "bg-emerald-950/40",
    borderActive: "border-emerald-500",
    badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    unit: "views",
    icon: Eye,
    format: (v) => v.toLocaleString("pt-BR"),
  },
  alcance: {
    key: "alcance",
    label: "Alcance",
    shortLabel: "Pessoas únicas",
    color: "text-cyan-400",
    hex: "#06b6d4",
    bgActive: "bg-cyan-950/40",
    borderActive: "border-cyan-500",
    badge: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
    unit: "pessoas",
    icon: Users,
    format: (v) => v.toLocaleString("pt-BR"),
  },
  cliques: {
    key: "cliques",
    label: "Cliques",
    shortLabel: "Cliques no link",
    color: "text-purple-400",
    hex: "#a855f7",
    bgActive: "bg-purple-950/40",
    borderActive: "border-purple-500",
    badge: "bg-purple-500/20 text-purple-400 border-purple-500/40",
    unit: "cliques",
    icon: MousePointerClick,
    format: (v) => v.toLocaleString("pt-BR"),
  },
  ctr: {
    key: "ctr",
    label: "CTR (%)",
    shortLabel: "Taxa de cliques",
    color: "text-pink-400",
    hex: "#ec4899",
    bgActive: "bg-pink-950/40",
    borderActive: "border-pink-500",
    badge: "bg-pink-500/20 text-pink-400 border-pink-500/40",
    unit: "%",
    icon: Percent,
    format: (v) => `${v.toFixed(2)}%`,
  },
  gasto: {
    key: "gasto",
    label: "Gasto Diário",
    shortLabel: "Consumo em R$",
    color: "text-amber-400",
    hex: "#f59e0b",
    bgActive: "bg-amber-950/40",
    borderActive: "border-amber-500",
    badge: "bg-amber-500/20 text-amber-400 border-amber-500/40",
    unit: "R$",
    icon: DollarSign,
    format: (v) => `R$ ${v.toFixed(2)}`,
  },
  conversoes: {
    key: "conversoes",
    label: "Conversões",
    shortLabel: "Ações concluídas",
    color: "text-green-400",
    hex: "#22c55e",
    bgActive: "bg-green-950/40",
    borderActive: "border-green-500",
    badge: "bg-green-500/20 text-green-400 border-green-500/40",
    unit: "ações",
    icon: Target,
    format: (v) => v.toLocaleString("pt-BR"),
  },
};

interface CampaignAnalyticsChartProps {
  analytics: CampaignAnalyticsData | null;
  isLoading?: boolean;
}

export function CampaignAnalyticsChart({ analytics, isLoading }: CampaignAnalyticsChartProps) {
  // Múltiplas métricas ativas simultâneas
  const [activeMetrics, setActiveMetrics] = useState<MetricKey[]>(["impressoes", "cliques"]);
  const [period, setPeriod] = useState<"7d" | "14d" | "30d" | "all">("7d");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Ajusta a timeline com base no período selecionado (declarado antes de qualquer early return)
  const baseTimeline = analytics?.timeline || [];
  const timeline = useMemo(() => {
    if (!analytics || baseTimeline.length === 0) return [];
    if (period === "7d") return baseTimeline.slice(-7);
    if (period === "14d") {
      if (baseTimeline.length >= 14) return baseTimeline.slice(-14);
      const diff = 14 - baseTimeline.length;
      const pad: AnalyticsTimelineItem[] = Array.from({ length: diff }).map((_, idx) => {
        const d = new Date();
        d.setDate(d.getDate() - (14 - idx));
        return {
          data: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
          impressoes: 0,
          alcance: 0,
          cliques: 0,
          ctr: 0,
          conversoes: 0,
          gasto: 0,
        };
      });
      return [...pad, ...baseTimeline];
    }
    if (period === "30d") {
      if (baseTimeline.length >= 30) return baseTimeline.slice(-30);
      const diff = 30 - baseTimeline.length;
      const pad: AnalyticsTimelineItem[] = Array.from({ length: diff }).map((_, idx) => {
        const d = new Date();
        d.setDate(d.getDate() - (30 - idx));
        return {
          data: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`,
          impressoes: 0,
          alcance: 0,
          cliques: 0,
          ctr: 0,
          conversoes: 0,
          gasto: 0,
        };
      });
      return [...pad, ...baseTimeline];
    }
    return baseTimeline;
  }, [analytics, baseTimeline, period]);

  // Alternador de seleção do card
  function toggleMetric(key: MetricKey) {
    if (activeMetrics.includes(key)) {
      if (activeMetrics.length > 1) {
        setActiveMetrics(activeMetrics.filter((m) => m !== key));
      }
    } else {
      setActiveMetrics([...activeMetrics, key]);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 animate-pulse space-y-6">
        <div className="h-6 w-48 bg-white/10 rounded-lg" />
        <div className="h-20 bg-white/5 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-white/5 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-white/5 rounded-xl" />
      </div>
    );
  }

  if (!analytics) return null;

  const actionLabel = conversionActionLabels[analytics.acao_conversao || "whatsapp"] || "Conversões";

  // Dimensões do Gráfico SVG
  const svgWidth = 800;
  const svgHeight = 260;
  const paddingX = 40;
  const paddingTop = 25;
  const paddingBottom = 40;
  const usableWidth = svgWidth - paddingX * 2;
  const usableHeight = svgHeight - paddingTop - paddingBottom;

  const numPoints = Math.max(timeline.length, 2);
  const getX = (index: number) => paddingX + (index / (numPoints - 1)) * usableWidth;

  // Construtor de Curvas Bézier Suaves (Spline)
  function createSplinePath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i === 0 ? 0 : i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  }

  // ─── CÁLCULO DE ESCALA UNIFICADA PARA MÉTRICAS DE VOLUME ───
  const volumeKeys: MetricKey[] = ["impressoes", "alcance", "cliques", "conversoes"];
  const allVolumeValues = timeline.flatMap((item) =>
    activeMetrics
      .filter((k) => volumeKeys.includes(k))
      .map((k) => Number(item[k]) || 0)
  );
  const globalMaxVolume = Math.max(...allVolumeValues, 10);

  const allCtrValues = timeline.map((item) => Number(item.ctr) || 0);
  const maxCtr = Math.max(...allCtrValues, 10);

  const allGastoValues = timeline.map((item) => Number(item.gasto) || 0);
  const maxGasto = Math.max(...allGastoValues, 10);

  // Gera dados de cada curva ativa
  const lineSeries = activeMetrics.map((key, seriesIndex) => {
    const def = METRIC_DEFINITIONS[key];
    const values = timeline.map((item) => Number(item[key]) || 0);
    
    // Escala adequada por tipo de métrica
    let maxScale = globalMaxVolume;
    if (key === "ctr") maxScale = maxCtr;
    if (key === "gasto") maxScale = maxGasto;

    const points = values.map((val, idx) => {
      const x = getX(idx);
      // Se duas métricas de volume tiverem valor idêntico (ex: impressões e alcance = 52), aplica micro-offset para não cobrir completamente
      const isOverlapped = key === "alcance" && activeMetrics.includes("impressoes");
      const offset = isOverlapped && val > 0 ? 3 : 0;

      const y = paddingTop + usableHeight - (maxScale > 0 ? (val / maxScale) * usableHeight : 0) + offset;
      return { x, y, val };
    });

    const linePath = createSplinePath(points);
    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + usableHeight} L ${points[0].x} ${paddingTop + usableHeight} Z`
      : "";

    // Estilo da linha (sólida ou tracejada para diferenciar linhas sobrepostas)
    const dashArray = key === "alcance" ? "6 3" : key === "ctr" ? "4 4" : undefined;
    const strokeWidth = key === "impressoes" ? 3.5 : key === "alcance" ? 2.5 : 3;

    return {
      key,
      def,
      points,
      linePath,
      areaPath,
      maxVal: Math.max(...values),
      dashArray,
      strokeWidth,
    };
  });

  return (
    <div className="space-y-6">
      {/* ─── PAINEL PRINCIPAL DO ANUNCIANTE ─── */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-white/5 pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              Desempenho da Campanha
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Clique nos cards abaixo para adicionar ou remover linhas no gráfico interativo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
              Métricas ativas:
            </span>
            <div className="flex items-center gap-1">
              {activeMetrics.map((m) => {
                const def = METRIC_DEFINITIONS[m];
                return (
                  <span
                    key={m}
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1",
                      def.badge
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: def.hex }} />
                    {def.label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── HERO INDICATOR: RESULTADO PRINCIPAL DO ANÚNCIO ─── */}
        {(() => {
          const obj = analytics.objetivo || "cliques";
          let heroLabel = "Resultado da Campanha";
          let heroVal = "";
          let heroSub = "";

          if (obj === "reconhecimento" || obj === "alcance") {
            heroLabel = "Alcance da Campanha";
            heroVal = `${analytics.alcance.toLocaleString("pt-BR")} Pessoas Alcançadas`;
            heroSub = `(${analytics.cpm} CPM médio)`;
          } else if (obj === "engajamento") {
            const totalEng = (analytics.likes || 0) + (analytics.comments || 0) + (analytics.shares || 0);
            heroLabel = "Engajamento no Feed";
            heroVal = `${totalEng} Reações & Comentários`;
            heroSub = `(${analytics.ctr} CTR de engajamento)`;
          } else if (obj === "contatos") {
            heroLabel = "Contatos no WhatsApp";
            heroVal = analytics.conversoes > 0 
              ? `${analytics.conversoes} Contatos Iniciados`
              : `${analytics.cliques} Cliques no Link`;
            heroSub = analytics.conversoes > 0 ? `(${analytics.cpa} por contato)` : `(${analytics.cpc} por clique)`;
          } else if (obj === "conversoes" || obj === "eventos" || obj === "instalacoes") {
            heroLabel = `Resultado (${actionLabel})`;
            heroVal = analytics.conversoes > 0 
              ? `${analytics.conversoes} ${actionLabel}`
              : `${analytics.cliques} Cliques no Link`;
            heroSub = analytics.conversoes > 0 ? `(${analytics.cpa} por resultado)` : `(${analytics.cpc} por clique)`;
          } else {
            heroLabel = "Cliques no Link / Site";
            heroVal = `${analytics.cliques.toLocaleString("pt-BR")} Cliques no Link`;
            heroSub = `(${analytics.cpc} por clique)`;
          }

          return (
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-teal-950/30 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-lg shadow-emerald-950/20">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                    {heroLabel}
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-white">
                    {heroVal} <span className="text-xs font-normal text-zinc-400">{heroSub}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-medium text-zinc-400 sm:border-l sm:border-white/10 sm:pl-6">
                <div>
                  <span className="block text-[10px] uppercase text-zinc-500 font-bold">Frequência Média</span>
                  <span className="text-sm font-bold text-white">{analytics.frequencia}</span>
                </div>
                {analytics.roas !== "0,00x" && (
                  <div>
                    <span className="block text-[10px] uppercase text-zinc-500 font-bold">ROAS</span>
                    <span className="text-sm font-bold text-emerald-400">{analytics.roas}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ─── OS 6 CARDS CLICÁVEIS DE MÉTRICAS (MULTI-SELEÇÃO) ─── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
              Métricas de Entrega & Conversão (Clique para comparar):
            </span>
            <span className="text-[11px] text-zinc-500">
              {activeMetrics.length} selecionada(s)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(Object.keys(METRIC_DEFINITIONS) as MetricKey[]).map((key) => {
              const def = METRIC_DEFINITIONS[key];
              const Icon = def.icon;
              const isSelected = activeMetrics.includes(key);

              let valDisplay = "";
              if (key === "impressoes") valDisplay = analytics.impressoes.toLocaleString("pt-BR");
              if (key === "alcance") valDisplay = analytics.alcance.toLocaleString("pt-BR");
              if (key === "cliques") valDisplay = analytics.cliques.toLocaleString("pt-BR");
              if (key === "ctr") valDisplay = analytics.ctr;
              if (key === "gasto") valDisplay = `R$ ${(analytics.gasto / 100).toFixed(2)}`;
              if (key === "conversoes") valDisplay = analytics.conversoes.toLocaleString("pt-BR");

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleMetric(key)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-all relative flex flex-col justify-between space-y-2 cursor-pointer group select-none",
                    isSelected
                      ? cn("border-2 shadow-lg", def.borderActive, def.bgActive)
                      : "border-white/10 bg-zinc-950/80 hover:border-white/20 hover:bg-zinc-950 opacity-70 hover:opacity-100"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 group-hover:text-white transition-colors">
                      {def.label}
                    </span>
                    <div className="flex items-center gap-1">
                      {isSelected && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-white">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                      <Icon className={cn("w-4 h-4", def.color)} />
                    </div>
                  </div>

                  <div>
                    <div className={cn("text-xl font-black transition-colors", isSelected ? "text-white" : "text-zinc-300")}>
                      {valDisplay}
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{def.shortLabel}</p>
                  </div>

                  {/* Indicador de linha selecionada */}
                  <div className="pt-1.5 border-t border-white/5 flex items-center gap-1.5 text-[10px]">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: isSelected ? def.hex : "#52525b" }}
                    />
                    <span className={isSelected ? def.color : "text-zinc-500"}>
                      {isSelected ? "Exibindo curva" : "Oculto no gráfico"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── MÉTRICAS COMPLEMENTARES & ENGAJAMENTO SOCIAL ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* CPM Médio */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">CPM Médio</span>
              <span className="text-base font-bold text-white">{analytics.cpm}</span>
              <span className="text-[10px] text-zinc-400 block mt-0.5">Custo por 1.000 impressões</span>
            </div>
            <BarChart3 className="w-5 h-5 text-indigo-400 opacity-60" />
          </div>

          {/* CPA Médio */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">CPA (Custo por Conversão)</span>
              <span className="text-base font-bold text-white">{analytics.cpa}</span>
              <span className="text-[10px] text-zinc-400 block mt-0.5">Custo por ação gerada</span>
            </div>
            <Target className="w-5 h-5 text-purple-400 opacity-60" />
          </div>

          {/* Frequência de Exibição */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Frequência Média</span>
              <span className="text-base font-bold text-white">{analytics.frequencia}</span>
              <span className="text-[10px] text-zinc-400 block mt-0.5">Exibições por pessoa</span>
            </div>
            <Repeat className="w-5 h-5 text-teal-400 opacity-60" />
          </div>

          {/* Engajamento Social no Feed */}
          <div className="rounded-xl border border-white/5 bg-black/40 p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Engajamento Social</span>
              <div className="flex items-center gap-2 text-xs font-bold text-white mt-1">
                <span className="flex items-center gap-1 text-whatsapp-green">
                  <Flame className="w-3.5 h-3.5 fill-whatsapp-green" /> {analytics.likes}
                </span>
                <span className="flex items-center gap-1 text-teal-400">
                  <MessageCircle className="w-3.5 h-3.5" /> {analytics.comments}
                </span>
                <span className="flex items-center gap-1 text-zinc-400">
                  <Share2 className="w-3.5 h-3.5" /> {analytics.shares}
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 block mt-0.5">Reações reais no feed</span>
            </div>
            <Flame className="w-5 h-5 text-amber-500 opacity-60" />
          </div>
        </div>
      </div>

      {/* ─── GRÁFICO DE LINHAS INTERATIVO COM SELEÇÃO DE PERÍODO ─── */}
      <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Gráfico de Linhas & Tendências
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Curvas comparativas em tempo real. Passe o mouse para inspecionar cada dia.
            </p>
          </div>

          {/* Seletor de Período */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-white/10 shrink-0">
            {[
              { id: "7d", label: "7 Dias" },
              { id: "14d", label: "14 Dias" },
              { id: "30d", label: "30 Dias" },
              { id: "all", label: "Todo o Período" },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
                  period === p.id
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas SVG de Linhas */}
        <div className="rounded-xl border border-white/5 bg-zinc-950/90 p-4 sm:p-6 space-y-3 relative select-none">
          {/* Legenda das Séries Ativas */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-white/5 pb-3">
            <div className="flex flex-wrap items-center gap-4">
              {lineSeries.map((series) => (
                <div key={series.key} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: series.def.hex }} />
                  <span className="font-bold text-white text-xs">{series.def.label}</span>
                  <span className="text-[10px] text-zinc-500">
                    (Pico: {series.def.format(series.maxVal)})
                  </span>
                </div>
              ))}
            </div>

            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              Atualizado em tempo real
            </span>
          </div>

          {/* SVG Principal e Tooltip Inteligente */}
          <div className="w-full relative py-2">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-56 sm:h-72 overflow-visible"
              onMouseLeave={() => setHoverIndex(null)}
            >
              <defs>
                {lineSeries.map((series) => (
                  <linearGradient
                    key={`grad-${series.key}`}
                    id={`grad-${series.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={series.def.hex} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={series.def.hex} stopOpacity="0.0" />
                  </linearGradient>
                ))}
              </defs>

              {/* Linhas de Grade Horizontal */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = paddingTop + usableHeight * (1 - ratio);
                return (
                  <g key={idx}>
                    <line
                      x1={paddingX}
                      y1={y}
                      x2={svgWidth - paddingX}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                  </g>
                );
              })}

              {/* Áreas Preenchidas */}
              {lineSeries.map((series) => (
                <path
                  key={`area-${series.key}`}
                  d={series.areaPath}
                  fill={`url(#grad-${series.key})`}
                  className="transition-all duration-300 pointer-events-none"
                />
              ))}

              {/* Curvas de Linha */}
              {lineSeries.map((series) => (
                <path
                  key={`line-${series.key}`}
                  d={series.linePath}
                  fill="none"
                  stroke={series.def.hex}
                  strokeWidth={series.strokeWidth}
                  strokeDasharray={series.dashArray}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300 drop-shadow-md pointer-events-none"
                />
              ))}

              {/* Pontos de Destaque (Dots) */}
              {lineSeries.map((series) =>
                series.points.map((p, idx) => {
                  const isHovered = hoverIndex === idx;
                  return (
                    <circle
                      key={`dot-${series.key}-${idx}`}
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? "6" : p.val > 0 ? "4.5" : "2"}
                      fill={series.def.hex}
                      stroke="#09090b"
                      strokeWidth={isHovered ? "2.5" : "1.5"}
                      className="transition-all duration-150 pointer-events-none"
                    />
                  );
                })
              )}

              {/* Linha Vertical de Cursor Hover */}
              {hoverIndex !== null && (
                <line
                  x1={getX(hoverIndex)}
                  y1={paddingTop - 5}
                  x2={getX(hoverIndex)}
                  y2={paddingTop + usableHeight}
                  stroke="rgba(255, 255, 255, 0.35)"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  className="pointer-events-none"
                />
              )}

              {/* Eixo X: Rótulos das Datas */}
              {timeline.map((item, idx) => {
                const x = getX(idx);
                const isHovered = hoverIndex === idx;
                const shouldShow = timeline.length <= 14 || idx % Math.ceil(timeline.length / 10) === 0 || idx === timeline.length - 1;
                if (!shouldShow && !isHovered) return null;

                return (
                  <text
                    key={`label-${idx}`}
                    x={x}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    fill={isHovered ? "#ffffff" : "#71717a"}
                    fontSize="11"
                    fontWeight={isHovered ? "bold" : "600"}
                    className="select-none transition-colors"
                  >
                    {item.data}
                  </text>
                );
              })}

              {/* Zonas Invisíveis de Hover por Coluna */}
              {timeline.map((_, idx) => {
                const x = getX(idx);
                const colWidth = usableWidth / numPoints;
                return (
                  <rect
                    key={`zone-${idx}`}
                    x={x - colWidth / 2}
                    y={paddingTop}
                    width={colWidth}
                    height={usableHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIndex(idx)}
                  />
                );
              })}
            </svg>

            {/* Tooltip Flutuante com Posicionamento Inteligente Anti-Corte */}
            {hoverIndex !== null && timeline[hoverIndex] && (
              <div
                style={{
                  left: `${(getX(hoverIndex) / svgWidth) * 100}%`,
                  // Se estiver na metade direita, abre para a esquerda. Se na esquerda, abre para a direita!
                  transform: hoverIndex > (numPoints / 2) ? "translate(-108%, -15%)" : "translate(8%, -15%)",
                  top: "20px",
                }}
                className="absolute pointer-events-none z-30 rounded-2xl border border-white/20 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur-xl space-y-2.5 min-w-[210px] animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-xs font-black text-white flex items-center gap-1.5">
                    📅 {timeline[hoverIndex].data}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Detalhes do Dia
                  </span>
                </div>

                <div className="space-y-2">
                  {lineSeries.map((series) => {
                    const val = Number(timeline[hoverIndex][series.key]) || 0;
                    return (
                      <div key={series.key} className="flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: series.def.hex }}
                          />
                          <span className="text-zinc-300 font-medium text-xs">
                            {series.def.label}:
                          </span>
                        </div>
                        <span className="font-mono font-bold text-white text-xs whitespace-nowrap">
                          {series.def.format(val)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
