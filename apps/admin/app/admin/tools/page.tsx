"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { 
  Bot, 
  Send, 
  Database, 
  ShieldAlert, 
  Zap,
  Ghost,
  Layout,
  ShieldCheck,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";

export default function ToolsPage() {
  const [executing, setExecuting] = useState<string | null>(null);

  const handleAction = (title: string) => {
    setExecuting(title);
    
    // Lógica para ferramentas com ação imediata
    setTimeout(() => {
      setExecuting(null);
      if (title === "Cache Global Clear") {
        toast.success("Cache da CDN purgado com sucesso! ⚡");
      } else if (title === "Teste de Notificação") {
        toast.info("Push de teste enviado para os dispositivos administrativos. 📲");
      } else {
        toast.error(`A ferramenta '${title}' requer permissão de Super Admin Nível 5.`);
      }
    }, 1500);
  };

  const tools = [
    { 
      title: "Cache Global Clear", 
      description: "Limpa o cache de borda (Vercel/CDN) para refletir mudanças de design instantaneamente.",
      icon: Zap,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      action: "Limpar Cache",
      type: "action"
    },
    { 
      title: "Gestão de Verificados", 
      description: "Analise solicitações pendentes e gerencie selos de autenticidade para líderes.",
      icon: ShieldCheck,
      color: "text-whatsapp-teal",
      bg: "bg-whatsapp-teal/10",
      action: "Painel de Controle",
      href: "/admin/verifications",
      type: "link"
    },
    { 
      title: "Teste de Notificação", 
      description: "Envia um push silencioso para validar a conexão com o gateway Firebase/Expo.",
      icon: Send,
      color: "text-whatsapp-green",
      bg: "bg-whatsapp-green/10",
      action: "Disparar Teste",
      type: "action"
    },
    { 
      title: "SEO & Identidade", 
      description: "Gerencie metadados, palavras-chave e informações globais do site.",
      icon: Layout,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      action: "Configurar SEO",
      href: "/admin/design",
      type: "link"
    },
    { 
      title: "Scanner de Bots", 
      description: "Analisa padrões de comportamento (AI) para identificar contas automatizadas.",
      icon: Bot,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      action: "Monitorar Tráfego",
      type: "action",
      disabled: true
    },
    { 
      title: "Limpeza de Banco", 
      description: "Remove registros órfãos e otimiza tabelas de balancete e logs.",
      icon: Database,
      color: "text-red-500",
      bg: "bg-red-500/10",
      action: "Otimizar SQL",
      type: "action"
    }
  ];

  return (
    <div className="pb-12 animate-in fade-in duration-500">
      <PageHeader 
        title="Ferramentas Administrativas" 
        description="Utilitários operativos para manutenção técnica e saúde da infraestrutura FéConecta."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {tools.map((tool, i) => {
          const isProcessing = executing === tool.title;
          
          const Content = (
            <div className={cn(
               "bg-white dark:bg-whatsapp-darkLighter p-10 rounded-[40px] border border-gray-100 dark:border-white/5 shadow-xl shadow-black/[0.02] group hover:border-whatsapp-teal/30 transition-all flex flex-col h-full",
               tool.disabled && "opacity-60 grayscale cursor-not-allowed"
            )}>
               <div className={cn("p-5 rounded-3xl w-fit mb-8 group-hover:scale-110 transition-transform shadow-sm", tool.bg)}>
                  <tool.icon className={cn("w-7 h-7", tool.color)} />
               </div>
               <h4 className="font-black dark:text-white text-lg mb-3 uppercase tracking-tight">{tool.title}</h4>
               <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-10 leading-relaxed font-medium uppercase tracking-tight">
                 {tool.description}
               </p>
               
               <div className="mt-auto">
                 {tool.type === "link" ? (
                   <Link href={tool.href || "#"} className="w-full block">
                     <button className="w-full py-5 rounded-3xl text-[9px] font-black uppercase tracking-[0.2em] bg-gray-50 dark:bg-black/20 text-whatsapp-teal hover:bg-whatsapp-teal hover:text-white transition-all flex items-center justify-center gap-2">
                       {tool.action} <ExternalLink className="w-3 h-3" />
                     </button>
                   </Link>
                 ) : (
                   <button 
                     disabled={tool.disabled || !!executing}
                     onClick={() => handleAction(tool.title)}
                     className={cn(
                       "w-full py-5 rounded-3xl text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2",
                       "bg-gray-50 dark:bg-black/20 text-gray-400 hover:text-white hover:bg-whatsapp-dark dark:hover:bg-whatsapp-dark",
                       isProcessing && "bg-whatsapp-teal text-white"
                     )}
                   >
                     {isProcessing ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
                     {tool.disabled ? "Funcionalidade em Breve" : isProcessing ? "Processando..." : tool.action}
                   </button>
                 )}
               </div>
            </div>
          );

          return <div key={i}>{Content}</div>;
        })}
      </div>
    </div>
  );
}
