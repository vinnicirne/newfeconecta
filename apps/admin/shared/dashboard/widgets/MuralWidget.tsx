import React from "react";
import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { DashboardContext } from "../application/DashboardAggregator";

export function MuralWidget({ context }: { context: DashboardContext }) {
  const { group } = context;
  // TODO: Em uma implementação real o slug deveria vir do contexto global do tenant, 
  // mas como os widgets estão focados na UI, vamos simplificar para a demonstração.
  
  return (
    <Link href={`/igreja/teste/celula/${group?.id}/feed`}>
      <div className="bg-white dark:bg-[#111B21] p-5 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm cursor-pointer hover:scale-[1.01] transition-transform">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <MessageCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Mural da Célula</h3>
          </div>
          <div className="flex -space-x-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 border border-white dark:border-[#111B21]" />
            <div className="w-6 h-6 rounded-full bg-gray-300 border border-white dark:border-[#111B21]" />
          </div>
        </div>
        
        <div className="p-3 bg-blue-50 dark:bg-blue-500/5 rounded-2xl">
          {(context.dashboard as any).muralNotice ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <span className="font-bold">Aviso:</span> {(context.dashboard as any).muralNotice.title}
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              Nenhum aviso no mural da célula no momento.
            </p>
          )}
        </div>
        <div className="mt-4 text-center text-sm font-bold text-blue-500">
          Abrir Mural (Substitui WhatsApp)
        </div>
      </div>
    </Link>
  );
}
