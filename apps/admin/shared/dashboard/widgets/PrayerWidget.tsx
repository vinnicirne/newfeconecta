import React from "react";
import { HeartHandshake } from "lucide-react";
import { DashboardContext } from "../application/DashboardAggregator";

export function PrayerWidget({ context }: { context: DashboardContext }) {
  // Em uma implementação real, buscaríamos os pedidos do domínio de Prayers
  // Por enquanto mantemos o mock visual focado na conversão para Widget
  
  return (
    <div className="bg-white dark:bg-[#111B21] p-5 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm cursor-pointer hover:scale-[1.01] transition-transform">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">Pedidos de oração</h3>
        </div>
        <span className="px-2 py-1 bg-gray-100 dark:bg-white/5 rounded-full text-xs font-bold text-gray-500">2</span>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-start gap-2 text-sm">
          <span className="font-bold text-gray-900 dark:text-gray-200">Maria:</span>
          <span className="text-gray-600 dark:text-gray-400 truncate">Pela minha cirurgia de amanhã...</span>
        </div>
        <div className="flex items-start gap-2 text-sm">
          <span className="font-bold text-gray-900 dark:text-gray-200">João:</span>
          <span className="text-gray-600 dark:text-gray-400 truncate">Estou buscando emprego na área...</span>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 text-center text-sm font-bold text-indigo-500">
        Ver todos os pedidos
      </div>
    </div>
  );
}
