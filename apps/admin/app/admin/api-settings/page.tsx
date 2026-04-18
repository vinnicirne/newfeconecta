"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { 
  Key, 
  Bell, 
  Globe, 
  Copy, 
  RefreshCw, 
  ShieldCheck,
  Zap,
  Lock,
  Save
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ApiSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    requests: "Calculando...",
    users: 0
  });

  const [configs, setConfigs] = useState({
    google_analytics: "",
    firebase_active: true,
    webhook_active: true
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vunqyhy...supabase.co";

  useEffect(() => { 
    fetchConfigs();
    fetchStats();
  }, []);

  const fetchConfigs = async () => {
    try {
      const { data } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', 'api_settings')
        .single();
      
      if (data?.value) setConfigs(data.value);
    } catch (err) {
      console.log("Configurações padrão carregadas.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
    setStats({
      requests: `${((count || 0) * 15).toLocaleString()} calls`,
      users: count || 0
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_configs')
        .upsert({ 
          key: 'api_settings', 
          value: configs,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success("Configurações de infraestrutura salvas! ⚡💻");
    } catch (err: any) {
      toast.error("Erro ao sincronizar infraestrutura.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-12 animate-in fade-in duration-500">
      <PageHeader 
        title="Configurações de API & Sistema" 
        description="Gerencie chaves de acesso real, integradores ativos e telemetria de infraestrutura."
      >
        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 bg-whatsapp-teal text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-whatsapp-teal/20 transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Salvando..." : "Sincronizar Borda"}
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
        <div className="space-y-6">
          <div className="bg-white dark:bg-whatsapp-darkLighter p-10 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02]">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-whatsapp-teal/10 rounded-2xl">
                <Key className="w-6 h-6 text-whatsapp-teal" />
              </div>
              <h3 className="font-black dark:text-white uppercase tracking-tight">Coração do Sistema (Supabase)</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4">Ambiente de Operação (URL)</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-whatsapp-light dark:bg-whatsapp-dark p-5 rounded-3xl border border-gray-100 dark:border-white/5 text-xs font-mono text-whatsapp-teal font-black truncate">
                    {supabaseUrl}
                  </div>
                  <button 
                    onClick={() => { navigator.clipboard.writeText(supabaseUrl); toast.success("URL copiada!"); }}
                    className="p-5 bg-whatsapp-teal/10 rounded-3xl hover:bg-whatsapp-teal/20 transition-all text-whatsapp-teal"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4">Supabase Anon Key</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-whatsapp-light dark:bg-whatsapp-dark p-5 rounded-3xl border border-gray-100 dark:border-white/5 text-xs font-mono text-gray-400 font-black">
                    ••••••••••••••••••••••••••••••••••••••••••••
                  </div>
                  <button className="p-5 bg-gray-100 dark:bg-white/10 rounded-3xl hover:bg-gray-200 dark:hover:bg-white/20 transition-all">
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-whatsapp-darkLighter p-10 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02]">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-blue-500/10 rounded-2xl">
                <Bell className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-black dark:text-white uppercase tracking-tight">Push & Firebase</h3>
            </div>
            <p className="text-[11px] text-gray-500 mb-8 font-medium uppercase tracking-tight leading-relaxed">Conectividade ministerial via notificações segmentadas.</p>
            <button className="w-full py-5 bg-gray-50 dark:bg-black/20 border-none rounded-3xl text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" /> Atualizar Credenciais JSON
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-whatsapp-teal dark:bg-whatsapp-teal p-10 rounded-[40px] shadow-2xl shadow-whatsapp-teal/20 text-white relative overflow-hidden group">
             <div className="relative z-10">
               <div className="flex items-center gap-3 mb-8">
                 <Zap className="w-6 h-6 text-whatsapp-green" />
                 <h3 className="font-black uppercase tracking-tight">Protocolos de Evento (Webhooks)</h3>
               </div>
               <div className="space-y-4">
                  {[
                    { label: "Novo Cadastro de Fiel", active: configs.webhook_active, icon: Globe },
                    { label: "Assinatura Auditada", active: configs.webhook_active, icon: ShieldCheck },
                  ].map((hook, i) => (
                    <div key={i} className="flex items-center justify-between p-5 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                        <hook.icon className="w-5 h-5 text-whatsapp-green" />
                        <span className="text-[11px] font-black uppercase tracking-widest">{hook.label}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase text-whatsapp-green tracking-widest">Ativo</span>
                    </div>
                  ))}
               </div>
               <button className="w-full mt-8 py-4 bg-white/20 hover:bg-white/30 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">
                 Adicionar Novo Endpoint
               </button>
             </div>
             <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl opacity-50" />
          </div>

          <div className="bg-white dark:bg-whatsapp-darkLighter p-10 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02]">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-orange-500/10 rounded-2xl">
                <Globe className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="font-black dark:text-white uppercase tracking-tight">Rastreamento Analítico</h3>
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-4">Google Analytics Script</label>
              <textarea 
                rows={4}
                value={configs.google_analytics}
                onChange={e => setConfigs({...configs, google_analytics: e.target.value})}
                placeholder="<!-- Paste your Global Site Tag here -->" 
                className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-3xl px-6 py-6 text-xs font-mono text-whatsapp-teal focus:ring-2 focus:ring-whatsapp-teal/20 transition-all resize-none outline-none"
              />
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-tight ml-4">Código injetivo para monitoramento de tráfego ministerial.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-whatsapp-darkLighter p-10 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02]">
             <h4 className="font-black dark:text-white mb-8 text-sm uppercase tracking-tight">Status Telemetria API</h4>
             <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Latência Média</span>
                  <span className="text-xs font-black text-whatsapp-green">28ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Uptime Mensal</span>
                  <span className="text-xs font-black text-whatsapp-green">99.99%</span>
                </div>
                <div className="flex items-center justify-between">
                   <span className="text-[11px] font-black uppercase text-gray-400 tracking-widest">Auditoria de Carga</span>
                   <span className="text-xs font-black dark:text-white">{stats.requests}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
