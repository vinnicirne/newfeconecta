"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { 
  Sun, 
  Moon, 
  Monitor, 
  Image as ImageIcon, 
  Layout,
  Code2,
  Save,
  Check,
  ChevronRight,
  Home,
  Settings,
  Info,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function DesignPage() {
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [metadata, setMetadata] = useState({
    site_title: "FéConecta - Uma rede social Cristã",
    site_name: "FéConecta",
    site_keywords: "cristão, rede social, biblia, fé, conexão",
    site_description: "A maior rede social de conexão ministerial e comunhão cristã do Brasil."
  });

  useEffect(() => { fetchSiteMetadata(); }, []);

  const fetchSiteMetadata = async () => {
    try {
      const { data, error } = await supabase
        .from('system_configs')
        .select('value')
        .eq('key', 'site_metadata')
        .single();
      
      if (data?.value) {
        setMetadata(data.value);
      }
    } catch (err) {
      console.log("Usando metadados padrão");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('system_configs')
        .upsert({ 
          key: 'site_metadata', 
          value: metadata,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      toast.success("Informações do site atualizadas com sucesso! 🌐✨");
    } catch (err: any) {
      toast.error("Erro ao salvar: Verifique a conexão com o banco.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-12 animate-in fade-in duration-500">
      <nav className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-6 bg-white dark:bg-whatsapp-darkLighter w-fit px-4 py-2 rounded-full border border-gray-100 dark:border-white/5 whatsapp-shadow">
        <Home className="w-3 h-3" />
        <span>Lar</span>
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <Settings className="w-3 h-3" />
        <span>Configurações</span>
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <span className="text-whatsapp-teal dark:text-whatsapp-green font-bold">Informações do site</span>
      </nav>

      <PageHeader 
        title="Informações do Site" 
        description="Configure os detalhes técnicos, SEO e branding da sua plataforma FéConecta."
      >
        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 bg-whatsapp-teal text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-whatsapp-tealLight transition-all shadow-lg shadow-whatsapp-teal/20 disabled:opacity-50"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Salvando..." : "Salvar Alterações"}
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-whatsapp-darkLighter p-10 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02] relative overflow-hidden">
             <div className="flex items-center gap-3 mb-10">
               <div className="p-3 bg-whatsapp-teal/10 rounded-2xl">
                 <Info className="w-6 h-6 text-whatsapp-teal" />
               </div>
               <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">Metadados de Borda (SEO)</h3>
             </div>

             <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-black dark:text-white uppercase tracking-widest text-gray-400 ml-4">
                    Título Global do Site <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={metadata.site_title}
                    onChange={e => setMetadata({...metadata, site_title: e.target.value})}
                    placeholder="Ex: FéConecta - A Rede do Reino"
                    className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-whatsapp-teal/20 transition-all font-bold dark:text-white outline-none"
                  />
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight ml-4">Este título aparece Google e nas abas do navegador.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black dark:text-white uppercase tracking-widest text-gray-400 ml-4">Nome Curto da Marca</label>
                  <input 
                    type="text" 
                    value={metadata.site_name}
                    onChange={e => setMetadata({...metadata, site_name: e.target.value})}
                    placeholder="Ex: FéConecta"
                    className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-whatsapp-teal/20 transition-all font-bold dark:text-white outline-none"
                  />
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight ml-4">Usado em rodapés, e-mails e notificações do sistema.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black dark:text-white uppercase tracking-widest text-gray-400 ml-4">Palavras-chave (Keywords)</label>
                  <input 
                    type="text" 
                    value={metadata.site_keywords}
                    onChange={e => setMetadata({...metadata, site_keywords: e.target.value})}
                    placeholder="Ex: cristão, rede social, gospel"
                    className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-whatsapp-teal/20 transition-all font-bold dark:text-white outline-none"
                  />
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight ml-4">Separe as palavras por vírgula para otimização de busca.</p>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-black dark:text-white uppercase tracking-widest text-gray-400 ml-4">Descrição SEO (Meta Description)</label>
                  <textarea 
                    rows={4}
                    value={metadata.site_description}
                    onChange={e => setMetadata({...metadata, site_description: e.target.value})}
                    placeholder="Descreva sua plataforma em poucas palavras..."
                    className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-2xl px-6 py-5 text-sm focus:ring-2 focus:ring-whatsapp-teal/20 transition-all font-medium dark:text-white outline-none resize-none leading-relaxed"
                  />
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight ml-4">Resumo do site que aparece nos resultados de busca (Máx. 160 caracteres recomendado).</p>
                </div>
             </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02]">
            <h3 className="text-[10px] font-black dark:text-white mb-8 uppercase tracking-[0.2em] text-gray-400">Preferências de Visual</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'light', name: 'Interface Clara', icon: Sun },
                { id: 'dark', name: 'Modo Escuro (Amoled)', icon: Moon },
                { id: 'system', name: 'Sincronizar Sistema', icon: Monitor },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "relative flex items-center gap-4 px-6 py-4 rounded-3xl border-2 transition-all text-left group",
                    theme === t.id 
                      ? "border-whatsapp-teal bg-whatsapp-teal/5 text-whatsapp-teal" 
                      : "border-transparent bg-whatsapp-light dark:bg-whatsapp-dark text-gray-500 hover:border-gray-100 dark:hover:border-white/10"
                  )}
                >
                  <t.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", theme === t.id ? "text-whatsapp-teal" : "text-gray-400")} />
                  <span className="text-xs font-black uppercase tracking-tight">{t.name}</span>
                  {theme === t.id && <div className="ml-auto p-1.5 bg-whatsapp-teal text-white rounded-full"><Check className="w-2 h-2 font-bold" /></div>}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-whatsapp-teal text-white p-10 rounded-[40px] shadow-2xl shadow-whatsapp-teal/20 relative overflow-hidden group border border-white/10">
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 rounded-3xl bg-whatsapp-green/20 flex items-center justify-center font-black text-whatsapp-green text-3xl italic mx-auto mb-6 shadow-xl border border-white/20">F</div>
              <h3 className="font-black text-sm uppercase tracking-widest mb-2">Branding Ativo</h3>
              <p className="text-[10px] text-white/60 leading-relaxed font-bold uppercase tracking-tight">
                Logotipo e Identidade Global
              </p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl opacity-50" />
          </div>

          <div className="bg-whatsapp-darkLighter text-white p-8 rounded-[40px] shadow-xl border border-white/5 group hover:border-whatsapp-green/30 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-whatsapp-green/10 rounded-xl">
                  <Code2 className="w-5 h-5 text-whatsapp-green" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest">Injeção Global</h3>
              </div>
              <p className="text-[10px] text-gray-500 mb-8 font-black uppercase tracking-tight leading-relaxed">Personalize comportamentos via JS Seguro.</p>
              <button className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-whatsapp-green transition-all flex items-center justify-center gap-2 border border-white/5">
                <Layout className="w-4 h-4" /> Gerenciar Blocos
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
