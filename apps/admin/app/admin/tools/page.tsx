"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import { 
  Wrench, 
  Trash2, 
  Bot, 
  Send, 
  Database, 
  ShieldAlert, 
  Search,
  Zap,
  Ghost,
  Layout,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function ToolsPage() {
  const tools = [
    { 
      title: "Limpeza de Banco", 
      description: "Remove registros órfãos, logs antigos e otimiza tabelas de analytics.",
      icon: Database,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      action: "Executar Otimização"
    },
    { 
      title: "Scanner de Bots", 
      description: "Analisa padrões de comportamento (AI) para identificar contas automatizadas.",
      icon: Bot,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
      action: "Iniciar Scan"
    },
    { 
      title: "Teste de Notificação", 
      description: "Envia um push de teste para administradores para validar chaves Firebase.",
      icon: Send,
      color: "text-whatsapp-green",
      bg: "bg-whatsapp-green/10",
      action: "Enviar Teste"
    },
    { 
      title: "Audit Log Cleanup", 
      description: "Arquiva logs de moderadores com mais de 90 dias para economizar espaço.",
      icon: ShieldAlert,
      color: "text-red-500",
      bg: "bg-red-500/10",
      action: "Arquivar Agora"
    },
    { 
      title: "Cache Global Clear", 
      description: "Limpa o cache de borda (Vercel/CDN) para refletir mudanças globais.",
      icon: Zap,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
      action: "Limpar Cache"
    },
    { 
      title: "Shadow Ban Inspector", 
      description: "Verifica se usuários específicos estão sob algum filtro de visibilidade.",
      icon: Ghost,
      color: "text-whatsapp-teal",
      bg: "bg-whatsapp-teal/10",
      action: "Verificar Lista"
    },
    { 
      title: "UX & Interatividade", 
      description: "Gerencie o comportamento de ampliação de mídia e curtidas por cliques duplos (Fast Like).",
      icon: Layout,
      color: "text-pink-500",
      bg: "bg-pink-500/10",
      action: "Configurar UX"
    },
    { 
      title: "Gestão de Verificados", 
      description: "Analise solicitações pendentes e gerencie selos de autenticidade para líderes.",
      icon: ShieldCheck,
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      action: "Ver Solicitações"
    }
  ];

  return (
    <div className="pb-12">
      <PageHeader 
        title="Ferramentas Administrativas" 
        description="Utilitários avançados para manutenção e segurança da infraestrutura FéConecta."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool, i) => (
          <div key={i} className="bg-white dark:bg-whatsapp-darkLighter p-8 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow group hover:shadow-xl transition-all">
             <div className={cn("p-4 rounded-2xl w-fit mb-6", tool.bg)}>
                <tool.icon className={cn("w-6 h-6", tool.color)} />
             </div>
             <h4 className="font-bold dark:text-white text-lg mb-2">{tool.title}</h4>
             <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">
               {tool.description}
             </p>
             <button className={cn(
               "w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all",
               "bg-gray-100 dark:bg-whatsapp-dark text-gray-600 dark:text-gray-300 hover:bg-whatsapp-teal hover:text-white dark:hover:bg-whatsapp-teal"
             )}>
               {tool.action}
             </button>
          </div>
        ))}
      </div>
    </div>
  );
}
