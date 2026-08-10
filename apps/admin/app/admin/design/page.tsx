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
  RefreshCw,
  Palette,
  Layers,
  Box
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
      toast.success("Design System sincronizado com sucesso! 💎");
    } catch (err: any) {
      toast.error("Erro ao salvar: Verifique a conexão.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pb-24 animate-in fade-in duration-700">
      <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-8 bg-white dark:bg-whatsapp-darkLighter w-fit px-6 py-3 rounded-full border border-gray-100 dark:border-white/5 shadow-whatsapp">
        <Home className="w-3 h-3" />
        <span>Início</span>
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <Settings className="w-3 h-3" />
        <span>Admin</span>
        <ChevronRight className="w-3 h-3 text-gray-300" />
        <span className="text-whatsapp-teal dark:text-whatsapp-green">Design System</span>
      </nav>

      <PageHeader 
        title="Identidade & Design" 
        description="Gestão centralizada de tokens visuais, SEO e branding da plataforma FéConecta."
      >
        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 bg-whatsapp-teal text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-whatsapp-tealLight transition-all shadow-premium disabled:opacity-50 active:scale-95"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Sincronizando..." : "Salvar Design"}
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-10">
          {/* Card de SEO Otimizado */}
          <div className="bg-white dark:bg-whatsapp-darkLighter p-10 rounded-4xl border border-gray-100 dark:border-white/5 shadow-premium relative overflow-hidden group">
             <div className="flex items-center gap-4 mb-10">
               <div className="p-4 bg-whatsapp-teal/10 rounded-3xl group-hover:rotate-6 transition-transform">
                 <Palette className="w-6 h-6 text-whatsapp-teal" />
               </div>
               <div>
                  <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">Metadados de Marca</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Configuração Global de SEO</p>
               </div>
             </div>

             <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black dark:text-white uppercase tracking-widest text-gray-400 ml-4">Título Global</label>
                      <input 
                        type="text" 
                        value={metadata.site_title}
                        onChange={e => setMetadata({...metadata, site_title: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-whatsapp-dark border-none rounded-3xl px-6 py-4 text-sm focus:ring-2 focus:ring-whatsapp-teal/20 transition-all font-bold dark:text-white outline-none shadow-sm"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black dark:text-white uppercase tracking-widest text-gray-400 ml-4">Nome Curto</label>
                      <input 
                        type="text" 
                        value={metadata.site_name}
                        onChange={e => setMetadata({...metadata, site_name: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-whatsapp-dark border-none rounded-3xl px-6 py-4 text-sm focus:ring-2 focus:ring-whatsapp-teal/20 transition-all font-bold dark:text-white outline-none shadow-sm"
                      />
                    </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black dark:text-white uppercase tracking-widest text-gray-400 ml-4">Palavras-chave</label>
                  <input 
                    type="text" 
                    value={metadata.site_keywords}
                    onChange={e => setMetadata({...metadata, site_keywords: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-whatsapp-dark border-none rounded-3xl px-6 py-4 text-sm focus:ring-2 focus:ring-whatsapp-teal/20 transition-all font-bold dark:text-white outline-none shadow-sm"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black dark:text-white uppercase tracking-widest text-gray-400 ml-4">Descrição SEO</label>
                  <textarea 
                    rows={4}
                    value={metadata.site_description}
                    onChange={e => setMetadata({...metadata, site_description: e.target.value})}
                    className="w-full bg-gray-50 dark:bg-whatsapp-dark border-none rounded-3xl px-6 py-5 text-sm focus:ring-2 focus:ring-whatsapp-teal/20 transition-all font-medium dark:text-white outline-none resize-none leading-relaxed shadow-sm"
                  />
                </div>
             </div>
          </div>

          {/* Showcase de Tokens Visuais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-4xl border border-gray-100 dark:border-white/5 shadow-premium">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Border Radius Stack</h4>
                <div className="space-y-4">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-whatsapp-teal rounded-2xl shadow-sm" />
                      <span className="text-[10px] font-black uppercase tracking-widest">2xl (24px)</span>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-whatsapp-teal rounded-3xl shadow-sm" />
                      <span className="text-[10px] font-black uppercase tracking-widest">3xl (32px)</span>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-whatsapp-teal rounded-4xl shadow-sm" />
                      <span className="text-[10px] font-black uppercase tracking-widest">4xl (40px)</span>
                   </div>
                </div>
             </div>

             <div className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-4xl border border-gray-100 dark:border-white/5 shadow-premium">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-6">Shadow Elevation</h4>
                <div className="grid grid-cols-2 gap-4">
                   <div className="aspect-square bg-gray-50 dark:bg-whatsapp-dark rounded-2xl shadow-whatsapp flex items-center justify-center p-4 text-center">
                      <span className="text-[8px] font-black uppercase tracking-tighter">WhatsApp Shadow</span>
                   </div>
                   <div className="aspect-square bg-gray-50 dark:bg-whatsapp-dark rounded-2xl shadow-premium flex items-center justify-center p-4 text-center border border-white/5">
                      <span className="text-[8px] font-black uppercase tracking-tighter">Premium Elevation</span>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar de Configurações Visuais */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-4xl border border-gray-100 dark:border-white/5 shadow-premium">
            <h3 className="text-[10px] font-black dark:text-white mb-8 uppercase tracking-[0.2em] text-gray-400">Modo de Interface</h3>
            <div className="grid grid-cols-1 gap-4">
              {[
                { id: 'light', name: 'Claro', icon: Sun },
                { id: 'dark', name: 'Escuro', icon: Moon },
                { id: 'system', name: 'Sistema', icon: Monitor },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "relative flex items-center gap-4 px-6 py-4 rounded-3xl border-2 transition-all group",
                    theme === t.id 
                      ? "border-whatsapp-teal bg-whatsapp-teal/5 text-whatsapp-teal" 
                      : "border-transparent bg-gray-50 dark:bg-whatsapp-dark text-gray-400 hover:border-gray-100 dark:hover:border-white/10"
                  )}
                >
                  <t.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", theme === t.id ? "text-whatsapp-teal" : "text-gray-400")} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{t.name}</span>
                  {theme === t.id && <Check className="ml-auto w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-premium-gradient text-white p-10 rounded-4xl shadow-premium relative overflow-hidden group border border-white/10">
            <div className="relative z-10 text-center">
              <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center font-black text-white text-3xl italic mx-auto mb-6 shadow-xl border border-white/20">F</div>
              <h3 className="font-black text-sm uppercase tracking-widest mb-2">Branding Ativo</h3>
              <p className="text-[10px] text-white/60 leading-relaxed font-bold uppercase tracking-tight">
                Logotipo e Identidade Global
              </p>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl opacity-50" />
          </div>

          <div className="bg-whatsapp-darkLighter text-white p-8 rounded-4xl shadow-premium border border-white/5 group hover:border-whatsapp-green/30 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-whatsapp-green/10 rounded-2xl">
                  <Box className="w-6 h-6 text-whatsapp-green" />
                </div>
                <h3 className="font-black text-xs uppercase tracking-widest">Componentes</h3>
              </div>
              <p className="text-[10px] text-gray-500 mb-8 font-black uppercase tracking-tight leading-relaxed">Acesse a biblioteca de componentes atômicos.</p>
              <button className="w-full py-5 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-whatsapp-green transition-all border border-white/5">
                 Visualizar Biblioteca
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
