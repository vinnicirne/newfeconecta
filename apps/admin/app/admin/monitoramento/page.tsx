"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { supabase } from "@/lib/supabase";
import { AlertTriangle, CheckCircle, Clock, Search, RefreshCw, Smartphone, Image as ImageIcon, Mic, Film, Code, Database, UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import moment from "moment";
import "moment/locale/pt-br";

moment.locale('pt-br');

export default function ErrorMonitoringPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState<string>("all");

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase.from('system_errors').select('*, user:user_id(id, raw_user_meta_data)').order('created_at', { ascending: false }).limit(50);
    
    if (filterModule !== "all") {
      query = query.eq('module', filterModule);
    }

    const { data, error } = await query;
    if (data) setLogs(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();

    // Setup realtime subscription
    const subscription = supabase.channel('error_monitoring')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'system_errors' }, (payload) => {
        if (filterModule === "all" || payload.new.module === filterModule) {
          setLogs(prev => [payload.new, ...prev].slice(0, 50));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [filterModule]);

  const markAsResolved = async (id: string, currentlyResolved: boolean) => {
    const { error } = await supabase.from('system_errors').update({ resolved: !currentlyResolved }).eq('id', id);
    if (!error) {
      setLogs(logs.map(log => log.id === id ? { ...log, resolved: !currentlyResolved } : log));
    }
  };

  const getModuleIcon = (moduleName: string) => {
    switch(moduleName) {
      case 'camera': return <Smartphone className="w-4 h-4 text-purple-500" />;
      case 'gallery': return <ImageIcon className="w-4 h-4 text-blue-500" />;
      case 'audio': return <Mic className="w-4 h-4 text-orange-500" />;
      case 'story': return <Film className="w-4 h-4 text-pink-500" />;
      case 'database': return <Database className="w-4 h-4 text-whatsapp-teal" />;
      case 'auth': return <UserCircle className="w-4 h-4 text-gray-500" />;
      default: return <Code className="w-4 h-4 text-red-500" />;
    }
  };

  return (
    <div className="pb-12">
      <PageHeader 
        title="Monitoramento de Falhas (Live)" 
        description="Acompanhe erros do sistema, câmera, de mídia e interações em tempo real."
      >
        <button onClick={fetchLogs} className="flex items-center gap-2 bg-whatsapp-teal text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-whatsapp-tealLight transition-all">
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> {loading ? "Buscando..." : "Atualizar"}
        </button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Erros Hoje", value: logs.filter(l => moment(l.created_at).isSame(moment(), 'day')).length, color: "text-red-500" },
          { label: "Bugs em Câmera/Mídia", value: logs.filter(l => ['camera','gallery','audio'].includes(l.module)).length, color: "text-purple-500" },
          { label: "Erros de Sistema (PWA)", value: logs.filter(l => l.module === 'system').length, color: "text-orange-500" },
          { label: "Resolvidos Recentes", value: logs.filter(l => l.resolved).length, color: "text-whatsapp-green" }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-whatsapp-darkLighter p-4 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">{stat.label}</p>
            <p className={cn("text-2xl font-bold mt-1", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-whatsapp-darkLighter rounded-2xl shadow border border-gray-100 dark:border-white/5 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-white/5 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
             {["all", "system", "camera", "gallery", "audio", "story", "database", "auth"].map(mod => (
               <button 
                 key={mod}
                 onClick={() => setFilterModule(mod)}
                 className={cn(
                   "px-3 py-1 rounded-full text-xs font-bold uppercase cursor-pointer transition-colors border",
                   filterModule === mod 
                     ? "bg-whatsapp-teal/10 border-whatsapp-teal text-whatsapp-teal" 
                     : "bg-transparent border-gray-200 dark:border-white/10 text-gray-500"
                 )}
               >
                 {mod}
               </button>
             ))}
          </div>
        </div>
        
        {loading && logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
             <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin opacity-50" />
             <p>Carregando logs do sistema...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
             <CheckCircle className="w-12 h-12 mx-auto mb-4 text-whatsapp-green opacity-50" />
             <p className="font-bold">Nenhum erro encontrado.</p>
             <p className="text-sm">Os sistemas estão operando surpreendentemente bem.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {logs.map((log) => (
              <div key={log.id} className={cn("p-4 flex flex-col hover:bg-gray-50 dark:hover:bg-white/5 transition-colors", log.resolved && "opacity-60")}>
                 <div className="flex items-center justify-between">
                    <div className="flex gap-3 items-center">
                       <span className="p-2 bg-gray-50 dark:bg-black/50 rounded-lg shadow-sm border border-black/5">
                          {getModuleIcon(log.module)}
                       </span>
                       <div>
                         <span className="text-xs font-bold uppercase flex items-center gap-1.5 dark:text-gray-300">
                           {log.resolved ? <CheckCircle className="w-3 h-3 text-whatsapp-green" /> : <AlertTriangle className="w-3 h-3 text-red-500" />}
                           [{log.module}] 
                         </span>
                         <h4 className="font-bold text-sm dark:text-white line-clamp-1">{log.error_message}</h4>
                       </div>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-xs text-gray-400 font-medium flex items-center gap-1"><Clock className="w-3 h-3"/> {moment(log.created_at).fromNow()}</span>
                       {log.user_id && (
                         <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded mt-1 truncate max-w-[120px]">
                           User: {log.user?.raw_user_meta_data?.name || log.user_id.split('-')[0]}
                         </span>
                       )}
                    </div>
                 </div>
                 
                 {log.stack_trace && !log.resolved && (
                   <div className="mt-3 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-3 rounded-lg overflow-x-auto">
                      <pre className="text-[10px] text-red-600 dark:text-red-300 font-mono">
                        {log.stack_trace.substring(0, 300)}...
                      </pre>
                   </div>
                 )}

                 <div className="mt-4 flex items-center justify-between">
                    <div className="flex gap-2 text-xs">
                       {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <span className="text-gray-400 font-mono">
                             Meta: {JSON.stringify(log.metadata)}
                          </span>
                       )}
                    </div>
                    <button 
                      onClick={() => markAsResolved(log.id, log.resolved)}
                      className={cn(
                        "text-xs px-3 py-1 rounded font-bold cursor-pointer transition-colors",
                        log.resolved ? "bg-gray-100 text-gray-500 dark:bg-white/10" : "bg-whatsapp-green/10 text-whatsapp-green hover:bg-whatsapp-green/20"
                      )}
                    >
                       {log.resolved ? "Reabrir Erro" : "Marcar Resolvido"}
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
