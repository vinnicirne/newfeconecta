"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, XCircle, Eye, AlertCircle, Loader2, ShieldCheck, Filter } from "lucide-react";
import { AdminAdsNavbar } from "@/components/ads/AdminAdsNavbar";
import { StatusBadge } from "@/components/ads/StatusBadge";
import { BudgetProgress } from "@/components/ads/BudgetProgress";
import { DataTable, Column } from "@/components/ads/DataTable";
import { ConfirmModal } from "@/components/ads/ConfirmModal";
import { adsApiFetch, formatCurrency, formatDate } from "@/lib/ads-utils";
import { Campaign, CampaignStatus } from "@/domain/ads/types";
import { toast } from "sonner";

export default function AdminAdsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pendente");

  // Modais de Ação
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal de Preview de Mídia
  const [previewCampaign, setPreviewCampaign] = useState<Campaign | null>(null);

  async function loadCampaigns() {
    try {
      setIsLoading(true);
      const url = statusFilter === "todos"
        ? "/api/admin/campaigns"
        : `/api/admin/campaigns?status=${statusFilter}`;
      const res = await adsApiFetch<{ campaigns: Campaign[]; total: number }>(url);
      setCampaigns(res.campaigns || []);
    } catch (err: any) {
      toast.error("Erro ao carregar lista de campanhas para moderação", { description: err.message });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, [statusFilter]);

  // Execução de Aprovação
  async function handleApproveConfirm() {
    if (!selectedCampaign) return;

    try {
      setIsActionLoading(true);
      setActionError(null);

      await adsApiFetch(`/api/admin/campaigns/${selectedCampaign.id}/approve`, {
        method: "POST",
      });

      toast.success("Campanha aprovada com sucesso!", {
        description: "O saldo foi debitado e a campanha está ativa para veiculação.",
      });

      setIsApproveOpen(false);
      setSelectedCampaign(null);
      loadCampaigns();
    } catch (err: any) {
      setActionError(err.message || "Falha ao aprovar campanha.");
    } finally {
      setIsActionLoading(false);
    }
  }

  // Execução de Reprovação
  async function handleRejectConfirm() {
    if (!selectedCampaign) return;

    try {
      setIsActionLoading(true);
      setActionError(null);

      await adsApiFetch(`/api/admin/campaigns/${selectedCampaign.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ motivo: rejectReason.trim() || undefined }),
      });

      toast.success("Campanha reprovada.", {
        description: "O parceiro foi notificado e o saldo permaneceu disponível na carteira.",
      });

      setIsRejectOpen(false);
      setSelectedCampaign(null);
      setRejectReason("");
      loadCampaigns();
    } catch (err: any) {
      setActionError(err.message || "Falha ao reprovar campanha.");
    } finally {
      setIsActionLoading(false);
    }
  }

  const columns: Column<Campaign>[] = [
    {
      header: "Campanha & Parceiro",
      cell: (c) => (
        <div>
          <div className="font-semibold text-white flex items-center gap-2">
            <span>{c.nome}</span>
            {c.criativo_url && (
              <button
                onClick={() => setPreviewCampaign(c)}
                title="Visualizar criativo"
                className="text-zinc-400 hover:text-emerald-400"
              >
                <Eye className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">
            Parceiro ID: {c.partner_id.slice(0, 8)} • Formato: <span className="uppercase">{c.formato}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Status",
      cell: (c) => <StatusBadge status={c.status} showDetails={false} />,
    },
    {
      header: "Orçamento",
      cell: (c) => (
        <span className="font-bold text-white">
          {formatCurrency(c.orcamento)}
        </span>
      ),
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
      header: "Ações de Moderação",
      className: "text-right",
      cell: (c) => {
        if (c.status === "pendente") {
          return (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedCampaign(c);
                  setActionError(null);
                  setIsApproveOpen(true);
                }}
                className="flex items-center gap-1 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-600/30 transition-colors"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Aprovar</span>
              </button>

              <button
                onClick={() => {
                  setSelectedCampaign(c);
                  setActionError(null);
                  setRejectReason("");
                  setIsRejectOpen(true);
                }}
                className="flex items-center gap-1 rounded-lg bg-rose-600/20 border border-rose-500/30 px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-600/30 transition-colors"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Reprovar</span>
              </button>
            </div>
          );
        }

        return (
          <span className="text-xs text-zinc-500">
            {c.status === "ativa" ? "Em veiculação" : "Concluído"}
          </span>
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
              <ShieldCheck className="h-7 w-7 text-purple-400" />
              Central de Moderação de Campanhas
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Analise anúncios patrocinados enviados por parceiros, aprove ou reprove veiculações.
            </p>
          </div>
        </div>

        {/* Abas de Filtros Rápidos */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-4 overflow-x-auto">
          {[
            { id: "pendente", label: "Aguardando Moderação" },
            { id: "ativa", label: "Ativas em Veiculação" },
            { id: "reprovado", label: "Reprovadas" },
            { id: "encerrado", label: "Encerradas" },
            { id: "todos", label: "Todas as Campanhas" },
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

        {/* Tabela de Campanhas */}
        <DataTable
          columns={columns}
          data={campaigns}
          isLoading={isLoading}
          emptyMessage={`Nenhuma campanha encontrada no filtro "${statusFilter}".`}
        />
      </main>

      {/* MODAL DE APROVAÇÃO */}
      {isApproveOpen && selectedCampaign && (
        <ConfirmModal
          isOpen={isApproveOpen}
          onClose={() => !isActionLoading && setIsApproveOpen(false)}
          onConfirm={handleApproveConfirm}
          title="Aprovar Campanha Patrocinada"
          confirmText="Confirmar Aprovação e Débito"
          confirmVariant="success"
          isLoading={isActionLoading}
          error={actionError}
          description={
            <div className="space-y-3">
              <p>
                Você está prestes a aprovar a campanha <strong>"{selectedCampaign.nome}"</strong>.
              </p>
              <div className="rounded-xl bg-zinc-950 p-3.5 border border-white/10 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Orçamento a debitar:</span>
                  <span className="font-bold text-emerald-400">
                    {formatCurrency(selectedCampaign.orcamento)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Parceiro ID:</span>
                  <span className="font-mono text-zinc-300">{selectedCampaign.partner_id.slice(0, 12)}...</span>
                </div>
              </div>
              <p className="text-xs text-zinc-400">
                O valor será transferido do <em>Saldo Disponível</em> para o <em>Saldo Investido</em> do parceiro e o anúncio entrará no ad-serving. Se o parceiro não possuir saldo suficiente, a transação será abortada com erro 402.
              </p>
            </div>
          }
        />
      )}

      {/* MODAL DE REPROVAÇÃO */}
      {isRejectOpen && selectedCampaign && (
        <ConfirmModal
          isOpen={isRejectOpen}
          onClose={() => !isActionLoading && setIsRejectOpen(false)}
          onConfirm={handleRejectConfirm}
          title="Reprovar Campanha"
          confirmText="Confirmar Reprovação"
          confirmVariant="danger"
          isLoading={isActionLoading}
          error={actionError}
          description={
            <div className="space-y-3">
              <p>
                A campanha <strong>"{selectedCampaign.nome}"</strong> será reprovada e não entrará no ad-serving.
              </p>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Motivo da Reprovação (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex: Imagem fora das diretrizes, link inválido, promessa abusiva..."
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-xs text-white focus:border-rose-500 focus:outline-none"
                />
              </div>
              <p className="text-xs text-emerald-400">
                ✓ O saldo disponível do parceiro é preservado (não há cobrança e não aciona reembolso MELI automático).
              </p>
            </div>
          }
        />
      )}

      {/* MODAL DE PREVIEW DO CRIATIVO */}
      {previewCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewCampaign(null)}
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl z-10 space-y-4">
            <h3 className="text-base font-bold text-white">Prévia do Criativo: {previewCampaign.nome}</h3>
            {previewCampaign.criativo_url ? (
              <div className="overflow-hidden rounded-xl bg-zinc-950 border border-white/10 aspect-video flex items-center justify-center">
                <img
                  src={previewCampaign.criativo_url}
                  alt={previewCampaign.nome}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <p className="text-xs text-zinc-400">Sem URL de criativo cadastrada.</p>
            )}
            {previewCampaign.texto && (
              <p className="text-xs text-zinc-300 italic">"{previewCampaign.texto}"</p>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setPreviewCampaign(null)}
                className="rounded-xl px-4 py-2 text-xs font-semibold bg-white/10 text-white hover:bg-white/20"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
