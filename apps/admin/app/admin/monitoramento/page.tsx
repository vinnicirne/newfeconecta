"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/lib/supabase";
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Smartphone, 
  Image as ImageIcon, 
  Mic, 
  Film, 
  Code, 
  Database, 
  UserCircle,
  Activity,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import "moment/locale/pt-br";
import { toast } from "sonner";

moment.locale('pt-br');

export default function ErrorMonitoringPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState<string>("all");
  const [isLive, setIsLive] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Simplificamos a query para garantir compatibilidade caso a FK não esteja pronta
      let query = supabase
        .from('system_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (filterModule !== "all") {
        query = query.eq('module', filterModule);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Monitoramento Error:", err);
      toast.error("Infraestrutura de monitoramento pendente ou inacessível.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    const channel = supabase.channel('system_monitoring_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_errors' }, (payload) => {
        setIsLive(true);
        if (filterModule === "all" || payload.new.module === filterModule) {
          setLogs(prev => [payload.new, ...prev].slice(0, 50));
          toast.warning(`Nova falha detectada no módulo: ${payload.new.module}`);
        }
        setTimeout(() => setIsLive(false), 2000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [filterModule]);

  const markAsResolved = async (id: string, currentlyResolved: boolean) => {
    const { error } = await supabase
      .from('system_errors')
      .update({ resolved: !currentlyResolved })
      .eq('id', id);
    
    if (!error) {
      setLogs(logs.map(log => log.id === id ? { ...log, resolved: !currentlyResolved } : log));
      toast.success(currentlyResolved ? "Erro reaberto para auditoria." : "Falha marcada como resolvida.");
    }
  };

  const getModuleIcon = (moduleName: string) => {
    switch(moduleName) {
      case 'camera': return <Smartphone className="w-5 h-5 text-purple-500" />;
      case 'gallery': return <ImageIcon className="w-5 h-5 text-blue-500" />;
      case 'audio': return <Mic className="w-5 h-5 text-orange-500" />;
      case 'story': return <Film className="w-5 h-5 text-pink-500" />;
      case 'database': return <Database className="w-5 h-5 text-whatsapp-teal" />;
      case 'auth': return <UserCircle className="w-5 h-5 text-indigo-500" />;
      default: return <Code className="w-5 h-5 text-red-500" />;
    }
  };

  return (
    <div className="pb-12 animate-in fade-in duration-500">
      <PageHeader 
        title="Monitoramento de Falhas (Live)" 
        description="Telemetria em tempo real de mídia, câmera e infraestrutura global."
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all",
            isLive ? "bg-whatsapp-green/20 border-whatsapp-green text-whatsapp-green" : "bg-gray-100 dark:bg-white/5 border-transparent text-gray-400"
          )}>
            <Activity className={cn("w-3 h-3", isLive && "animate-pulse")} /> 
            {isLive ? "Telemetria Ativa" : "Standby"}
          </div>
          <button onClick={fetchLogs} className="flex items-center gap-2 bg-whatsapp-teal text-white px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-whatsapp-tealLight transition-all active:scale-95 shadow-lg shadow-whatsapp-teal/20">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> {loading ? "Sincronizando..." : "Atualizar"}
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: "Erros Hoje", value: logs.filter(l => moment(l.created_at).isSame(moment(), 'day')).length, color: "text-red-500", icon: AlertTriangle },
          { label: "Bugs de Mídia", value: logs.filter(l => ['camera','gallery','audio'].includes(l.module)).length, color: "text-purple-500", icon: Film },
          { label: "Falhas de API", value: logs.filter(l => l.module === 'database' || l.module === 'system').length, color: "text-orange-500", icon: Database },
          { label: "Auditados", value: logs.filter(l => l.resolved).length, color: "text-whatsapp-green", icon: CheckCircle }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02] group">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <stat.icon className={cn("w-4 h-4 opacity-30 group-hover:opacity-100 transition-opacity", stat.color)} />
            </div>
            <p className={cn("text-3xl font-black tracking-tight", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-whatsapp-darkLighter rounded-[40px] shadow-2xl shadow-black/[0.03] border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex flex-wrap gap-3 items-center justify-between">
           <div className="flex gap-2">
              {["all", "system", "camera", "gallery", "audio", "story", "database", "auth"].map(mod => (
                <button 
                  key={mod}
                  onClick={() => setFilterModule(mod)}
                  className={cn(
                    "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all border",
                    filterModule === mod 
                      ? "bg-whatsapp-teal text-white border-whatsapp-teal shadow-lg shadow-whatsapp-teal/20 scale-105" 
                      : "bg-transparent border-gray-200 dark:border-white/10 text-gray-400 hover:border-whatsapp-teal/40"
                  )}
                >
                  {mod}
                </button>
              ))}
           </div>
        </div>
        
        {loading && logs.length === 0 ? (
          <div className="p-20 text-center">
             <RefreshCw className="w-12 h-12 mx-auto mb-6 animate-spin text-whatsapp-teal" />
             <p className="font-black text-gray-400 uppercase tracking-[0.2em] text-xs">Sincronizando logs do sistema...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-20 text-center">
             <CheckCircle className="w-16 h-16 mx-auto mb-6 text-whatsapp-green opacity-20" />
             <p className="font-black dark:text-white uppercase tracking-widest">Nenhuma falha registrada</p>
             <p className="text-xs text-gray-400 mt-2 font-medium">Os sistemas ministeriais estão operando em plena saúde.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {logs.map((log) => (
              <div key={log.id} className={cn("p-8 group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all", log.resolved && "opacity-50 grayscale")}>
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex gap-6 items-start">
                       <span className="p-4 bg-whatsapp-light dark:bg-black/40 rounded-3xl shadow-sm border border-black/5 group-hover:scale-110 transition-transform">
                          {getModuleIcon(log.module)}
                       </span>
                       <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 dark:text-gray-400">
                              {log.resolved ? "RESOLVIDO" : "NÃO TRATADO"}
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-whatsapp-teal">MÓDULO: {log.module}</span>
                          </div>
                          <h4 className="font-black text-base dark:text-white mb-2 leading-tight">{log.error_message}</h4>
                          <p className="text-xs text-gray-400 font-medium line-clamp-2 max-w-2xl">{log.stack_trace || "Sem detalhes técnicos adicionais registrados."}</p>
                       </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                       <div className="flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-widest mb-3">
                         <Clock className="w-3.5 h-3.5" /> {moment(log.created_at).fromNow()}
                       </div>
                       {log.user_id && (
                         <div className="flex items-center gap-2 bg-blue-500/5 px-3 py-1.5 rounded-xl border border-blue-500/10 transition-all hover:bg-blue-500/10">
                            <UserCircle className="w-4 h-4 text-blue-500" />
                            <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                               {log.user?.full_name || "Fiel Desconectado"}
                            </span>
                         </div>
                       )}
                    </div>
                 </div>
                 
                 <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-100 dark:border-white/5">
                    <div className="flex gap-4">
                       <button className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-whatsapp-teal transition-colors flex items-center gap-2">
                         Ver Stack Completo <ChevronDown className="w-3 h-3" />
                       </button>
                    </div>
                    <button 
                      onClick={() => markAsResolved(log.id, log.resolved)}
                      className={cn(
                        "text-[9px] px-6 py-3 rounded-2xl font-black uppercase tracking-[0.2em] transition-all",
                        log.resolved ? "bg-gray-100 text-gray-400 dark:bg-white/10" : "bg-whatsapp-green text-whatsapp-dark hover:scale-105 active:scale-95"
                      )}
                    >
                       {log.resolved ? "Reabrir Investigação" : "Marcar como Resolvido"}
                    </button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
