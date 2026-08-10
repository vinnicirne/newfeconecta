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
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const DEFAULT_GROUPS = [
  { 
    category: "Liderança", 
    price: "9,99", 
    checkout_url: "",
    roles: ["Bispo", "Apóstolo", "Pastor", "Missionário"] 
  },
  { 
    category: "Obreiro", 
    price: "6,99", 
    checkout_url: "",
    roles: ["Evangelista", "Diácono", "Presbítero", "Líder"] 
  },
  { 
    category: "Institucional", 
    price: "14,99", 
    checkout_url: "",
    roles: ["Igreja"] 
  },
  { 
    category: "Membro", 
    price: "3,99", 
    checkout_url: "",
    roles: ["Levita", "Membro"] 
  },
];

export default function PricingPage() {
  const [plans, setPlans] = useState(DEFAULT_GROUPS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', 'verification_prices')
        .single();
      
      if (data?.value && Array.isArray(data.value)) {
        // Retrocompatibilidade: se o dado salvo for do modelo antigo (sem a propriedade roles)
        if (data.value.length > 0 && !data.value[0].roles) {
           const migratedGroups = DEFAULT_GROUPS.map(group => {
              const oldItem = data.value.find((item: any) => item.category === group.category);
              return {
                 ...group,
                 price: oldItem ? oldItem.price : group.price
              };
           });
           setPlans(migratedGroups);
        } else {
           setPlans(data.value);
        }
      }
    } catch (err) {
      console.log("Usando planos padrão (aguardando criação da tabela)");
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = (category: string, field: 'price' | 'checkout_url', value: string) => {
    setPlans(prev => prev.map(p => p.category === category ? { ...p, [field]: value } : p));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_configs')
        .upsert({ 
          key: 'verification_prices', 
          value: plans,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success("Tabela de preços atualizada com sucesso no banco de dados! 💰✨");
    } catch (err: any) {
      toast.error("Erro ao salvar: Verifique se a tabela 'system_configs' existe.");
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    try {
      const res = await fetch('/api/webhooks/kiwify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: { status: 'approved' }, trackingParameters: {} })
      });
      if (res.ok) {
        toast.success("✅ Teste Recebido! O Webhook retornou 200 OK para a Kiwify.");
      } else {
        toast.error("❌ Erro: O Webhook não retornou 200.");
      }
    } catch (err) {
      toast.error("Erro de conexão com o Webhook.");
    }
  };

  return (
    <div className="pb-12">
      <PageHeader 
        title="Configuração de Valores" 
        description="Defina os preços manuais para cada cargo de verificação premium."
      >
        <div className="flex items-center gap-3">
          <button 
            onClick={handleTestWebhook}
            className="flex items-center gap-2 bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-300 px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-95"
          >
            Testar Webhook
          </button>
          <button 
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-whatsapp-teal text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-whatsapp-teal/20 hover:bg-whatsapp-tealLight transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
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
                {plans.map((group) => (
                  <div key={group.category} className="p-6 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          group.category === 'Liderança' ? "bg-orange-500/10 text-orange-500" :
                          group.category === 'Institucional' ? "bg-blue-500/10 text-blue-500" :
                          "bg-whatsapp-teal/10 text-whatsapp-teal"
                        )}>
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold dark:text-white uppercase tracking-widest">{group.category}</p>
                          <p className="text-[10px] text-gray-500 font-medium max-w-[200px] truncate">{group.roles.join(", ")}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">R$</span>
                        <input 
                          type="text" 
                          value={group.price}
                          onChange={(e) => handleGroupChange(group.category, 'price', e.target.value)}
                          className="w-24 bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-xl px-4 py-2 text-sm font-black text-whatsapp-teal dark:text-whatsapp-green text-center focus:ring-2 focus:ring-whatsapp-teal/20 transition-all outline-none"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-black/20 p-1 pl-4 rounded-xl border border-gray-100 dark:border-white/5 flex items-center gap-3">
                       <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 min-w-[70px]">Kiwify URL:</span>
                       <input 
                          type="url"
                          value={group.checkout_url || ""}
                          onChange={(e) => handleGroupChange(group.category, 'checkout_url', e.target.value)}
                          placeholder="https://pay.kiwify.com.br/..."
                          className="flex-1 bg-transparent border-none text-xs text-gray-600 dark:text-gray-300 outline-none p-2 placeholder-gray-300 dark:placeholder-gray-600 font-mono"
                       />
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
                  <span>Você define **UM link do Kiwify** por Grupo (ex: 1 link para Liderança, 1 para Membros).</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <span>O usuário escolhe o cargo específico (Bispo, Pastor) no app, e o sistema repassa isso para a Kiwify.</span>
                </li>
                <li className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <span>Quando o pagamento for aprovado, o Webhook liberará exatamente o cargo escolhido.</span>
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
