"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, TrendingUp, DollarSign, Megaphone, Eye, MousePointerClick, Award } from "lucide-react";
import { AdminAdsNavbar } from "@/components/ads/AdminAdsNavbar";
import { KpiCard } from "@/components/ads/KpiCard";
import { StatusBadge } from "@/components/ads/StatusBadge";
import { DataTable, Column } from "@/components/ads/DataTable";
import { adsApiFetch, formatCurrency, formatDate } from "@/lib/ads-utils";
import { Campaign } from "@/domain/ads/types";
import { toast } from "sonner";

export default function AdminPerformancePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const res = await adsApiFetch<{ campaigns: Campaign[] }>("/api/admin/campaigns");
        setCampaigns(res.campaigns || []);
      } catch (err: any) {
        toast.error("Erro ao carregar métricas de desempenho", { description: err.message });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const totalInvestido = campaigns
    .filter((c) => c.status === "ativa" || c.status === "encerrado")
    .reduce((sum, c) => sum + c.orcamento, 0);

  const totalGasto = campaigns.reduce((sum, c) => sum + c.gasto, 0);
  const totalAtivas = campaigns.filter((c) => c.status === "ativa").length;

  const columns: Column<Campaign>[] = [
    {
      header: "Campanha",
      cell: (c) => (
        <div>
          <div className="font-semibold text-white">{c.nome}</div>
          <div className="text-xs text-zinc-400">
            Formato: <span className="uppercase">{c.formato}</span> • Objetivo: {c.objetivo}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (c) => <StatusBadge status={c.status} showDetails={false} />,
    },
    {
      header: "Orçamento Total",
      cell: (c) => (
        <span className="font-semibold text-white">
          {formatCurrency(c.orcamento)}
        </span>
      ),
    },
    {
      header: "Consumo Real (Gasto)",
      cell: (c) => (
        <span className="font-bold text-emerald-400">
          {formatCurrency(c.gasto)}
        </span>
      ),
    },
    {
      header: "% Orçamento",
      cell: (c) => {
        const pct = c.orcamento > 0 ? Math.min(Math.round((c.gasto / c.orcamento) * 100), 100) : 0;
        return (
          <span className="text-xs font-semibold text-zinc-300">
            {pct}%
          </span>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <AdminAdsNavbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-purple-400" />
            Desempenho Consolidado de Ads
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Visão financeira e operacional de todas as campanhas da rede FéConecta.
          </p>
        </div>

        {/* KPIs Globais */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total Investido Aprovado"
            value={formatCurrency(totalInvestido)}
            description="Volume total aprovado para veiculação"
            variant="primary"
            icon={DollarSign}
          />
          <KpiCard
            label="Gasto Real Consumido"
            value={formatCurrency(totalGasto)}
            description="Consumo de impressões e cliques"
            icon={TrendingUp}
          />
          <KpiCard
            label="Campanhas Ativas na Rede"
            value={totalAtivas}
            description="Distribuindo no feed, stories e banners"
            variant="success"
            icon={Megaphone}
          />
          <KpiCard
            label="CPC Médio da Rede"
            value="R$ 0,18"
            description="Média geral de custo por clique"
            tooltip="Custo médio por clique registrado em todo o ecossistema de anúncios."
            icon={MousePointerClick}
          />
        </div>

        {/* Tabela de Campanhas */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Desempenho por Campanha
          </h2>
          <DataTable
            columns={columns}
            data={campaigns}
            isLoading={isLoading}
            emptyMessage="Nenhuma campanha encontrada."
          />
        </div>
      </main>
    </div>
  );
}
