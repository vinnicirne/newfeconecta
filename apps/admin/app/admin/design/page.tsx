"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import { 
  Palette, 
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
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

export default function DesignPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="pb-12">
      {/* Breadcrumbs */}
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
        <button className="flex items-center gap-2 bg-whatsapp-teal text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-whatsapp-tealLight transition-all shadow-lg shadow-whatsapp-teal/20">
          <Save className="w-4 h-4" /> Salvar Alterações
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Settings Column */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Site Info Section */}
          <div className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-3xl border border-gray-100 dark:border-white/5 whatsapp-shadow relative overflow-hidden">
             <div className="flex items-center gap-3 mb-8">
               <div className="p-2.5 bg-whatsapp-teal/10 rounded-xl">
                 <Info className="w-5 h-5 text-whatsapp-teal dark:text-whatsapp-green" />
               </div>
               <h3 className="text-xl font-bold dark:text-white">Informações do Site</h3>
             </div>

             <div className="space-y-8">
                {/* Site Title */}
                <div className="space-y-2">
                  <label className="text-sm font-bold dark:text-white flex items-center gap-2">
                    Título do site <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    defaultValue="Uma rede social Cristã" 
                    className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-whatsapp-green/20 transition-all font-medium"
                  />
                  <p className="text-xs text-gray-400 font-medium">O título geral do seu site aparecerá no Google e na aba do seu navegador.</p>
                </div>

                {/* Site Name */}
                <div className="space-y-2">
                  <label className="text-sm font-bold dark:text-white">Nome do site</label>
                  <input 
                    type="text" 
                    defaultValue="Feconecta" 
                    className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-whatsapp-green/20 transition-all font-medium"
                  />
                  <p className="text-xs text-gray-400 font-medium">O nome do seu site aparecerá no rodapé do site e nos e-mails.</p>
                </div>

                {/* Keywords */}
                <div className="space-y-2">
                  <label className="text-sm font-bold dark:text-white">Palavras-chave do site</label>
                  <input 
                    type="text" 
                    defaultValue="social, wowonder, social site" 
                    className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-whatsapp-green/20 transition-all font-medium"
                  />
                  <p className="text-xs text-gray-400 font-medium">A palavra-chave do seu site, usada principalmente para SEO e mecanismos de busca.</p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-bold dark:text-white">Descrição do site</label>
                  <textarea 
                    rows={3}
                    defaultValue="WoWonder v3.0.2 is a Social Networking Platform. With our new feature, user can wonder posts, photos," 
                    className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-whatsapp-green/20 transition-all font-medium resize-none"
                  />
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">A descrição do seu site, usada principalmente para SEO e mecanismos de busca, deve ter no máximo 100 caracteres.</p>
                </div>
             </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-8">
          {/* Theme Selector */}
          <div className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-3xl border border-gray-100 dark:border-white/5 whatsapp-shadow">
            <h3 className="text-sm font-bold dark:text-white mb-6 uppercase tracking-wider text-gray-500">Tema do Painel</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'light', name: 'Claro', icon: Sun },
                { id: 'dark', name: 'Escuro', icon: Moon },
                { id: 'system', name: 'Sistema', icon: Monitor },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={cn(
                    "relative flex items-center gap-4 px-4 py-3 rounded-2xl border-2 transition-all text-left",
                    theme === t.id 
                      ? "border-whatsapp-green bg-whatsapp-green/5 text-whatsapp-teal dark:text-whatsapp-green" 
                      : "border-transparent bg-whatsapp-light dark:bg-whatsapp-dark text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
                  )}
                >
                  <t.icon className={cn("w-5 h-5", theme === t.id ? "text-whatsapp-green" : "text-gray-400")} />
                  <span className="text-xs font-bold">{t.name}</span>
                  {theme === t.id && <div className="ml-auto p-1 bg-whatsapp-green text-whatsapp-dark rounded-full"><Check className="w-2 h-2 font-bold" /></div>}
                </button>
              ))}
            </div>
          </div>

          {/* Logo Notice */}
          <div className="bg-whatsapp-teal text-white p-6 rounded-3xl whatsapp-shadow relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <ImageIcon className="w-5 h-5 text-whatsapp-green" />
                <h3 className="font-bold text-sm">Logotipo do Site</h3>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed mb-6 font-medium">
                Você pode alterar seu logotipo em <span className="text-whatsapp-green font-bold underline cursor-pointer">Alterar o design do site</span>.
              </p>
              <div className="w-full h-20 bg-white/10 rounded-2xl border border-white/20 flex flex-col items-center justify-center gap-2 group-hover:bg-white/15 transition-all">
                 <div className="w-8 h-8 rounded-full bg-whatsapp-green flex items-center justify-center font-bold text-whatsapp-dark text-xs italic">F</div>
                 <span className="text-[10px] uppercase font-bold tracking-tighter opacity-50 font-mono">FéConecta Brand</span>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl opacity-50" />
          </div>

          {/* Custom Code */}
          <div className="bg-whatsapp-darkLighter text-white p-6 rounded-3xl whatsapp-shadow border border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <Code2 className="w-4 h-4 text-whatsapp-green" />
                <h3 className="font-bold text-sm">Scripts de Borda</h3>
              </div>
              <p className="text-[10px] text-gray-400 mb-6 font-medium leading-relaxed">Personalize comportamentos de nível global com injeção de JS seguro.</p>
              <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-whatsapp-green transition-all flex items-center justify-center gap-2 border border-white/10">
                <Layout className="w-3 h-3" /> Gerenciar Blocos
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}
