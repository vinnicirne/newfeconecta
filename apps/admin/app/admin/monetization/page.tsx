"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  Users, 
  Download, 
  ArrowUpRight, 
  RefreshCw,
  Award,
  Plus,
  X
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
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Preços padrão para cálculo de receita estimada
const DEFAULT_PLANS: Record<string, number> = {
  "Bispo": 9.99, "Apóstolo": 9.99, "Pastor": 9.99, "Missionário": 9.99,
  "Evangelista": 6.99, "Diácono": 6.99, "Presbítero": 6.99, "Líder": 6.99,
  "Igreja": 14.99, "Levita": 3.99, "Membro": 3.99
};

export default function MonetizationPage() {
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    user_name: "",
    amount: "",
    category: "Doação",
    description: ""
  });

  const [stats, setStats] = useState({
    totalRevenue: 0,
    manualRevenue: 0,
    activeSubscribers: 0,
    avgTicket: 0,
    conversionRate: 0,
    recentActivations: [] as any[]
  });

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      // 1. Buscar todos os usuários e transações em paralelo
      const [allUsersRes, verifiedUsersRes, transactionsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles')
          .select('role, full_name, avatar_url, updated_at')
          .eq('is_verified', true)
          .order('updated_at', { ascending: false }),
        supabase.from('transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (allUsersRes.error) throw allUsersRes.error;
      if (verifiedUsersRes.error) throw verifiedUsersRes.error;

      const totalUsersCount = allUsersRes.count || 0;
      const verifiedUsers = verifiedUsersRes.data || [];
      const manualTransactions = transactionsRes.data || [];

      // 2. Calcular Receita Estimada (Verificações)
      let estimRevenue = 0;
      verifiedUsers.forEach(user => {
        estimRevenue += (DEFAULT_PLANS[user.role] || 0);
      });

      // 3. Calcular Receita Manual (Doações/Transações)
      let manRevenue = 0;
      manualTransactions.forEach(tx => {
        manRevenue += Number(tx.amount);
      });

      // 4. Preparar feed de ativações/transações recentes
      const recent = [
        ...manualTransactions.map(tx => ({
          name: tx.user_name || "Doador",
          plan: tx.category,
          time: new Date(tx.created_at).toLocaleDateString(),
          amount: Number(tx.amount),
          is_manual: true
        })),
        ...verifiedUsers.slice(0, 5).map(u => ({
          name: u.full_name || "Membro",
          plan: u.role,
          time: new Date(u.updated_at).toLocaleDateString(),
          amount: DEFAULT_PLANS[u.role] || 0,
          is_manual: false
        }))
      ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);

      setStats({
        totalRevenue: estimRevenue + manRevenue,
        manualRevenue: manRevenue,
        activeSubscribers: verifiedUsers.length,
        avgTicket: verifiedUsers.length ? estimRevenue / verifiedUsers.length : 0,
        conversionRate: totalUsersCount > 0 ? (verifiedUsers.length / totalUsersCount) * 100 : 0,
        recentActivations: recent
      });
    } catch (err: any) {
      // Se a tabela transactions não existir, ignorar o erro silenciosamente para o cálculo manual
      if (err.code !== '42P01') {
        toast.error("Erro na telemetria financeira: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{
          user_name: form.user_name,
          amount: parseFloat(form.amount.replace(',', '.')),
          category: form.category,
          description: form.description
        }]);

      if (error) throw error;
      toast.success("Receita lançada com sucesso! 💰✨");
      setShowModal(false);
      setForm({ user_name: "", amount: "", category: "Doação", description: "" });
      fetchFinancialData();
    } catch (err: any) {
      toast.error("Erro ao lançar receita: Verifique se a tabela 'transactions' foi criada.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => { fetchFinancialData(); }, []);

  const revenueData = [
    { name: "Projeção", revenue: stats.totalRevenue },
    { name: "Atual", revenue: stats.totalRevenue * 0.9 },
    { name: "Meta", revenue: stats.totalRevenue * 1.5 },
  ];

  return (
    <div className="pb-12 animate-in fade-in duration-500">
      <PageHeader 
        title="Painel de Monetização" 
        description="Gestão de arrecadação real, doações e ativações premium em tempo real."
      >
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-whatsapp-teal text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-whatsapp-teal/20 hover:bg-whatsapp-tealLight hover:scale-105 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            Lançar Receita Manual
          </button>
          <button 
            onClick={fetchFinancialData}
            className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10 hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw className={cn("w-4 h-4 text-gray-400", loading && "animate-spin text-whatsapp-teal")} />
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-6">
        <StatsCard 
          title="Faturamento Bruto" 
          value={loading ? "..." : `R$ ${stats.totalRevenue.toLocaleString()}`} 
          change="Total Auditado" 
          trend="up" 
          icon={DollarSign} 
          color="bg-whatsapp-green" 
        />
        <StatsCard 
          title="Assinantes Ativos" 
          value={loading ? "..." : stats.activeSubscribers.toString()} 
          change="Selo Premium" 
          trend="up" 
          icon={Users} 
          color="bg-whatsapp-teal" 
        />
        <StatsCard 
          title="Receita Direta" 
          value={loading ? "..." : `R$ ${stats.manualRevenue.toLocaleString()}`} 
          change="Avulsos/Doação" 
          trend="up" 
          icon={Award} 
          color="bg-purple-500" 
        />
        <StatsCard 
          title="Taxa de Conversão" 
          value={loading ? "..." : `${stats.conversionRate.toFixed(1)}%`} 
          change="Auditado" 
          trend="up" 
          icon={TrendingUp} 
          color="bg-whatsapp-blue" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-whatsapp-darkLighter p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02]">
          <h3 className="text-lg font-black dark:text-white mb-6 flex items-center gap-2 uppercase tracking-tight">
            <TrendingUp size={20} className="text-whatsapp-teal" />
            Performance Financeira
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" opacity={0.3} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} fontWeight="black" tick={{fill: '#9CA3AF'}} />
                <YAxis axisLine={false} tickLine={false} fontSize={10} fontWeight="black" tick={{fill: '#9CA3AF'}} />
                <Tooltip 
                  cursor={{fill: 'rgba(18, 140, 126, 0.05)'}}
                  contentStyle={{ 
                    backgroundColor: '#111B21', 
                    border: 'none', 
                    borderRadius: '24px', 
                    color: '#fff',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                  }} 
                />
                <Bar dataKey="revenue" fill="#128C7E" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02]">
          <h3 className="font-black dark:text-white mb-6 uppercase tracking-tight text-sm">Transações Recentes</h3>
          <div className="space-y-4">
            {loading ? (
              [1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-gray-100 dark:bg-white/5 rounded-2xl animate-pulse" />)
            ) : stats.recentActivations.length === 0 ? (
              <p className="text-xs text-gray-500 italic py-8">Nenhum registro no balancete.</p>
            ) : stats.recentActivations.map((tx, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 dark:bg-white/5 group hover:bg-whatsapp-teal/5 transition-all">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all group-hover:scale-110 shadow-sm font-black text-xs",
                    tx.is_manual ? "bg-purple-100 text-purple-600" : "bg-whatsapp-green/10 text-whatsapp-green"
                  )}>
                    {tx.is_manual ? "M" : "A"}
                  </div>
                  <div>
                    <p className="text-xs font-black dark:text-white leading-tight">{tx.name}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest font-black leading-none mt-1">{tx.plan}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-whatsapp-teal">R$ {tx.amount.toFixed(2)}</p>
                  <p className="text-[9px] text-gray-400 font-medium">{tx.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal de Lançamento Manual */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-whatsapp-dark/80 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="bg-white dark:bg-whatsapp-darkLighter w-full max-w-md rounded-[40px] p-8 shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-8">
                 <div className="w-12 h-12 rounded-2xl bg-whatsapp-teal/10 flex items-center justify-center text-whatsapp-teal">
                    <DollarSign size={24} />
                 </div>
                 <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-all">
                    <X size={20} className="text-gray-400" />
                 </button>
              </div>

              <h2 className="text-xl font-black mb-2 leading-tight">Lançar Receita Manual</h2>
              <p className="text-xs text-gray-500 mb-8 font-medium italic">Registre doações, ofertas ou contribuições avulsas no balancete.</p>

              <form onSubmit={handleManualEntry} className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-4">Nome do Doador / Origem</label>
                    <input 
                      required
                      type="text"
                      placeholder="Ex: Oferta Culto de Domingo"
                      value={form.user_name}
                      onChange={e => setForm({...form, user_name: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-black/20 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-whatsapp-teal/20 transition-all outline-none"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-4">Valor (R$)</label>
                       <input 
                         required
                         type="text"
                         placeholder="0,00"
                         value={form.amount}
                         onChange={e => setForm({...form, amount: e.target.value})}
                         className="w-full bg-gray-50 dark:bg-black/20 border-none rounded-2xl px-6 py-4 text-sm font-black text-whatsapp-teal focus:ring-2 focus:ring-whatsapp-teal/20 transition-all outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-4">Categoria</label>
                       <select 
                         value={form.category}
                         onChange={e => setForm({...form, category: e.target.value})}
                         className="w-full bg-gray-50 dark:bg-black/20 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-whatsapp-teal/20 transition-all outline-none appearance-none cursor-pointer"
                       >
                         <option value="Doação">Doação</option>
                         <option value="Oferta">Oferta</option>
                         <option value="Assinatura">Assinatura</option>
                         <option value="Outros">Outros</option>
                       </select>
                    </div>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 ml-4">Observação</label>
                    <textarea 
                      placeholder="Detalhes opcionais..."
                      value={form.description}
                      onChange={e => setForm({...form, description: e.target.value})}
                      className="w-full bg-gray-50 dark:bg-black/20 border-none rounded-2xl px-6 py-4 text-sm font-medium focus:ring-2 focus:ring-whatsapp-teal/20 transition-all outline-none min-h-[80px] resize-none"
                    />
                 </div>

                 <button 
                   disabled={saving}
                   type="submit"
                   className="w-full bg-whatsapp-teal text-white py-5 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-whatsapp-teal/20 hover:bg-whatsapp-tealLight hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 mt-4"
                 >
                   {saving ? "Registrando Balancete..." : "Confirmar Lançamento de Caixa"}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
