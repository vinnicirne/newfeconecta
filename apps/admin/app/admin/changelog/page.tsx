"use client";

import React from "react";
import { PageHeader as PH } from "@/components/page-header";
import { 
  History, 
  GitCommit, 
  Search, 
  Filter,
  Package,
  ShieldCheck,
  Zap,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ChangeLogPage() {
  const logs = [
    { version: "v1.2.4", date: "09 Abr 2026", type: "update", title: "Melhorias na Moderação de IA", description: "Otimização do algoritmo de detecção de spam e melhoria de 15% na precisão de flagging.", author: "Dev Team" },
    { version: "v1.2.3", date: "05 Abr 2026", type: "fix", title: "Correção no Checkout PRO", description: "Resolvido problema onde alguns usuários viam erro 402 ao processar Pix.", author: "Finance Dev" },
    { version: "v1.2.0", date: "01 Abr 2026", type: "feature", title: "Lançamento do Sistema de Shadow Ban", description: "Implementação nativa do sistema de moderação silenciosa para contas suspeitas.", author: "Security Team" },
  ];

  return (
    <div className="pb-12">
      <PH 
        title="Registro de Alterações" 
        description="Histórico de atualizações, correções e novas funcionalidades do sistema Admin."
      />

      <div className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow relative overflow-hidden mb-10">
        <div className="relative z-10">
          <h3 className="text-xl font-bold dark:text-white mb-2 italic">Versão Atual: v1.2.4-stable</h3>
          <p className="text-sm text-gray-500 mb-6">Última atualização realizada hoje, às 10:45 AM.</p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-whatsapp-green/10 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-whatsapp-green" />
              <span className="text-xs font-bold text-whatsapp-green uppercase tracking-wider">Verificado</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 rounded-xl">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">High Priority</span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-8">
           <History className="w-32 h-32 text-gray-100 dark:text-white/5 -rotate-12" />
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-white/10 before:to-transparent">
        {logs.map((log, i) => (
          <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            {/* Dot */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-100 dark:border-white/10 bg-white dark:bg-whatsapp-dark text-gray-400 group-[.is-active]:text-whatsapp-green shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
              <GitCommit className="w-5 h-5" />
            </div>
            {/* Content */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white dark:bg-whatsapp-darkLighter p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest",
                    log.type === 'feature' ? "bg-purple-100 text-purple-600" : 
                    log.type === 'fix' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                  )}>
                    {log.type}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 font-mono tracking-tighter">{log.version}</span>
                </div>
                <h4 className="font-bold dark:text-white mb-2">{log.title}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">{log.description}</p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-white/5">
                  <span className="text-[10px] text-gray-400 font-medium">Responsável: <span className="text-whatsapp-teal dark:text-whatsapp-green">{log.author}</span></span>
                  <span className="text-[10px] text-gray-400 italic">{log.date}</span>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
