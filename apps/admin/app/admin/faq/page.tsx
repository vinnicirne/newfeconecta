"use client";

import React from "react";
import { PageHeader } from "@/components/page-header";
import { 
  HelpCircle, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  ChevronDown,
  ChevronUp,
  GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function FaqPage() {
  const [faqs, setFaqs] = React.useState([
    { id: 1, question: "Como funciona a FéConecta?", answer: "Somos uma rede social focada em adoração e conexão entre pessoas de fé...", category: "Geral", active: true },
    { id: 2, question: "Como faço para ser um criador PRO?", answer: "Você pode solicitar o selo PRO através das suas configurações de perfil...", category: "Monetização", active: true },
    { id: 3, question: "O que é o Shadow Ban?", answer: "Uma medida de moderação que limita o alcance de conteúdos que burlam as regras...", category: "Segurança", active: false },
  ]);

  return (
    <div className="pb-12">
      <PageHeader 
        title="Gestão de FAQ" 
        description="Controle as perguntas frequentes que aparecem para os usuários."
      >
        <button className="flex items-center gap-2 bg-whatsapp-teal text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-whatsapp-tealLight transition-all">
          <Plus className="w-4 h-4" /> Nova Pergunta
        </button>
      </PageHeader>

      {/* Categories & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Pesquise por perguntas ou palavras-chave..."
            className="w-full bg-white dark:bg-whatsapp-darkLighter border border-gray-100 dark:border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-whatsapp-green/20"
          />
        </div>
        <div className="flex gap-2">
           {["Todos", "Geral", "Monetização", "Segurança"].map((cat) => (
             <button key={cat} className={cn(
               "px-4 py-2 rounded-xl text-xs font-bold transition-all",
               cat === "Todos" ? "bg-whatsapp-teal text-white" : "bg-white dark:bg-whatsapp-darkLighter text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-white/5"
             )}>
               {cat}
             </button>
           ))}
        </div>
      </div>

      {/* FAQ List */}
      <div className="space-y-4">
        {faqs.map((faq) => (
          <div key={faq.id} className="bg-white dark:bg-whatsapp-darkLighter p-6 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow">
             <div className="flex items-start gap-4">
               <div className="text-gray-300 dark:text-gray-600 mt-1 cursor-move">
                 <GripVertical className="w-5 h-5" />
               </div>
               <div className="flex-1">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-whatsapp-teal dark:text-whatsapp-green uppercase tracking-widest">{faq.category}</span>
                    <div className="flex items-center gap-2">
                       <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all">
                         <Edit3 className="w-4 h-4 text-gray-400" />
                       </button>
                       <button className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all group">
                         <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                       </button>
                    </div>
                 </div>
                 <h4 className="font-bold dark:text-white mb-2">{faq.question}</h4>
                 <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">{faq.answer}</p>
                 
                 <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-4 rounded-full relative transition-all",
                      faq.active ? "bg-whatsapp-green" : "bg-gray-200 dark:bg-white/10"
                    )}>
                      <div className={cn(
                        "absolute top-1 w-2 h-2 rounded-full bg-white transition-all",
                        faq.active ? "right-1" : "left-1"
                      )} />
                    </div>
                    <span className="text-[10px] font-bold uppercase text-gray-400">
                      {faq.active ? "Visível no Site" : "Oculto"}
                    </span>
                 </div>
               </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
