"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import { 
  Activity, 
  Database, 
  Server, 
  Wifi, 
  Cpu, 
  HardDrive,
  RefreshCw,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function StatusPage() {
  const systems = [
    { name: "Banco de Dados (PostgreSQL)", status: "operational", latency: "12ms", uptime: "100%" },
    { name: "Autenticação (Auth Service)", status: "operational", latency: "24ms", uptime: "99.9%" },
    { name: "Armazenamento (Storage)", status: "operational", latency: "8ms", uptime: "100%" },
    { name: "Push Notifications", status: "degraded", latency: "450ms", uptime: "98.5%" },
    { name: "Algoritmo de Feed", status: "operational", latency: "156ms", uptime: "99.99%" },
  ];

  return (
    <div className="pb-12">
      <PageHeader 
        title="Status do Sistema" 
        description="Monitore a saúde e performance dos serviços FéConecta em tempo real."
      >
        <button className="flex items-center gap-2 bg-whatsapp-teal text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-whatsapp-tealLight transition-all">
          <RefreshCw className="w-4 h-4" /> Atualizar Agora
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Uptime Global", value: "99.98%", icon: Server, color: "text-whatsapp-green" },
          { label: "Uso de CPU", value: "24%", icon: Cpu, color: "text-blue-500" },
          { label: "Memória", value: "4.2GB / 16GB", icon: HardDrive, color: "text-purple-500" },
          { label: "Latência Média", value: "32ms", icon: Activity, color: "text-whatsapp-teal" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow">
            <stat.icon className={cn("w-6 h-6 mb-3", stat.color)} />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <h3 className="text-xl font-bold dark:text-white mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Services List */}
      <div className="bg-white dark:bg-whatsapp-darkLighter rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
          <h3 className="font-bold dark:text-white">Serviços Individuais</h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-whatsapp-green rounded-full animate-pulse" />
            <span className="text-[10px] font-bold text-whatsapp-green uppercase">Live Data</span>
          </div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-white/5">
          {systems.map((s, i) => (
            <div key={i} className="p-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "p-2 rounded-lg",
                  s.status === 'operational' ? "bg-whatsapp-green/10" : "bg-orange-500/10"
                )}>
                  {s.name.includes("Dados") ? <Database className="w-4 h-4 text-whatsapp-green" /> : <Wifi className="w-4 h-4 text-blue-400" />}
                </div>
                <div>
                  <p className="text-sm font-bold dark:text-white">{s.name}</p>
                  <p className="text-[10px] text-gray-500 font-medium">Latência: {s.latency}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                 <div className="text-right hidden sm:block">
                   <p className="text-[10px] text-gray-500 font-bold uppercase">Uptime</p>
                   <p className="text-xs font-bold dark:text-white">{s.uptime}</p>
                 </div>
                 <span className={cn(
                   "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                   s.status === 'operational' ? "bg-whatsapp-green/10 text-whatsapp-green" : "bg-orange-100 text-orange-600"
                 )}>
                   {s.status}
                 </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Past Incidents */}
      <div className="mt-8">
        <h3 className="text-lg font-bold dark:text-white mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-400" /> Histórico de Incidentes
        </h3>
        <div className="space-y-4">
          {[
            { date: "08 Abr 2026", title: "Instabilidade no Serviço de Push", description: "O serviço de notificações apresentou picos de latência entre as 14h e 16h.", status: "resolved" },
            { date: "02 Abr 2026", title: "Manutenção Programada do Banco", description: "Upgrade de versão do PostgreSQL concluído sem downtime.", status: "resolved" },
          ].map((incident, i) => (
            <div key={i} className="bg-gray-50 dark:bg-whatsapp-darkLighter p-6 rounded-2xl border border-gray-200 dark:border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase">{incident.date}</span>
                <span className="text-[10px] font-bold text-whatsapp-green uppercase">{incident.status}</span>
              </div>
              <h4 className="font-bold text-sm dark:text-white">{incident.title}</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{incident.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
