"use client";

import React, { useState } from "react";
import { Poll, PollOption } from "@/domain/polls/types";
import { CheckCircle2, Circle, Clock, Vote, Trash2 } from "lucide-react";
import moment from "moment";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PollCardProps {
  poll: Poll;
  currentUserId?: string | null;
  onVoted?: (updatedPoll: Poll) => void;
  onDelete?: (id: string) => void;
}

export default function PollCard({ poll, currentUserId, onVoted, onDelete }: PollCardProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(poll.my_vote || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isExpired = moment().isAfter(moment(poll.expires_at));
  const hasVoted = Boolean(poll.my_vote && poll.my_vote.length > 0);
  const showResults = hasVoted || isExpired;
  const isAuthor = currentUserId && poll.author_id === currentUserId;

  const handleToggleOption = (optId: string) => {
    if (showResults) return;
    if (poll.allow_multiple) {
      setSelectedOptions((prev) =>
        prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId]
      );
    } else {
      setSelectedOptions([optId]);
    }
  };

  const handleVote = async () => {
    if (selectedOptions.length === 0) {
      toast.error("Selecione pelo menos uma opção para votar.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/polls/${poll.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_ids: selectedOptions }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erro ao registrar voto");
      }

      const updatedPoll = await res.json();
      toast.success("Voto registrado com sucesso!");
      if (onVoted) onVoted(updatedPoll);
    } catch (err: any) {
      toast.error(err.message || "Falha ao enviar voto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const authorName = poll.profiles?.full_name || "Usuário FéConecta";
  const authorAvatar = poll.profiles?.avatar_url;

  return (
    <div className="bg-white dark:bg-[#0c0c0c] border border-black/10 dark:border-white/10 rounded-2xl p-5 shadow-sm space-y-4 transition-all">
      {/* Header com Autor e Status */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-whatsapp-teal/10 border border-whatsapp-teal/20 flex items-center justify-center font-bold text-whatsapp-teal">
            {authorAvatar ? (
              <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
            ) : (
              authorName[0]?.toUpperCase() || "U"
            )}
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-snug">
              {authorName}
            </h4>
            <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {isExpired ? "Encerrada" : `Expira ${moment(poll.expires_at).fromNow()}`}
              </span>
              <span>•</span>
              <span>{poll.allow_multiple ? "Múltipla escolha" : "Escolha única"}</span>
            </div>
          </div>
        </div>

        {isAuthor && onDelete && (
          <button
            onClick={() => onDelete(poll.id)}
            className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
            title="Excluir enquete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Pergunta */}
      <h3 className="text-base font-extrabold text-gray-900 dark:text-white leading-relaxed">
        {poll.question}
      </h3>

      {/* Lista de Opções */}
      <div className="space-y-2.5">
        {poll.options.map((opt: PollOption) => {
          const result = poll.results?.find((r) => r.option_id === opt.id);
          const pct = result?.percentage || 0;
          const votesCount = result?.count || 0;
          const isSelected = selectedOptions.includes(opt.id);
          const isUserVotedThis = poll.my_vote?.includes(opt.id);

          if (showResults) {
            return (
              <div
                key={opt.id}
                className={cn(
                  "relative overflow-hidden rounded-xl border p-3.5 transition-all flex flex-col justify-center",
                  isUserVotedThis
                    ? "border-whatsapp-teal bg-whatsapp-teal/10 font-bold"
                    : "border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5"
                )}
              >
                {/* Barra de Porcentagem de Fundo */}
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 transition-all duration-500 opacity-20",
                    isUserVotedThis ? "bg-whatsapp-teal" : "bg-gray-400 dark:bg-gray-600"
                  )}
                  style={{ width: `${pct}%` }}
                />

                <div className="relative z-10 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {isUserVotedThis && <CheckCircle2 className="w-4 h-4 text-whatsapp-teal shrink-0" />}
                    {opt.text}
                  </span>
                  <span className="text-xs font-black text-gray-700 dark:text-gray-300">
                    {pct}% <span className="text-[10px] font-normal text-gray-500">({votesCount})</span>
                  </span>
                </div>
              </div>
            );
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleToggleOption(opt.id)}
              type="button"
              className={cn(
                "w-full flex items-center gap-3 p-3.5 rounded-xl border text-left text-sm font-bold transition-all active:scale-[0.99]",
                isSelected
                  ? "border-whatsapp-teal bg-whatsapp-teal/10 text-whatsapp-teal shadow-sm"
                  : "border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 text-gray-800 dark:text-gray-200 hover:border-whatsapp-teal/50"
              )}
            >
              {isSelected ? (
                <CheckCircle2 className="w-5 h-5 text-whatsapp-teal shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400 shrink-0" />
              )}
              <span className="flex-1">{opt.text}</span>
            </button>
          );
        })}
      </div>

      {/* Footer com Botão de Votar ou Total de Votos */}
      <div className="pt-2 flex items-center justify-between border-t border-black/5 dark:border-white/5">
        <span className="text-xs font-medium text-gray-500">
          {poll.total_votes || 0} {poll.total_votes === 1 ? "voto" : "votos"}
        </span>

        {!showResults && (
          <button
            onClick={handleVote}
            disabled={isSubmitting || selectedOptions.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-whatsapp-teal hover:bg-whatsapp-teal/90 text-white font-bold text-xs shadow-md shadow-whatsapp-teal/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Vote className="w-4 h-4" />
            <span>{isSubmitting ? "Votando..." : "Votar"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
