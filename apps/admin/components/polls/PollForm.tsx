"use client";

import React, { useState } from "react";
import { CreatePollDto, PollOption } from "@/domain/polls/types";
import { Plus, Trash2, HelpCircle, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface PollFormProps {
  onSubmit: (dto: CreatePollDto) => void;
  isSaving: boolean;
}

export default function PollForm({ onSubmit, isSaving }: PollFormProps) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  const handleAddOption = () => {
    if (options.length >= 8) {
      toast.error("Máximo de 8 opções por enquete.");
      return;
    }
    setOptions((prev) => [...prev, ""]);
  };

  const handleRemoveOption = (index: number) => {
    if (options.length <= 2) {
      toast.error("Uma enquete deve ter no mínimo 2 opções.");
      return;
    }
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOptionChange = (index: number, value: string) => {
    setOptions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      toast.error("Escreva a pergunta da enquete.");
      return;
    }

    const cleanOptions = options.map((opt) => opt.trim()).filter(Boolean);

    if (cleanOptions.length < 2) {
      toast.error("Preencha pelo menos 2 opções válidas.");
      return;
    }

    const formattedOptions: PollOption[] = cleanOptions.map((text) => ({
      id: crypto.randomUUID(),
      text,
    }));

    onSubmit({
      question: question.trim(),
      options: formattedOptions,
      allow_multiple: allowMultiple,
      is_public: isPublic,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Pergunta */}
      <div className="space-y-2">
        <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
          Pergunta da Enquete *
        </label>
        <textarea
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ex: Qual o seu horário preferido para o culto de oração?"
          className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0c0c0c] px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-whatsapp-teal focus:outline-none font-medium leading-relaxed"
        />
      </div>

      {/* Opções */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Opções de Resposta (mínimo 2, máximo 8) *
          </label>
          <span className="text-xs text-gray-500 font-bold">{options.length}/8</span>
        </div>

        <div className="space-y-2.5">
          {options.map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-6 text-center text-xs font-bold text-gray-400">{idx + 1}.</span>
              <input
                type="text"
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                placeholder={`Opção ${idx + 1}`}
                className="flex-1 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#0c0c0c] px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:border-whatsapp-teal focus:outline-none font-medium"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => handleRemoveOption(idx)}
                  className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        {options.length < 8 && (
          <button
            type="button"
            onClick={handleAddOption}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-black/20 dark:border-white/20 hover:border-whatsapp-teal text-xs font-bold text-whatsapp-teal transition-all w-full justify-center bg-whatsapp-teal/5 hover:bg-whatsapp-teal/10"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar outra opção</span>
          </button>
        )}
      </div>

      {/* Configurações */}
      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 space-y-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <span className="text-sm font-bold text-gray-900 dark:text-white block">
              Permitir múltipla escolha
            </span>
            <span className="text-xs text-gray-500">
              Usuários poderão votar em mais de uma opção.
            </span>
          </div>
          <input
            type="checkbox"
            checked={allowMultiple}
            onChange={(e) => setAllowMultiple(e.target.checked)}
            className="w-5 h-5 rounded accent-whatsapp-teal cursor-pointer"
          />
        </label>

        <div className="border-t border-black/5 dark:border-white/5 pt-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm font-bold text-gray-900 dark:text-white block">
                Enquete Pública
              </span>
              <span className="text-xs text-gray-500">
                Visível para todos os membros da comunidade no feed.
              </span>
            </div>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-5 h-5 rounded accent-whatsapp-teal cursor-pointer"
            />
          </label>
        </div>
      </div>

      <p className="text-[11px] text-gray-500 italic flex items-center gap-1.5">
        <HelpCircle className="w-3.5 h-3.5" />
        Sua enquete ficará ativa por 24 horas a partir da publicação.
      </p>

      {/* Botão de Envio */}
      <button
        type="submit"
        disabled={isSaving}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-whatsapp-teal hover:bg-whatsapp-teal/90 text-white font-bold text-sm shadow-lg shadow-whatsapp-teal/20 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Criando enquete...</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            <span>Publicar Enquete</span>
          </>
        )}
      </button>
    </form>
  );
}
