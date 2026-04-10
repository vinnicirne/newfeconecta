"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import { 
  Key, 
  Bell, 
  Globe, 
  Copy, 
  RefreshCw, 
  ShieldCheck,
  Zap,
  Lock
} from "lucide-react";

export default function ApiSettingsPage() {
  return (
    <div className="pb-12">
      <PageHeader 
        title="Configurações de API & Sistema" 
        description="Gerencie chaves de acesso, integradores e notificações push."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* API Keys */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-whatsapp-teal/10 rounded-lg">
                <Key className="w-5 h-5 text-whatsapp-teal" />
              </div>
              <h3 className="font-bold dark:text-white">Chaves de API</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Supabase Project URL</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-whatsapp-light dark:bg-whatsapp-dark p-3 rounded-xl border border-gray-100 dark:border-white/5 text-sm font-mono text-gray-400 select-all">
                    https://vunqyhy...supabase.co
                  </div>
                  <button className="p-3 bg-gray-100 dark:bg-white/10 rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-all">
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block tracking-wider">Supabase Anon Key</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-whatsapp-light dark:bg-whatsapp-dark p-3 rounded-xl border border-gray-100 dark:border-white/5 text-sm font-mono text-gray-400">
                    ••••••••••••••••••••••••••••••
                  </div>
                  <button className="p-3 bg-gray-100 dark:bg-white/10 rounded-xl hover:bg-gray-200 dark:hover:bg-white/20 transition-all">
                    <RefreshCw className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Bell className="w-5 h-5 text-blue-500" />
              </div>
              <h3 className="font-bold dark:text-white">Push Notifications (Firebase)</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6 font-medium">Configure as chaves de integração para envio de notificações segmentadas.</p>
            <button className="w-full py-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl text-xs font-bold dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" /> Atualizar Credenciais JSON
            </button>
          </div>
        </div>

        {/* System & Logs */}
        <div className="space-y-6">
          <div className="bg-whatsapp-teal dark:bg-whatsapp-teal p-6 rounded-2xl whatsapp-shadow text-white relative overflow-hidden">
             <div className="relative z-10">
               <div className="flex items-center gap-3 mb-6">
                 <Zap className="w-5 h-5 text-whatsapp-green" />
                 <h3 className="font-bold">Webhooks de Eventos</h3>
               </div>
               <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-whatsapp-green" />
                      <span className="text-xs font-medium">Novo Cadastro</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-whatsapp-green">Ativo</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white/10 rounded-xl border border-white/10">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 text-whatsapp-green" />
                      <span className="text-xs font-medium">Pagamento Confirmado</span>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-whatsapp-green">Ativo</span>
                  </div>
               </div>
               <button className="w-full mt-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all">
                 Adicionar Novo Endpoint
               </button>
             </div>
             <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full blur-3xl" />
          </div>

          {/* Google Analytics */}
          <div className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Globe className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="font-bold dark:text-white">Monitoramento & Analytics</h3>
            </div>
            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-500 uppercase block tracking-wider">Código do Google Analytics</label>
              <textarea 
                rows={4}
                placeholder="<!-- Global site tag (gtag.js) - Google Analytics -->" 
                className="w-full bg-slate-100 dark:bg-whatsapp-dark border-none rounded-2xl px-5 py-4 text-xs font-mono text-whatsapp-green focus:ring-2 focus:ring-whatsapp-green/20 transition-all resize-none"
              />
              <p className="text-[10px] text-gray-400 font-medium">Cole aqui o seu código completo do Google Analytics para monitorar o tráfego.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow">
             <h4 className="font-bold dark:text-white mb-4 text-sm">Status da API</h4>
             <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Latência Média</span>
                  <span className="text-xs font-bold text-whatsapp-green">42ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Uptime (30 dias)</span>
                  <span className="text-xs font-bold text-whatsapp-green">99.98%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Requests (24h)</span>
                  <span className="text-xs font-bold dark:text-white">1.2M</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
