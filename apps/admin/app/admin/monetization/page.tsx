"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  Users, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight 
} from "lucide-react";
import { StatsCard } from "@/components/cards/stats-card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

const revenueData = [
  { name: "Jan", revenue: 4000 },
  { name: "Fev", revenue: 3000 },
  { name: "Mar", revenue: 2000 },
  { name: "Abr", revenue: 2780 },
];

export default function MonetizationPage() {
  return (
    <div className="pb-12">
      <PageHeader 
        title="Pagamentos e Monetização" 
        description="Acompanhe a receita, gerencie assinaturas e controle transações."
      >
        <button className="flex items-center gap-2 bg-whatsapp-teal text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-whatsapp-tealLight transition-all">
          <Download className="w-4 h-4" /> Exportar Relatório
        </button>
      </PageHeader>

      {/* Financial Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard 
          title="Receita Total" 
          value="R$ 45.200" 
          change="+8%" 
          trend="up" 
          icon={DollarSign} 
          color="bg-whatsapp-green" 
        />
        <StatsCard 
          title="Assinaturas Ativas" 
          value="1.240" 
          change="+15%" 
          trend="up" 
          icon={Users} 
          color="bg-whatsapp-teal" 
        />
        <StatsCard 
          title="Ticket Médio" 
          value="R$ 36,45" 
          change="-2%" 
          trend="down" 
          icon={CreditCard} 
          color="bg-whatsapp-blue" 
        />
        <StatsCard 
          title="Churn Rate" 
          value="2.4%" 
          change="-0.5%" 
          trend="up" 
          icon={TrendingUp} 
          color="bg-purple-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-whatsapp-darkLighter p-8 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow">
          <h3 className="text-lg font-bold dark:text-white mb-6">Fluxo de Caixa</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ 
                    backgroundColor: '#111B21', 
                    border: 'none', 
                    borderRadius: '12px', 
                    color: '#fff' 
                  }} 
                />
                <Bar dataKey="revenue" fill="#128C7E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow">
          <h3 className="font-bold dark:text-white mb-6">Transações Recentes</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-whatsapp-green/10 flex items-center justify-center text-whatsapp-green">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold dark:text-white">Assinatura PRO</p>
                    <p className="text-[10px] text-gray-400">Há 10 minutos</p>
                  </div>
                </div>
                <p className="text-xs font-bold text-whatsapp-green">+ R$ 29,90</p>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2 text-xs font-bold text-whatsapp-teal dark:text-whatsapp-green hover:underline">
            Ver todas as transações
          </button>
        </div>
      </div>
    </div>
  );
}
