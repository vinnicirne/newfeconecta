"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import { 
  FileText, 
  Plus, 
  Search, 
  MoreVertical, 
  ExternalLink,
  Eye,
  Settings2,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function StaticPagesPage() {
  const pages = [
    { title: "Termos de Uso", slug: "/terms", status: "published", updated: "há 2 dias", type: "legal" },
    { title: "Política de Privacidade", slug: "/privacy", status: "published", updated: "há 5 dias", type: "legal" },
    { title: "Sobre a FéConecta", slug: "/about", status: "draft", updated: "há 1h", type: "content" },
    { title: "Diretrizes da Comunidade", slug: "/guidelines", status: "published", updated: "há 1 mês", type: "legal" },
  ];

  return (
    <div className="pb-12">
      <PageHeader 
        title="Páginas Personalizadas" 
        description="Gerencie conteúdo estático, termos legais e páginas institucionais."
      >
        <button className="flex items-center gap-2 bg-whatsapp-teal text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-whatsapp-tealLight transition-all">
          <Plus className="w-4 h-4" /> Criar Página
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total de Páginas", value: "12", icon: FileText, color: "text-blue-500" },
          { label: "Páginas Legais", value: "4", icon: Lock, color: "text-purple-500" },
          { label: "Rascunhos", value: "2", icon: Settings2, color: "text-gray-400" },
          { label: "Visualizações/Mês", value: "45k", icon: Eye, color: "text-whatsapp-green" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow">
            <stat.icon className={cn("w-5 h-5 mb-3", stat.color)} />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">{stat.label}</p>
            <h3 className="text-xl font-bold dark:text-white mt-2">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Pages Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {pages.map((page, i) => (
          <div key={i} className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow group hover:border-whatsapp-green/30 transition-all">
             <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-whatsapp-light dark:bg-whatsapp-dark rounded-xl">
                  {page.type === 'legal' ? <Lock className="w-5 h-5 text-purple-500" /> : <FileText className="w-5 h-5 text-blue-500" />}
                </div>
                <div className="flex items-center gap-2">
                   <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all">
                     <ExternalLink className="w-4 h-4 text-gray-400" />
                   </button>
                   <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all">
                     <MoreVertical className="w-4 h-4 text-gray-400" />
                   </button>
                </div>
             </div>
             
             <h4 className="font-bold dark:text-white text-lg mb-1">{page.title}</h4>
             <p className="text-xs text-whatsapp-teal dark:text-whatsapp-green font-mono mb-4">{page.slug}</p>
             
             <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-white/5">
                <div className="flex items-center gap-2">
                   <span className={cn(
                     "w-2 h-2 rounded-full",
                     page.status === 'published' ? "bg-whatsapp-green" : "bg-gray-300"
                   )} />
                   <span className="text-[10px] font-bold uppercase text-gray-500">{page.status}</span>
                </div>
                <span className="text-[10px] font-medium text-gray-400 italic">Atualizado {page.updated}</span>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
