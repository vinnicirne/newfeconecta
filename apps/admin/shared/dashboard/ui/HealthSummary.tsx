import React from "react";
import { Users, HeartPulse, MapPin } from "lucide-react";


export function HealthSummary({ summary }: { summary: any }) {
  if (!summary) return null;

  return (
    <div className="grid grid-cols-3 gap-3 pb-4">
      <div className="bg-white dark:bg-[#1A2429] rounded-2xl p-3 shadow-sm border border-black/5 dark:border-white/5 flex flex-col">
        <div className="flex items-center gap-1.5 text-gray-500 mb-2">
          <Users className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter truncate">Membros</span>
        </div>
        <p className="text-lg font-black leading-none mb-1 text-gray-900 dark:text-white">{summary.stats.members}</p>
        <p className="text-[10px] text-emerald-500 font-medium">100% ativos</p>
      </div>

      <div className="bg-white dark:bg-[#1A2429] rounded-2xl p-3 shadow-sm border border-black/5 dark:border-white/5 flex flex-col">
        <div className="flex items-center gap-1.5 text-gray-500 mb-2">
          <MapPin className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter truncate">Encontros</span>
        </div>
        <p className="text-lg font-black leading-none mb-1 text-gray-900 dark:text-white">{summary.stats.meetingsThisMonth}</p>
        <p className="text-[10px] text-gray-400 font-medium">este mês</p>
      </div>

      <div className="bg-white dark:bg-[#1A2429] rounded-2xl p-3 shadow-sm border border-black/5 dark:border-white/5 flex flex-col">
        <div className="flex items-center gap-1.5 text-gray-500 mb-2">
          <HeartPulse className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-tighter truncate">Saúde</span>
        </div>
        <p className="text-lg font-black leading-none mb-1 text-gray-900 dark:text-white">{summary.health.score}%</p>
        <p className="text-[10px] text-emerald-500 font-medium">excelente</p>
      </div>
    </div>
  );
}
