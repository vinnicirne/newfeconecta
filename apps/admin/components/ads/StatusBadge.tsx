import React from "react";
import clsx from "clsx";
import { CampaignStatus, RefundRequestStatus, WalletTransactionType } from "@/domain/ads/types";

interface StatusBadgeProps {
  status: CampaignStatus | RefundRequestStatus | WalletTransactionType | string;
  showDetails?: boolean;
}

export function StatusBadge({ status, showDetails = true }: StatusBadgeProps) {
  switch (status) {
    // Campaign Statuses
    case "ativa":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Ativa
        </span>
      );
    case "pendente":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Em Análise
        </span>
      );
    case "pausado":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-2.5 py-1 text-xs font-semibold text-zinc-400 border border-zinc-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
          Pausada
        </span>
      );
    case "reprovado":
      return (
        <div className="inline-flex flex-col">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 border border-rose-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
            Reprovada
          </span>
          {showDetails && (
            <span className="text-[10px] text-zinc-400 mt-0.5">
              Valor disponível na carteira
            </span>
          )}
        </div>
      );
    case "encerrado":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-400 border border-slate-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
          Encerrada
        </span>
      );
    case "rascunho":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-400 border border-zinc-700">
          Rascunho
        </span>
      );

    // Refund Statuses
    case "aguardando":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Aguardando Análise
        </span>
      );
    case "aprovado":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Aprovado
        </span>
      );
    case "rejeitado":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-2.5 py-1 text-xs font-medium text-zinc-400 border border-zinc-500/20">
          Rejeitado
        </span>
      );
    case "falhou":
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-400 border border-rose-500/20">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          Falha no Reembolso
        </span>
      );

    // Transaction Types
    case "recarga":
      return (
        <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
          + Recarga
        </span>
      );
    case "debito_campanha":
      return (
        <span className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
          - Débito Campanha
        </span>
      );
    case "estorno_reprovacao":
      return (
        <span className="inline-flex items-center rounded-md bg-teal-500/10 px-2 py-0.5 text-xs font-semibold text-teal-400">
          + Estorno Reprovação
        </span>
      );
    case "reembolso":
      return (
        <span className="inline-flex items-center rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-400">
          - Reembolso
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300">
          {status}
        </span>
      );
  }
}
