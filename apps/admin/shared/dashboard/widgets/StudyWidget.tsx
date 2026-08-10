import React from "react";
import { BookOpen } from "lucide-react";
import { DashboardContext } from "../application/DashboardAggregator";

export function StudyWidget({ context }: { context: DashboardContext }) {
  return (
    <div className="bg-white dark:bg-[#111B21] p-5 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm cursor-pointer hover:scale-[1.01] transition-transform">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 dark:text-white text-lg">Estudo desta semana</h3>
          <p className="text-xs text-gray-500">Disponibilizado pelo líder</p>
        </div>
      </div>
      <div className="p-4 bg-gray-50 dark:bg-black/30 rounded-2xl border border-gray-100 dark:border-white/5">
        <h4 className="font-black text-gray-800 dark:text-gray-200 mb-1">O Bom Samaritano</h4>
        <p className="text-sm text-gray-500">Lucas 10:25-37</p>
      </div>
    </div>
  );
}
