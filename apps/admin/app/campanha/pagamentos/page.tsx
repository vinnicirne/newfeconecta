"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Filter, Download } from "lucide-react";
import { PartnerNavbar } from "@/components/ads/PartnerNavbar";
import { StatusBadge } from "@/components/ads/StatusBadge";
import { DataTable, Column } from "@/components/ads/DataTable";
import { adsApiFetch, formatCurrency, formatDateTime } from "@/lib/ads-utils";
import { WalletBalanceDto, WalletTransactionDto, WalletTransactionType } from "@/domain/ads/types";
import { toast } from "sonner";

export default function PartnerPaymentsPage() {
  const [wallet, setWallet] = useState<WalletBalanceDto | null>(null);
  const [transactions, setTransactions] = useState<WalletTransactionDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [walletRes, txRes] = await Promise.all([
          adsApiFetch<WalletBalanceDto>("/api/wallet").catch(() => null),
          adsApiFetch<{ transactions: WalletTransactionDto[]; total: number }>(
            `/api/wallet/transactions?page=${currentPage}&pageSize=50${typeFilter !== "todos" ? `&tipo=${typeFilter}` : ""}`
          ).catch(() => ({ transactions: [], total: 0 })),
        ]);

        if (walletRes) setWallet(walletRes);
        if (txRes) {
          setTransactions(txRes.transactions || []);
          setTotalCount(txRes.total || 0);
        }
      } catch (err: any) {
        toast.error("Erro ao carregar extrato de pagamentos", { description: err.message });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [typeFilter, currentPage]);

  const filteredTransactions = transactions;

  const columns: Column<WalletTransactionDto>[] = [
    {
      header: "Data e Hora",
      cell: (tx) => (
        <span className="text-xs text-zinc-300">
          {formatDateTime(tx.created_at)}
        </span>
      ),
    },
    {
      header: "Tipo de Movimentação",
      cell: (tx) => <StatusBadge status={tx.tipo} showDetails={false} />,
    },
    {
      header: "Vínculo / Campanha",
      cell: (tx) => (
        <div className="text-xs">
          {tx.campaign_id ? (
            <Link
              href={`/campanha/${tx.campaign_id}`}
              className="text-emerald-400 hover:underline font-medium"
            >
              {tx.campaign_nome || `Campanha #${tx.campaign_id.slice(0, 8)}`}
            </Link>
          ) : tx.tipo === "recarga" ? (
            <span className="text-zinc-400">Recarga Mercado Pago</span>
          ) : (
            <span className="text-zinc-500">-</span>
          )}
        </div>
      ),
    },
    {
      header: "Valor",
      className: "text-right font-bold",
      cell: (tx) => {
        const isCredit = tx.tipo === "recarga" || tx.tipo === "estorno_reprovacao";
        return (
          <span className={isCredit ? "text-emerald-400" : "text-zinc-300"}>
            {isCredit ? "+" : "-"} {formatCurrency(tx.valor)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PartnerNavbar saldoDisponivel={wallet ? formatCurrency(wallet.saldo_disponivel) : undefined} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/campanha/carteira"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Extrato de Pagamentos</h1>
              <p className="text-xs text-zinc-400">
                Histórico completo de recargas, consumos de campanhas e reembolsos.
              </p>
            </div>
          </div>
        </div>

        {/* Filtros e Tabela */}
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
            <span className="text-xs font-semibold text-zinc-400 mr-2 flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" /> Filtrar por:
            </span>
            {[
              { id: "todos", label: "Todas as Transações" },
              { id: "recarga", label: "Recargas" },
              { id: "debito_campanha", label: "Débito em Campanhas" },
              { id: "estorno_reprovacao", label: "Estornos de Reprovação" },
              { id: "reembolso", label: "Reembolsos" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setTypeFilter(f.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  typeFilter === f.id
                    ? "bg-white text-zinc-950 shadow"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <DataTable
            columns={columns}
            data={filteredTransactions}
            isLoading={isLoading}
            emptyMessage="Nenhuma movimentação encontrada para o filtro selecionado."
          />
        </div>
      </main>
    </div>
  );
}
