"use client";

import { useState } from "react";
import { Package, Plus, Check, User, HeartHandshake, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { EventItem } from "@/domain/events/types";

interface EventItemsListProps {
  eventId: string;
  items: EventItem[];
  currentUserId: string | null;
  onCommitmentChange: () => void;
}

export default function EventItemsList({ eventId, items, currentUserId, onCommitmentChange }: EventItemsListProps) {
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  if (!items || items.length === 0) return null;

  // Agrupa itens por categoria
  const categoriesMap: Record<string, EventItem[]> = {};
  items.forEach((item) => {
    const cat = item.category || "Geral";
    if (!categoriesMap[cat]) categoriesMap[cat] = [];
    categoriesMap[cat].push(item);
  });

  async function handleToggleCommitment(item: EventItem) {
    if (!currentUserId) {
      toast.error("Faça login para contribuir com este item");
      return;
    }

    const isCommitted = (item.my_commitment ?? 0) > 0;
    const newQty = isCommitted ? 0 : 1; // Se já contribui, desmarca; se não, garante 1 unid.

    setUpdatingItemId(item.id);
    try {
      const res = await fetch(`/api/fe-eventos/${eventId}/items/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQty }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erro ao registrar contribuição");
      }

      toast.success(newQty > 0 ? `Você se comprometeu a levar: ${item.name}!` : `Contribuição removida de: ${item.name}`);
      onCommitmentChange();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar contribuição");
    } finally {
      setUpdatingItemId(null);
    }
  }

  return (
    <div className="space-y-4 p-5 bg-white dark:bg-whatsapp-darkLighter rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-white/5">
        <HeartHandshake className="w-5 h-5 text-whatsapp-teal" />
        <div>
          <h3 className="font-bold text-sm text-gray-900 dark:text-white">Lista de Contribuição & Mantimentos</h3>
          <p className="text-[11px] text-gray-400">Escolha os itens que você pode levar para abençoar o evento</p>
        </div>
      </div>

      <div className="space-y-5">
        {Object.entries(categoriesMap).map(([category, catItems]) => (
          <div key={category} className="space-y-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-whatsapp-teal dark:text-whatsapp-green">
              {category}
            </h4>

            <div className="space-y-2">
              {catItems.map((item) => {
                const total = item.total_committed ?? 0;
                const needed = item.needed_quantity || 1;
                const percent = Math.min(100, Math.round((total / needed) * 100));
                const isMyCommitted = (item.my_commitment ?? 0) > 0;
                const isCompleted = total >= needed;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all flex flex-col gap-2.5",
                      isMyCommitted
                        ? "bg-whatsapp-teal/5 border-whatsapp-teal/30 dark:bg-whatsapp-teal/10"
                        : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                            isCompleted
                              ? "bg-emerald-500/15 text-emerald-500"
                              : "bg-amber-500/15 text-amber-500"
                          )}
                        >
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.name}</p>
                          <p className="text-[11px] text-gray-400 font-medium">
                            Garantido: <span className="font-bold text-gray-700 dark:text-gray-300">{total}</span> de{" "}
                            <span className="font-bold">{needed}</span> {item.unit}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleCommitment(item)}
                        disabled={updatingItemId === item.id}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 active:scale-95",
                          isMyCommitted
                            ? "bg-whatsapp-teal text-white shadow-md shadow-whatsapp-teal/20"
                            : "bg-white dark:bg-whatsapp-dark border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-whatsapp-teal hover:text-whatsapp-teal"
                        )}
                      >
                        {updatingItemId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isMyCommitted ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Eu Vou Levar
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" /> Posso Levar
                          </>
                        )}
                      </button>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="w-full bg-gray-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-500",
                          isCompleted ? "bg-emerald-500" : "bg-whatsapp-teal"
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* Lista de Contribuidores */}
                    {item.commitments && item.commitments.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-gray-100 dark:border-white/5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                          Contribuintes:
                        </span>
                        {item.commitments.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-white/5 border border-gray-200/60 dark:border-white/10 text-gray-600 dark:text-gray-300"
                          >
                            <User className="w-2.5 h-2.5 text-whatsapp-teal" />
                            {c.profiles?.full_name || `@${c.profiles?.username}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
