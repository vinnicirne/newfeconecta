"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Activity, 
  ArrowLeft, 
  BarChart, 
  Eye, 
  RefreshCw, 
  Users,
  Clock,
  Target,
  CheckCheck,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CampaignStat {
  campaign_id: string;
  title: string;
  audience_type: string;
  sent_count: number;
  opened_count: number;
  created_at: string;
  ctr: number;
}

export default function PushMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<CampaignStat[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Pega notificações dos últimos 30 dias com prioridade 'high' (push)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('id, title, metadata, created_at, is_read, opened_at')
        .eq('priority', 'high')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (notifications) {
        // Agrupar por campaign_id ou por (title + day) para retrocompatibilidade
        const groups: Record<string, CampaignStat> = {};

        notifications.forEach((n) => {
          const cid = n.metadata?.campaign_id || `${n.title}-${n.created_at.split('T')[0]}`;
          
          if (!groups[cid]) {
            groups[cid] = {
              campaign_id: cid,
              title: n.title || 'Sem título',
              audience_type: n.metadata?.audience_type || 'broadcast (legado)',
              sent_count: 0,
              opened_count: 0,
              created_at: n.created_at,
              ctr: 0
            };
          }

          groups[cid].sent_count++;
          if (n.is_read || n.opened_at) {
            groups[cid].opened_count++;
          }
        });

        const statsList = Object.values(groups).map(g => ({
          ...g,
          ctr: Math.round((g.opened_count / g.sent_count) * 100)
        })).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        setCampaigns(statsList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-whatsapp-dark text-gray-900 dark:text-white p-4 lg:p-8">
      <div className="max-w-6xl mx-auto animate-in fade-in duration-700">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 text-whatsapp-teal mb-2">
              <Activity className="w-5 h-5 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Centro de Inteligência</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight">Monitoramento de Push</h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={fetchStats}
              disabled={loading}
              className="px-4 py-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl flex items-center gap-2 text-xs font-bold hover:bg-gray-50 transition-all active:scale-95"
            >
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
              Atualizar Dados
            </button>
            <Link 
              href="/admin/push"
              className="px-6 py-3 bg-whatsapp-teal text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-sm flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Transmissor
            </Link>
          </div>
        </div>

        {/* Estatísticas Globais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-xl shadow-black/5">
            <div className="flex items-center gap-3 mb-2 text-blue-500">
              <div className="p-2 bg-blue-500/10 rounded-xl"><Target className="w-5 h-5" /></div>
              <h3 className="text-sm font-bold uppercase tracking-widest">Campanhas (30d)</h3>
            </div>
            <p className="text-4xl font-black">{campaigns.length}</p>
          </div>
          <div className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-xl shadow-black/5">
            <div className="flex items-center gap-3 mb-2 text-amber-500">
              <div className="p-2 bg-amber-500/10 rounded-xl"><Users className="w-5 h-5" /></div>
              <h3 className="text-sm font-bold uppercase tracking-widest">Pushes Enviados</h3>
            </div>
            <p className="text-4xl font-black">{campaigns.reduce((acc, curr) => acc + curr.sent_count, 0).toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-xl shadow-black/5">
            <div className="flex items-center gap-3 mb-2 text-whatsapp-green">
              <div className="p-2 bg-whatsapp-green/10 rounded-xl"><Eye className="w-5 h-5" /></div>
              <h3 className="text-sm font-bold uppercase tracking-widest">Total de Aberturas</h3>
            </div>
            <p className="text-4xl font-black">{campaigns.reduce((acc, curr) => acc + curr.opened_count, 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Tabela de Campanhas */}
        <div className="bg-white dark:bg-whatsapp-darkLighter rounded-[40px] border border-gray-100 dark:border-white/5 shadow-2xl shadow-black/5 overflow-hidden">
          <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
            <h3 className="font-bold dark:text-white flex items-center gap-2">
              <BarChart className="w-5 h-5 text-whatsapp-teal" /> Histórico de Disparos
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-white/5">
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Data/Hora</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Título</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Público Alvo</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Enviados (FCM)</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Aberturas</th>
                  <th className="p-6 text-[10px] font-black uppercase tracking-widest text-gray-400">CTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {loading && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">Buscando métricas no satélite...</td>
                  </tr>
                )}
                {!loading && campaigns.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">Nenhum disparo registrado nos últimos 30 dias.</td>
                  </tr>
                )}
                {!loading && campaigns.map((c) => (
                  <tr key={c.campaign_id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="p-6 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{new Date(c.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </td>
                    <td className="p-6 font-bold text-sm max-w-[200px] truncate" title={c.title}>
                      {c.title}
                    </td>
                    <td className="p-6">
                      <span className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest",
                        c.audience_type === 'all' || c.audience_type === 'broadcast (legado)' ? "bg-blue-500/10 text-blue-500" : 
                        c.audience_type === 'roles' ? "bg-amber-500/10 text-amber-500" : 
                        "bg-purple-500/10 text-purple-500"
                      )}>
                        {c.audience_type === 'all' ? 'Toda a Rede' : c.audience_type === 'roles' ? 'Grupos' : c.audience_type === 'individuals' ? 'Direcionado' : c.audience_type}
                      </span>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-widest">
                        {c.opened_count > 0 ? (
                           <span className="flex items-center gap-1 text-whatsapp-green"><CheckCheck className="w-4 h-4" /> Entregue/Lido</span>
                        ) : (
                           <span className="flex items-center gap-1 text-gray-400"><CheckCircle2 className="w-4 h-4" /> Emitido</span>
                        )}
                      </div>
                    </td>
                    <td className="p-6 text-sm font-semibold">{c.sent_count.toLocaleString()}</td>
                    <td className="p-6 text-sm font-semibold text-whatsapp-green">{c.opened_count.toLocaleString()}</td>
                    <td className="p-6">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-black",
                          c.ctr > 20 ? "text-whatsapp-green" : c.ctr > 5 ? "text-amber-500" : "text-red-500"
                        )}>{c.ctr}%</span>
                        <div className="w-16 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all", c.ctr > 20 ? "bg-whatsapp-green" : c.ctr > 5 ? "bg-amber-500" : "bg-red-500")}
                            style={{ width: `${Math.min(c.ctr, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
