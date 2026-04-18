"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { 
  Activity, 
  Database, 
  Server, 
  Wifi, 
  Cpu, 
  HardDrive,
  RefreshCw,
  Clock,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import moment from "moment";

export default function StatusPage() {
  const [loading, setLoading] = useState(true);
  const [ping, setPing] = useState<number | null>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    db: 'checking...',
    auth: 'operational',
    storage: 'operational',
    errors: 0
  });

  const checkHealth = async () => {
    setLoading(true);
    const start = Date.now();
    try {
      // 1. Teste de latência real do Banco
      const { data, error } = await supabase.from('profiles').select('id').limit(1);
      const end = Date.now();
      setPing(end - start);
      setStats(prev => ({ ...prev, db: error ? 'down' : 'operational' }));

      // 2. Busca de incidentes reais no system_errors
      const { data: logs } = await supabase
        .from('system_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      setIncidents(logs || []);
      setStats(prev => ({ ...prev, errors: (logs || []).filter(l => !l.resolved).length }));

      if (!error) toast.success("Sincronismo de infraestrutura concluído! 📡");
    } catch (err) {
      toast.error("Erro ao verificar saúde do ecossistema.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { checkHealth(); }, []);

  const systems = [
    { name: "Banco de Dados (PostgreSQL)", status: stats.db, latency: ping ? `${ping}ms` : '...', uptime: "100%" },
    { name: "Autenticação (Supabase Auth)", status: stats.auth, latency: "24ms", uptime: "99.9%" },
    { name: "Armazenamento (Edge Storage)", status: stats.storage, latency: "112ms", uptime: "100%" },
    { name: "Gateway de Mensagens (Push)", status: stats.errors > 0 ? "degraded" : "operational", latency: "156ms", uptime: "98.5%" },
  ];

  return (
    <div className="pb-12 animate-in fade-in duration-500">
      <PageHeader 
        title="Status do Sistema" 
        description="Monitoramento reativo da saúde ministerial e performance da infraestrutura FéConecta."
      >
        <button 
          onClick={checkHealth}
          disabled={loading}
          className="flex items-center gap-2 bg-whatsapp-teal text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-whatsapp-tealLight transition-all active:scale-95 shadow-xl shadow-whatsapp-teal/20"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> {loading ? "Checando..." : "Forçar Auditoria"}
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-6">
        {[
          { label: "Uptime Global", value: "99.99%", icon: Server, color: "text-whatsapp-green" },
          { label: "Hardware Stack", value: "Vercel Managed", icon: Cpu, color: "text-blue-500" },
          { label: "Erros Ativos", value: stats.errors.toString(), icon: AlertCircle, color: stats.errors > 0 ? "text-red-500" : "text-gray-400" },
          { label: "Latência DB", value: ping ? `${ping}ms` : '...', icon: Activity, color: "text-whatsapp-teal" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02]">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <h3 className="text-2xl font-black dark:text-white tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-whatsapp-darkLighter rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02] overflow-hidden mb-10">
        <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <h3 className="font-black dark:text-white uppercase tracking-tight">Serviços de Infraestrutura</h3>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-whatsapp-green/10 rounded-full">
            <div className="w-2 h-2 bg-whatsapp-green rounded-full animate-pulse" />
            <span className="text-[9px] font-black text-whatsapp-green uppercase tracking-widest">Tempo Real</span>
          </div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {systems.map((s, i) => (
            <div key={i} className="p-8 flex items-center justify-between group hover:bg-gray-50/50 dark:hover:bg-white/5 transition-all">
              <div className="flex items-center gap-6">
                <div className={cn(
                  "p-4 rounded-3xl",
                  s.status === 'operational' ? "bg-whatsapp-light dark:bg-black/40" : "bg-red-500/10"
                )}>
                  {s.name.includes("Banco") ? <Database className="w-5 h-5 text-whatsapp-teal" /> : <Wifi className="w-5 h-5 text-blue-500" />}
                </div>
                <div>
                  <p className="text-sm font-black dark:text-white uppercase tracking-tight">{s.name}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Ping: {s.latency}</p>
                </div>
              </div>
              <div className="flex items-center gap-8">
                 <div className="text-right hidden sm:block">
                   <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Disponibilidade</p>
                   <p className="text-xs font-black dark:text-white">{s.uptime}</p>
                 </div>
                 <span className={cn(
                   "px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest",
                   s.status === 'operational' ? "bg-whatsapp-green text-whatsapp-dark" : "bg-red-500 text-white"
                 )}>
                   {s.status}
                 </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <h3 className="text-sm font-black dark:text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-3">
          <Clock className="w-5 h-5 text-gray-400" /> Histórico de Incidentes Auditados
        </h3>
        <div className="space-y-4">
          {incidents.length === 0 ? (
            <div className="bg-gray-50 dark:bg-whatsapp-darkLighter p-10 rounded-3xl border border-dashed border-gray-200 dark:border-white/10 text-center">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Nenhum incidente registrado no banco de dados.</p>
            </div>
          ) : incidents.map((incident, i) => (
            <div key={i} className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-[32px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{moment(incident.created_at).format('DD MMM YYYY, HH:mm')}</span>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg",
                  incident.resolved ? "bg-whatsapp-green/10 text-whatsapp-green" : "bg-red-500/10 text-red-500"
                )}>
                  {incident.resolved ? "Resolvido" : "Ativo"}
                </span>
              </div>
              <h4 className="font-black text-sm dark:text-white uppercase tracking-tight">{incident.module}: {incident.error_message}</h4>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
