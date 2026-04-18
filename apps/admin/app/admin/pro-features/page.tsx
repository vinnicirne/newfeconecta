"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { 
  Target, 
  Crown, 
  Star, 
  Settings2, 
  Users, 
  Sparkles,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function ProFeaturesPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPro: 0,
    revenue: 0,
    conversion: 0,
    recentPros: [] as any[]
  });

  const fetchProData = async () => {
    setLoading(true);
    try {
      const [allUsers, verifiedUsers] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('full_name, avatar_url, role').eq('is_verified', true)
      ]);

      const total = allUsers.count || 0;
      const verified = verifiedUsers.data || [];
      const estimatedRev = verified.length * 9.99;

      setStats({
        totalPro: verified.length,
        revenue: estimatedRev,
        conversion: total > 0 ? (verified.length / total) * 100 : 0,
        recentPros: verified.slice(0, 4)
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProData(); }, []);

  const features = [
    { title: "Vídeo Chamadas", status: "Ativo", users: stats.totalPro, tier: "Gold" },
    { title: "Grupos Ilimitados", status: "Ativo", users: stats.totalPro, tier: "Silver/Gold" },
    { title: "Badge de Adorador", status: "Ativo", users: stats.totalPro, tier: "Todos Pro" },
    { title: "I.A. de Estudo Bíblico", status: "Beta", users: "Em Teste", tier: "Gold" },
  ];

  return (
    <div className="pb-12 animate-in fade-in duration-500">
      <PageHeader 
        title="Recursos PRO & Assinaturas" 
        description="Gestão de privilégios e métricas de conversão dos membros assinantes."
      />

      <div className="bg-gradient-to-r from-whatsapp-teal to-whatsapp-tealLight p-10 rounded-[40px] text-white mb-10 shadow-2xl shadow-whatsapp-teal/20 relative overflow-hidden group">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
           <div className="p-6 bg-white/10 rounded-3xl border border-white/20 backdrop-blur-sm group-hover:scale-110 transition-transform">
              <Crown className="w-14 h-14 text-whatsapp-green" />
           </div>
           <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Gestão de Níveis PRO</h3>
              <p className="text-white/70 max-w-lg font-medium">Controle os benefícios e a precificação de cada nível de membro verificado.</p>
           </div>
           <Link href="/admin/pricing">
             <button className="px-10 py-5 bg-whatsapp-green text-whatsapp-dark font-black rounded-3xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-xl shadow-black/10 text-xs uppercase tracking-widest">
                Configurar Preços <ArrowRight className="w-4 h-4" />
             </button>
           </Link>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Features Table-ish */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white dark:bg-whatsapp-darkLighter p-10 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02]">
              <div className="flex items-center justify-between mb-10">
                 <h4 className="font-black dark:text-white flex items-center gap-3 uppercase tracking-tight">
                   <Target className="w-6 h-6 text-whatsapp-teal" /> Recursos Ativos
                 </h4>
                 <button onClick={fetchProData} className="p-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-2xl transition-all">
                    <RefreshCw className={cn("w-4 h-4 text-gray-400", loading && "animate-spin text-whatsapp-teal")} />
                 </button>
              </div>

              <div className="space-y-4">
                 {features.map((f, i) => (
                   <div key={i} className="flex items-center justify-between p-6 bg-whatsapp-light dark:bg-whatsapp-dark border border-gray-100 dark:border-white/5 rounded-[32px] hover:border-whatsapp-teal/30 transition-all group">
                      <div className="flex items-center gap-5">
                         <div className={cn(
                           "w-3 h-3 rounded-full animate-pulse",
                           f.status === "Ativo" ? "bg-whatsapp-green" : "bg-orange-400"
                         )} />
                         <div>
                            <p className="text-sm font-black dark:text-white leading-tight mb-1">{f.title}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Camada: {f.tier}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-8">
                         <div className="text-right">
                            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Utilização Real</p>
                            <p className="text-sm font-black dark:text-white">{f.users} perfis</p>
                         </div>
                         <button className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-transparent group-hover:border-whatsapp-teal/20 transition-all">
                            <Settings2 className="w-5 h-5 text-gray-400 group-hover:text-whatsapp-teal" />
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* PRO Sidebar Stats */}
        <div className="space-y-6">
           <div className="bg-white dark:bg-whatsapp-darkLighter p-10 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02]">
              <h4 className="font-black dark:text-white mb-8 uppercase tracking-tight text-sm">Comunidade Premium</h4>
              <div className="flex items-center gap-4 mb-10">
                 <div className="flex -space-x-4">
                    {loading ? (
                      [1,2,3,4].map(i => <div key={i} className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 animate-pulse border-4 border-white dark:border-whatsapp-darkLighter" />)
                    ) : (
                      stats.recentPros.map((p, i) => (
                        <div key={i} className="w-12 h-12 rounded-2xl border-4 border-white dark:border-whatsapp-darkLighter bg-whatsapp-teal overflow-hidden shadow-lg">
                           {p.avatar_url ? (
                             <img src={p.avatar_url} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex items-center justify-center text-xs font-black text-white">
                                {p.full_name?.charAt(0)}
                             </div>
                           )}
                        </div>
                      ))
                    )}
                 </div>
                 <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <span className="text-whatsapp-teal">{stats.totalPro}</span> Ativos
                 </div>
              </div>
              <div className="space-y-6">
                 {[
                   { label: "Membros Verificados", value: stats.totalPro.toString(), icon: Users },
                   { label: "Taxa de Conversão", value: `${stats.conversion.toFixed(1)}%`, icon: Sparkles },
                   { label: "Média Mensal", value: `R$ ${stats.revenue.toLocaleString()}`, icon: Star },
                 ].map((s, i) => (
                   <div key={i} className="flex items-center justify-between">
                     <div className="flex items-center gap-3 text-gray-500">
                        <s.icon className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
                     </div>
                     <span className="text-sm font-black dark:text-white">{loading ? "..." : s.value}</span>
                   </div>
                 ))}
              </div>
           </div>

           <div className="bg-whatsapp-green p-8 rounded-[40px] shadow-xl shadow-whatsapp-green/20 relative overflow-hidden group border border-white/20">
              <h5 className="font-black text-whatsapp-dark mb-2 text-sm uppercase tracking-tight relative z-10 font-[Outfit]">Automação Global</h5>
              <p className="text-whatsapp-dark/70 text-xs mb-6 font-medium relative z-10 leading-relaxed">Sincronização atômica de selos e permissões premium via Supabase.</p>
              <Link href="/admin/status">
                <div className="flex items-center gap-2 text-whatsapp-dark font-black text-[10px] uppercase tracking-[0.2em] cursor-pointer hover:underline relative z-10 group-hover:gap-4 transition-all">
                  Status do Núcleo <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
           </div>
        </div>
      </div>
    </div>
  );
}
