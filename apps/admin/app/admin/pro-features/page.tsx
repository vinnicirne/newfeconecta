"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import { 
  Target, 
  Crown, 
  Star, 
  Settings2, 
  Users, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProFeaturesPage() {
  const features = [
    { title: "Vídeo Chamadas", status: "active", users: "1.2k", tier: "Gold" },
    { title: "Grupos Ilimitados", status: "active", users: "850", tier: "Silver" },
    { title: "Badge de Adorador Verificado", status: "active", users: "3.4k", tier: "Free/Pro" },
    { title: "Personalização de Perfil", status: "checking", users: "0", tier: "Gold" },
  ];

  return (
    <div className="pb-12">
      <PageHeader 
        title="Recursos PRO & Assinaturas" 
        description="Gerencie os benefícios exclusivos dos membros assinantes FéConecta."
      />

      <div className="bg-gradient-to-r from-whatsapp-teal to-whatsapp-tealLight p-8 rounded-3xl text-white mb-10 whatsapp-shadow relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
           <div className="p-6 bg-white/10 rounded-2xl border border-white/20">
              <Crown className="w-12 h-12 text-whatsapp-green" />
           </div>
           <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl font-bold mb-2">Configure os Planos de Assinatura</h3>
              <p className="text-white/70 max-w-lg">Defina preços, durações e quais recursos estarão disponíveis para cada nível de membro PRO.</p>
           </div>
           <button className="px-8 py-4 bg-whatsapp-green text-whatsapp-dark font-bold rounded-2xl hover:scale-105 transition-all flex items-center gap-2">
             Gerenciar Planos <ArrowRight className="w-4 h-4" />
           </button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Features Table-ish */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow">
              <div className="flex items-center justify-between mb-8">
                 <h4 className="font-bold dark:text-white flex items-center gap-2">
                   <Target className="w-5 h-5 text-whatsapp-green" /> Recursos Disponíveis
                 </h4>
                 <span className="text-[10px] uppercase font-bold text-gray-400">Total: {features.length}</span>
              </div>

              <div className="space-y-4">
                 {features.map((f, i) => (
                   <div key={i} className="flex items-center justify-between p-4 bg-whatsapp-light dark:bg-whatsapp-dark rounded-2xl border border-gray-100 dark:border-white/5">
                      <div className="flex items-center gap-4">
                         <div className="w-2 h-2 rounded-full bg-whatsapp-green" />
                         <div>
                            <p className="text-sm font-bold dark:text-white">{f.title}</p>
                            <p className="text-[10px] text-gray-500 font-medium">Nível: {f.tier}</p>
                         </div>
                      </div>
                      <div className="flex items-center gap-6">
                         <div className="text-right">
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Utilização</p>
                            <p className="text-xs font-bold dark:text-white">{f.users} usuários</p>
                         </div>
                         <button className="p-2 bg-white dark:bg-white/5 rounded-lg hover:border-whatsapp-green border border-transparent transition-all">
                            <Settings2 className="w-4 h-4 text-gray-400" />
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* PRO Sidebar Stats */}
        <div className="space-y-6">
           <div className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow">
              <h4 className="font-bold dark:text-white mb-6">Membros PRO</h4>
              <div className="flex items-center gap-4 mb-8">
                 <div className="flex -space-x-3">
                    {[1,2,3,4].map(i => <div key={i} className="w-10 h-10 rounded-full border-2 border-white dark:border-whatsapp-darkLighter bg-gray-200" />)}
                 </div>
                 <div className="text-xs font-medium text-gray-500">
                    <span className="text-whatsapp-green font-bold">+120</span> este mês
                 </div>
              </div>
              <div className="space-y-4">
                 {[
                   { label: "Membros Ativos", value: "3.2k", icon: Users },
                   { label: "Taxa de Conversão", value: "4.8%", icon: Sparkles },
                   { label: "Receita/PRO Mensal", value: "R$ 12k", icon: Star },
                 ].map((s, i) => (
                   <div key={i} className="flex items-center justify-between">
                     <div className="flex items-center gap-2 text-gray-500">
                        <s.icon className="w-4 h-4" />
                        <span className="text-xs font-medium">{s.label}</span>
                     </div>
                     <span className="text-sm font-bold dark:text-white">{s.value}</span>
                   </div>
                 ))}
              </div>
           </div>

           <div className="bg-whatsapp-green p-6 rounded-2xl whatsapp-shadow">
              <h5 className="font-bold text-whatsapp-dark mb-2 text-sm">Automação de Renovação</h5>
              <p className="text-whatsapp-dark/70 text-xs mb-4">O sistema gerencia automaticamente cancelamentos e retentativas de pagamento.</p>
              <div className="flex items-center gap-2 text-whatsapp-dark font-bold text-xs uppercase cursor-pointer hover:underline">
                Configurar Gateway <ArrowRight className="w-3 h-3" />
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
