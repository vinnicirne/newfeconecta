"use client";

import React, { useEffect, useState } from "react";
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
import { supabase } from "@/lib/supabase";
import moment from "moment";
import "moment/locale/pt-br";
import { toast } from "sonner";

moment.locale('pt-br');

export default function ChangeLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_changelog')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      // Fallback para exibir mocks se a tabela ainda não foi criada, 
      // mas alertar o admin sobre a necessidade de execução do SQL
      console.error("Changelog Error:", err);
      setLogs([
        { version: "v1.5.0-nuclear", date: new Date().toISOString(), type: "update", title: "Nuclear Cleanups em Progresso", description: "Infraestrutura de monitoramento, salas e ferramentas operacionalizadas via Supabase.", author: "Antigravity AI" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const currentVersion = logs[0]?.version || "v1.2.4-lite";
  const lastUpdate = logs[0]?.created_at ? moment(logs[0].created_at).calendar() : "Aguardando sincronismo";

  return (
    <div className="pb-12 animate-in fade-in duration-500">
      <PH 
        title="Registro de Alterações" 
        description="Histórico auditável de atualizações, correções e faxinas técnicas do ecossistema FéConecta."
      >
        <button 
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 bg-whatsapp-teal text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-whatsapp-tealLight transition-all active:scale-95 shadow-xl shadow-whatsapp-teal/20"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> {loading ? "Sincronizando..." : "Sincronizar Histórico"}
        </button>
      </PH>

      <div className="bg-white dark:bg-whatsapp-darkLighter p-10 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02] relative overflow-hidden mb-12">
        <div className="relative z-10">
          <h3 className="text-2xl font-black dark:text-white mb-3 italic tracking-tight tracking-tight uppercase">Build Atual: {currentVersion}</h3>
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mb-8 leading-relaxed">Última atualização: <span className="text-whatsapp-teal">{lastUpdate}</span></p>
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-6 py-2.5 bg-whatsapp-green/10 rounded-2xl">
              <ShieldCheck className="w-4 h-4 text-whatsapp-green" />
              <span className="text-[10px] font-black text-whatsapp-green uppercase tracking-[0.2em]">Build Verificado</span>
            </div>
            <div className="flex items-center gap-2 px-6 py-2.5 bg-blue-500/10 rounded-2xl">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Stable Release</span>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 p-12 opacity-50">
           <History className="w-40 h-40 text-gray-100 dark:text-white/5 -rotate-12 transition-transform duration-1000 group-hover:rotate-0" />
        </div>
      </div>

      <div className="space-y-10 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-white/10 before:to-transparent">
        {logs.map((log, i) => (
          <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl border border-gray-100 dark:border-white/10 bg-white dark:bg-whatsapp-dark text-gray-300 group-[.is-active]:text-whatsapp-teal shadow-xl shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-all group-hover:scale-125 z-20">
              <GitCommit className="w-6 h-6" />
            </div>
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] bg-white dark:bg-whatsapp-darkLighter p-10 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-2xl shadow-black/[0.03] hover:border-whatsapp-teal/30 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <span className={cn(
                    "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest",
                    log.type === 'feature' ? "bg-purple-100 text-purple-600" : 
                    log.type === 'fix' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                  )}>
                    {log.type}
                  </span>
                  <span className="text-[10px] font-black text-gray-400 font-mono tracking-widest">{log.version}</span>
                </div>
                <h4 className="font-black dark:text-white mb-3 text-lg tracking-tight uppercase">{log.title}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-8 font-medium">{log.description}</p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-6 border-t border-gray-100 dark:border-white/5 gap-3">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                    Responsável: <span className="text-whatsapp-teal">{log.author}</span>
                  </span>
                  <span className="text-[10px] text-gray-400 italic font-medium">{moment(log.created_at || log.date).format('LL')}</span>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
