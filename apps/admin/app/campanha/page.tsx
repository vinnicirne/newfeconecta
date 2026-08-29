"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, Wallet, TrendingUp, Megaphone, Eye, ArrowUpRight } from "lucide-react";
import { PartnerNavbar } from "@/components/ads/PartnerNavbar";
import { KpiCard } from "@/components/ads/KpiCard";
import { StatusBadge } from "@/components/ads/StatusBadge";
import { BudgetProgress } from "@/components/ads/BudgetProgress";
import { DataTable, Column } from "@/components/ads/DataTable";
import { adsApiFetch, formatCurrency, formatDate } from "@/lib/ads-utils";
import { Campaign, WalletBalanceDto } from "@/domain/ads/types";
import { toast } from "sonner";

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletBalanceDto | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [walletRes, campaignsRes] = await Promise.all([
          adsApiFetch<WalletBalanceDto>("/api/wallet").catch(() => null),
          adsApiFetch<{ campaigns: Campaign[] }>("/api/campaigns").catch(() => ({ campaigns: [] })),
        ]);

        if (walletRes) setWallet(walletRes);
        if (campaignsRes?.campaigns) setCampaigns(campaignsRes.campaigns);
      } catch (err: any) {
        toast.error("Erro ao carregar dados do painel", { description: err.message });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Métricas calculadas reais
  const activeCampaigns = campaigns.filter((c) => c.status === "ativa").length;
  const totalGasto = campaigns.reduce((acc, c) => acc + (Number(c.gasto) || 0), 0);
  const totalOrcamento = campaigns.reduce((acc, c) => acc + (Number(c.orcamento) || 0), 0);
  const percentConsumido = totalOrcamento > 0 ? Math.round((totalGasto / totalOrcamento) * 100) : 0;

  const filteredCampaigns = campaigns.filter((c) => {
    if (statusFilter === "todos") return true;
    return c.status === statusFilter;
  });

  const columns: Column<Campaign>[] = [
    {
      header: "Campanha",
      cell: (c) => (
        <div>
          <div className="font-semibold text-white hover:text-emerald-400 transition-colors">
            <Link href={`/campanha/${c.id}`}>{c.nome}</Link>
          </div>
          <div className="text-xs text-zinc-400 uppercase tracking-wider mt-0.5">
            Formato: {c.formato} • Objetivo: {c.objetivo}
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (c) => <StatusBadge status={c.status} />,
    },
    {
      header: "Orçamento / Consumo",
      className: "w-48",
      cell: (c) => <BudgetProgress spent={c.gasto} total={c.orcamento} />,
    },
    {
      header: "Período",
      cell: (c) => (
        <div className="text-xs text-zinc-300">
          {formatDate(c.periodo_inicio)} até {formatDate(c.periodo_fim)}
        </div>
      ),
    },
    {
      header: "Ações",
      className: "text-right",
      cell: (c) => (
        <Link
          href={`/campanha/${c.id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
        >
          <span>Ver Detalhes</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PartnerNavbar saldoDisponivel={wallet ? formatCurrency(wallet.saldo_disponivel) : undefined} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Painel de Campanhas
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Gerencie seus anúncios patrocinados, orçamentos e saldo da carteira.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/campanha/carteira"
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-white/10 transition-colors"
            >
              <Wallet className="h-4 w-4 text-emerald-400" />
              <span>Gerenciar Carteira</span>
            </Link>

            <Link
              href="/campanha/nova"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 active:scale-95 transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Nova Campanha</span>
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Saldo Disponível"
            value={wallet ? formatCurrency(wallet.saldo_disponivel) : "..."}
            description="Livre para novas campanhas ou reembolso"
            variant="primary"
            icon={Wallet}
            linkText="Adicionar saldo"
            onLinkClick={() => router.push("/campanha/carteira")}
          />
          <KpiCard
            label="Saldo Investido"
            value={wallet ? formatCurrency(wallet.saldo_investido) : "..."}
            description="Comprometido em campanhas ativas"
            icon={TrendingUp}
            linkText="Ver ativas"
            onLinkClick={() => setStatusFilter("ativa")}
          />
          <KpiCard
            label="Campanhas Ativas"
            value={activeCampaigns}
            description="Veiculando no feed, stories e banners"
            icon={Megaphone}
            variant="success"
          />
          <KpiCard
            label="Total Consumido"
            value={formatCurrency(totalGasto)}
            description={`${percentConsumido}% do orçamento alocado`}
            tooltip="Total financeiro consumido em veiculação de anúncios em todas as suas campanhas."
            icon={Eye}
          />
        </div>

        {/* Lista de Campanhas */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Minhas Campanhas ({campaigns.length})
            </h2>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {["todos", "ativa", "pendente", "pausado", "reprovado", "encerrado"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                    statusFilter === status
                      ? "bg-white text-zinc-950 shadow"
                      : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {status === "todos" ? "Todas" : status}
                </button>
              ))}
            </div>
          </div>

          <DataTable
            columns={columns}
            data={filteredCampaigns}
            isLoading={isLoading}
            emptyMessage={
              statusFilter === "todos"
                ? "Você ainda não possui campanhas. Clique em 'Nova Campanha' para criar a primeira."
                : `Nenhuma campanha encontrada com o status "${statusFilter}".`
            }
          />
        </div>
      </main>
    </div>
  );
}
