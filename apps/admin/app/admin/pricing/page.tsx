"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { 
  DollarSign, 
  Save, 
  ChevronRight, 
  Info,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Este componente simula a configuração de valores para o MVP.
// Em um sistema real, estes valores seriam salvos em uma tabela 'system_configs' ou similar.

const DEFAULT_PLANS = [
  { role: "Bispo", price: "9,99", category: "Liderança" },
  { role: "Apóstolo", price: "9,99", category: "Liderança" },
  { role: "Pastor", price: "9,99", category: "Liderança" },
  { role: "Missionário", price: "9,99", category: "Liderança" },
  { role: "Evangelista", price: "6,99", category: "Obreiro" },
  { role: "Diácono", price: "6,99", category: "Obreiro" },
  { role: "Presbítero", price: "6,99", category: "Obreiro" },
  { role: "Líder", price: "6,99", category: "Obreiro" },
  { role: "Igreja", price: "14,99", category: "Institucional" },
  { role: "Levita", price: "3,99", category: "Membro" },
  { role: "Membro", price: "3,99", category: "Membro" },
];

export default function PricingPage() {
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [loading, setLoading] = useState(false);

  const handlePriceChange = (role: string, newPrice: string) => {
    setPlans(prev => prev.map(p => p.role === role ? { ...p, price: newPrice } : p));
  };

  const handleSave = () => {
    setLoading(true);
    // Simulando persistência
    setTimeout(() => {
      localStorage.setItem('verification_prices', JSON.stringify(plans));
      toast.success("Configurações de valores salvas com sucesso!");
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="pb-12">
      <PageHeader 
        title="Configuração de Valores" 
        description="Defina os preços manuais para cada cargo de verificação premium."
      >
        <button 
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 bg-whatsapp-teal text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-whatsapp-teal/20 hover:bg-whatsapp-tealLight transition-all active:scale-95 disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Alterações
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-whatsapp-darkLighter rounded-[32px] border border-gray-100 dark:border-white/5 whatsapp-shadow overflow-hidden">
             <div className="p-8 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold dark:text-white">Planos de Verificação</h3>
                  <p className="text-xs text-gray-500 mt-1">Valores cobrados via PIX no checkout manual.</p>
                </div>
                <div className="flex items-center gap-2 text-whatsapp-teal font-black text-[10px] uppercase tracking-widest bg-whatsapp-teal/10 px-3 py-1 rounded-full">
                   <ShieldCheck className="w-3 h-3" /> Verificados Ativos
                </div>
             </div>
             
             <div className="divide-y divide-gray-100 dark:divide-white/5">
                {plans.map((plan) => (
                  <div key={plan.role} className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        plan.category === 'Liderança' ? "bg-orange-500/10 text-orange-500" :
                        plan.category === 'Institucional' ? "bg-blue-500/10 text-blue-500" :
                        "bg-whatsapp-teal/10 text-whatsapp-teal"
                      )}>
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold dark:text-white">{plan.role}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{plan.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400">R$</span>
                      <input 
                        type="text" 
                        value={plan.price}
                        onChange={(e) => handlePriceChange(plan.role, e.target.value)}
                        className="w-24 bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-xl px-4 py-2 text-sm font-black text-whatsapp-teal dark:text-whatsapp-green text-center focus:ring-2 focus:ring-whatsapp-teal/20 transition-all outline-none"
                      />
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[32px] border border-blue-100 dark:border-blue-900/20">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
                <Info className="w-6 h-6 text-blue-500" />
              </div>
              <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-4">Como funciona a precificação?</h4>
              <ul className="space-y-4 text-sm text-blue-700/80 dark:text-blue-400 font-medium">
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <span>Os valores aqui definidos são exibidos no modal de verificação para o usuário final.</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <span>Como o gateway é manual, o usuário verá o valor e a chave PIX para transferência.</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <span>O lucro vai direto para a conta configurada na chave PIX do sistema.</span>
                </li>
              </ul>
           </div>

           <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-[32px] border border-gray-200 dark:border-white/10">
              <h4 className="font-bold dark:text-white mb-2 text-sm">Resumo de Categorias</h4>
              <p className="text-xs text-gray-500 mb-6 font-medium">Categorias ajudam a organizar os selos na rede.</p>
              
              <div className="space-y-3">
                 <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Liderança</span>
                    <span className="font-bold dark:text-white">R$ 9,99 avg</span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Membros</span>
                    <span className="font-bold dark:text-white">R$ 3,99 avg</span>
                 </div>
                 <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Institucional</span>
                    <span className="font-bold dark:text-white">R$ 14,99 avg</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
