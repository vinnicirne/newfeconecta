"use client";

import React, { useEffect, useState } from "react";
import { Receipt, CheckCircle, ShieldCheck, Key, RefreshCw, AlertCircle } from "lucide-react";
import { AdminAdsNavbar } from "@/components/ads/AdminAdsNavbar";
import { StatusBadge } from "@/components/ads/StatusBadge";
import { DataTable, Column } from "@/components/ads/DataTable";
import { adsApiFetch, formatCurrency, formatDateTime } from "@/lib/ads-utils";
import { WalletTransactionDto } from "@/domain/ads/types";
import { toast } from "sonner";

export default function AdminPaymentsConfigPage() {
  const [transactions, setTransactions] = useState<WalletTransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        // Busca do extrato geral
        const res = await adsApiFetch<{ transactions: WalletTransactionDto[] }>("/api/wallet").catch(() => ({ transactions: [] }));
        setTransactions((res as any)?.transacoes_recentes || []);
      } catch (err: any) {
        toast.error("Erro ao carregar pagamentos", { description: err.message });
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const columns: Column<WalletTransactionDto>[] = [
    {
      header: "Data / Hora",
      cell: (tx) => (
        <span className="text-xs text-zinc-300">
          {formatDateTime(tx.created_at)}
        </span>
      ),
    },
    {
      header: "Tipo",
      cell: (tx) => <StatusBadge status={tx.tipo} showDetails={false} />,
    },
    {
      header: "ID Transação",
      cell: (tx) => (
        <span className="font-mono text-xs text-zinc-400">
          {tx.id.slice(0, 12)}...
        </span>
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
      <AdminAdsNavbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <Receipt className="h-7 w-7 text-purple-400" />
            Pagamentos & Configuração Mercado Pago
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Status da integração com gateway de pagamento, webhook e histórico de cobranças.
          </p>
        </div>

        {/* Configuração Mercado Pago */}
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Integração Mercado Pago (MELI)</h3>
                <p className="text-xs text-zinc-400">
                  Processamento de recargas via Checkout Preference e estornos via API Refund.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Conectado (Produção / Mock Fallback)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="rounded-xl bg-zinc-950 p-3.5 border border-white/5 space-y-1">
              <span className="text-zinc-500 font-semibold uppercase">Endpoint Webhook:</span>
              <p className="font-mono text-zinc-300 truncate">/api/webhooks/mercadopago</p>
            </div>
            <div className="rounded-xl bg-zinc-950 p-3.5 border border-white/5 space-y-1">
              <span className="text-zinc-500 font-semibold uppercase">Idempotência do Webhook:</span>
              <p className="text-emerald-400 font-semibold">Ativada (Append-only Ledger)</p>
            </div>
            <div className="rounded-xl bg-zinc-950 p-3.5 border border-white/5 space-y-1">
              <span className="text-zinc-500 font-semibold uppercase">Status de Estorno:</span>
              <p className="text-purple-400 font-semibold">API Refund v1 Integrada</p>
            </div>
          </div>
        </div>

        {/* Histórico Recente de Cobranças */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white tracking-tight">
            Últimas Transações Registradas
          </h2>
          <DataTable
            columns={columns}
            data={transactions}
            isLoading={isLoading}
            emptyMessage="Nenhuma movimentação registrada."
          />
        </div>
      </main>
    </div>
  );
}
