"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import { 
  ShieldAlert, 
  MessageSquare, 
  Trash2, 
  CheckCircle, 
  AlertTriangle,
  Eye,
  UserX
} from "lucide-react";
import { cn } from "@/lib/utils";

const mockReports = [
  {
    id: "REP-001",
    user: "Carlos Mendes",
    type: "Discurso de Ódio",
    content: "Este é um exemplo de conteúdo que foi sinalizado automaticamente pela AI...",
    aiConfidence: 94,
    status: "pending",
    date: "Aguardando há 12m"
  },
  {
    id: "REP-002",
    user: "Anônimo",
    type: "Spam",
    content: "Ganhe dinheiro fácil clicando neste link agora mesmo! Promoção imperdível...",
    aiConfidence: 88,
    status: "pending",
    date: "Aguardando há 45m"
  },
  {
    id: "REP-003",
    user: "Fábio Souza",
    type: "Fake News",
    content: "Informação não verificada sobre eventos recentes que viola as diretrizes...",
    aiConfidence: 65,
    status: "pending",
    date: "Aguardando há 2h"
  }
];

export default function ReportsPage() {
  return (
    <div className="pb-12">
      <PageHeader 
        title="Moderação de Conteúdo" 
        description="Analise denúncias e mantenha a comunidade FéConecta segura."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-2xl border border-red-100 dark:border-red-500/20">
          <div className="flex items-center gap-3 mb-2">
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <h4 className="font-bold text-red-700 dark:text-red-400">Nível Crítico</h4>
          </div>
          <p className="text-2xl font-bold text-red-700 dark:text-red-400">12</p>
          <p className="text-xs text-red-600/70 dark:text-red-400/50">Confiança AI &gt; 90%</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-500/10 p-4 rounded-2xl border border-orange-100 dark:border-orange-500/20">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h4 className="font-bold text-orange-700 dark:text-orange-400">Revisão Necessária</h4>
          </div>
          <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">45</p>
          <p className="text-xs text-orange-600/70 dark:text-orange-400/50">Confiança AI entre 50-90%</p>
        </div>
        <div className="bg-whatsapp-green/10 p-4 rounded-2xl border border-whatsapp-green/20">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-whatsapp-green" />
            <h4 className="font-bold text-whatsapp-dark dark:text-whatsapp-green">Resolvidos Hoje</h4>
          </div>
          <p className="text-2xl font-bold text-whatsapp-dark dark:text-whatsapp-green">128</p>
          <p className="text-xs text-whatsapp-teal/70 dark:text-whatsapp-green/50">+15% vs ontem</p>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-4">
        {mockReports.map((report) => (
          <div key={report.id} className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-2 py-1 bg-gray-100 dark:bg-white/5 text-[10px] font-bold rounded uppercase tracking-wider text-gray-500">
                  {report.id}
                </span>
                <span className={cn(
                  "px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider",
                  report.aiConfidence > 90 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"
                )}>
                  IA Confidence: {report.aiConfidence}%
                </span>
                <span className="text-xs text-gray-400 ml-auto">{report.date}</span>
              </div>
              <h4 className="font-bold dark:text-white mb-2">{report.type}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-whatsapp-dark p-4 rounded-xl italic">
                "{report.content}"
              </p>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-whatsapp-teal/10 flex items-center justify-center text-[10px] font-bold text-whatsapp-teal">
                  {report.user.charAt(0)}
                </div>
                <span className="text-xs font-medium dark:text-gray-300">Denunciado por: <span className="text-whatsapp-teal dark:text-whatsapp-green">{report.user}</span></span>
              </div>
            </div>
            
            <div className="flex md:flex-col gap-2 justify-center">
              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-whatsapp-teal text-white rounded-xl text-xs font-bold hover:bg-whatsapp-tealLight transition-all">
                <CheckCircle className="w-4 h-4" /> Manter Post
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-all">
                <Trash2 className="w-4 h-4" /> Remover Conteúdo
              </button>
              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-white/20 transition-all">
                <UserX className="w-4 h-4" /> Banir Usuário
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
