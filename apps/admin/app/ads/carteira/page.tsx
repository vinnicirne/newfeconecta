"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, CheckCircle, XCircle, RotateCcw, AlertTriangle, ExternalLink, Loader2 } from "lucide-react";
import { AdminAdsNavbar } from "@/components/ads/AdminAdsNavbar";
import { StatusBadge } from "@/components/ads/StatusBadge";
import { DataTable, Column } from "@/components/ads/DataTable";
import { ConfirmModal } from "@/components/ads/ConfirmModal";
import { adsApiFetch, formatCurrency, formatDate, formatDateTime } from "@/lib/ads-utils";
import { RefundRequest } from "@/domain/ads/types";
import { toast } from "sonner";

interface ExtendedRefundRequest extends RefundRequest {
  wallets?: {
    id: string;
    partner_id: string;
    saldo_disponivel: number;
  };
}

export default function AdminRefundsPage() {
  const [refunds, setRefunds] = useState<ExtendedRefundRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("aguardando");

  // Modais de Ação
  const [selectedRefund, setSelectedRefund] = useState<ExtendedRefundRequest | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadRefunds() {
    try {
      setIsLoading(true);
      const url = statusFilter === "todos"
        ? "/api/admin/refunds"
        : `/api/admin/refunds?status=${statusFilter}`;
      const res = await adsApiFetch<{ refunds: ExtendedRefundRequest[] }>(url);
      setRefunds(res.refunds || []);
    } catch (err: any) {
      toast.error("Erro ao carregar fila de reembolsos", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRefunds();
  }, [statusFilter]);

  // Aprovação de Reembolso (API Mercado Pago)
  async function handleApproveConfirm() {
    if (!selectedRefund) return;

    try {
      setIsActionLoading(true);
      setActionError(null);

      const res = await adsApiFetch(`/api/admin/refunds/${selectedRefund.id}/approve`, {
        method: "POST",
      });

      toast.success("Reembolso aprovado e processado!", {
        description: `Estorno efetuado no Mercado Pago (ID: ${res.mp_refund_id || "OK"}).`,
      });

      setIsApproveOpen(false);
      setSelectedRefund(null);
      loadRefunds();
    } catch (err: any) {
      setActionError(err.message || "Falha ao processar estorno no Mercado Pago.");
    } finally {
      setIsActionLoading(false);
    }
  }

  // Recusa de Reembolso
  async function handleRejectConfirm() {
    if (!selectedRefund) return;

    try {
      setIsActionLoading(true);
      setActionError(null);

      await adsApiFetch(`/api/admin/refunds/${selectedRefund.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ motivo: rejectReason.trim() || undefined }),
      });

      toast.success("Solicitação de reembolso rejeitada.", {
        description: "O saldo permaneceu disponível na carteira do parceiro.",
      });

      setIsRejectOpen(false);
      setSelectedRefund(null);
      setRejectReason("");
      loadRefunds();
    } catch (err: any) {
      setActionError(err.message || "Falha ao rejeitar reembolso.");
    } finally {
      setIsActionLoading(false);
    }
  }

  const columns: Column<ExtendedRefundRequest>[] = [
    {
      header: "Data / Solicitação",
      cell: (r) => (
        <div>
          <div className="font-semibold text-white">
            {formatDateTime(r.solicitado_em)}
          </div>
          <div className="text-xs text-zinc-400 font-mono mt-0.5">
            ID: {r.id.slice(0, 8)}...
          </div>
        </div>
      ),
    },
    {
      header: "Parceiro / Carteira",
      cell: (r) => (
        <div className="text-xs">
          <div className="text-zinc-300 font-medium">
            Parceiro: {r.wallets?.partner_id ? r.wallets.partner_id.slice(0, 8) : "-"}
          </div>
          <div className="text-emerald-400 mt-0.5">
            Disponível: {formatCurrency(r.wallets?.saldo_disponivel)}
          </div>
        </div>
      ),
    },
    {
      header: "Valor Solicitado",
      cell: (r) => (
        <span className="font-bold text-white text-base">
          {formatCurrency(r.valor)}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (r) => <StatusBadge status={r.status} showDetails={false} />,
    },
    {
      header: "Ações",
      className: "text-right",
      cell: (r) => {
        if (r.status === "aguardando") {
          return (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedRefund(r);
                  setActionError(null);
                  setIsApproveOpen(true);
                }}
                className="flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-600/30 transition-colors"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Aprovar Estorno</span>
              </button>

              <button
                onClick={() => {
                  setSelectedRefund(r);
                  setActionError(null);
                  setRejectReason("");
                  setIsRejectOpen(true);
                }}
                className="flex items-center gap-1 rounded-lg bg-zinc-800 border border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Recusar</span>
              </button>
            </div>
          );
        }

        return (
          <div className="text-xs text-zinc-400">
            {r.mp_refund_id && (
              <span className="font-mono text-zinc-500">
                MELI: {r.mp_refund_id.slice(0, 12)}
              </span>
            )}
            {r.motivo_rejeicao && (
              <span className="text-rose-400/80 italic block">
                Motivo: {r.motivo_rejeicao}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <AdminAdsNavbar />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <RotateCcw className="h-7 w-7 text-purple-400" />
              Fila de Reembolsos da Carteira
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Analise pedidos de estorno de saldo disponível e processe refunds diretamente na API do Mercado Pago.
            </p>
          </div>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto">
          {[
            { id: "aguardando", label: "Aguardando Análise" },
            { id: "aprovado", label: "Aprovados (Estornados)" },
            { id: "rejeitado", label: "Rejeitados" },
            { id: "falhou", label: "Falhas na API MELI" },
            { id: "todos", label: "Todas as Solicitações" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === f.id
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/20"
                  : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Tabela de Reembolsos */}
        <DataTable
          columns={columns}
          data={refunds}
          isLoading={isLoading}
          emptyMessage={`Nenhuma solicitação de reembolso no filtro "${statusFilter}".`}
        />
      </main>

      {/* MODAL DE APROVAÇÃO DE REEMBOLSO */}
      {isApproveOpen && selectedRefund && (
        <ConfirmModal
          isOpen={isApproveOpen}
          onClose={() => !isActionLoading && setIsApproveOpen(false)}
          onConfirm={handleApproveConfirm}
          title="Aprovar e Executar Reembolso"
          confirmText="Executar Reembolso no Mercado Pago"
          confirmVariant="success"
          isLoading={isActionLoading}
          error={actionError}
          description={
            <div className="space-y-3">
              <p>
                Você está prestes a aprovar e estornar <strong>{formatCurrency(selectedRefund.valor)}</strong>.
              </p>
              <div className="rounded-xl bg-zinc-950 p-3.5 border border-white/10 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Valor a devolver:</span>
                  <span className="font-bold text-emerald-400">{formatCurrency(selectedRefund.valor)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Saldo atual do parceiro:</span>
                  <span>{formatCurrency(selectedRefund.wallets?.saldo_disponivel)}</span>
                </div>
              </div>
              <p className="text-xs text-zinc-400">
                O backend chamará a API de estornos do Mercado Pago. Somente após a confirmação do gateway o saldo disponível do parceiro será debitado no ledger. Em caso de falha na API MELI, o saldo não é alterado.
              </p>
            </div>
          }
        />
      )}

      {/* MODAL DE RECUSA DE REEMBOLSO */}
      {isRejectOpen && selectedRefund && (
        <ConfirmModal
          isOpen={isRejectOpen}
          onClose={() => !isActionLoading && setIsRejectOpen(false)}
          onConfirm={handleRejectConfirm}
          title="Recusar Solicitação de Reembolso"
          confirmText="Confirmar Recusa"
          confirmVariant="danger"
          isLoading={isActionLoading}
          error={actionError}
          description={
            <div className="space-y-3">
              <p>
                A solicitação de estorno no valor de <strong>{formatCurrency(selectedRefund.valor)}</strong> será rejeitada.
              </p>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Motivo da Recusa (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex: Valor vinculado a bônus promocional, contestação pendente..."
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-xs text-white focus:border-purple-500 focus:outline-none"
                />
              </div>
              <p className="text-xs text-emerald-400">
                ✓ O saldo permanece disponível na carteira do parceiro para novas campanhas.
              </p>
            </div>
          }
        />
      )}
    </div>
  );
}
