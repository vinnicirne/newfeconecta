"use client";

import React, { useState } from "react";
import { HelpCircle, ArrowLeft, Bot, MessageSquare, ChevronDown, ChevronUp, Sparkles, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const FAQ_ITEMS = [
  {
    q: "Como faço para verificar meu perfil ministerial?",
    a: "Para obter o selo de verificação premium, acesse seu perfil, clique no menu de opções e selecione 'Solicitar Verificação'. Você precisará confirmar sua identidade ministerial e realizar o pagamento da taxa de manutenção."
  },
  {
    q: "Quais são os documentos aceitos para líderes?",
    a: "Aceitamos RG ou CNH para identificação pessoal e sua Credencial Ministerial oficial emitida por sua denominação ou convenção para validação do cargo."
  },
  {
    q: "A FéConecta cobra mensalidade?",
    a: "A plataforma é gratuita para todos os membros. Oferecemos apenas o serviço de verificação premium que possui uma taxa de adesão e manutenção para garantir a segurança da nossa rede."
  },
  {
    q: "Como posso denunciar um conteúdo impróprio?",
    a: "Em cada publicação, há um ícone de três pontos onde você pode selecionar 'Denunciar'. Nossos moderadores e agentes de IA analisam as denúncias 24 horas por dia."
  },
  {
    q: "Como funcionam os agentes de IA na ajuda?",
    a: "Nossa central de ajuda é alimentada pelos Agentes de IA FéConecta. Eles utilizam processamento de linguagem natural para entender suas dúvidas e fornecer respostas precisas e imediatas baseadas em nossos termos e políticas."
  }
];

export default function HelpPage() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header with AI Badge */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-white/5 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-whatsapp-teal to-whatsapp-green flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold">Faq & Ajuda</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-whatsapp-teal/10 border border-whatsapp-teal/20 rounded-full">
            <Sparkles className="w-3 h-3 text-whatsapp-teal animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-whatsapp-teal">Powered by AI</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-12">
        {/* AI Agent Banner */}
        <div className="p-8 bg-gradient-to-br from-[#111] to-[#0a0a0a] rounded-[40px] border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Bot className="w-32 h-32" />
          </div>
          <div className="relative z-10 space-y-4">
             <div className="w-12 h-12 rounded-2xl bg-whatsapp-teal flex items-center justify-center shadow-lg shadow-whatsapp-teal/20">
               <Bot className="w-7 h-7 text-white" />
             </div>
             <h2 className="text-2xl font-black text-white">Suporte Inteligente</h2>
             <p className="text-gray-400 max-w-md">
               Todas as suas dúvidas abaixo são processadas e respondidas pelos nossos **Agentes de IA**. Se precisar de algo mais complexo, nossa equipe humana está a um clique de distância.
             </p>
          </div>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" /> Perguntas Frequentes
          </h3>
          
          {FAQ_ITEMS.map((item, index) => (
            <div 
              key={index}
              className={cn(
                "rounded-[28px] border transition-all duration-300",
                openIndex === index 
                  ? "bg-white/5 border-white/10 p-6" 
                  : "bg-transparent border-white/5 p-4 hover:bg-white/5"
              )}
            >
              <button 
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between text-left"
              >
                <span className={cn(
                  "font-bold text-sm md:text-base transition-colors",
                  openIndex === index ? "text-whatsapp-green" : "text-white"
                )}>{item.q}</span>
                {openIndex === index ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
              </button>
              
              {openIndex === index && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <p className="text-sm text-gray-400 leading-relaxed italic">
                    <span className="text-whatsapp-teal font-black text-[10px] uppercase tracking-widest mr-2">Resposta da IA:</span>
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still need help? */}
        <section className="text-center space-y-6 pt-10 pb-20">
           <div className="inline-flex p-4 bg-white/5 rounded-full mb-4">
             <MessageSquare className="w-8 h-8 text-whatsapp-teal" />
           </div>
           <h3 className="text-2xl font-black text-white">Ainda precisa de ajuda?</h3>
           <p className="text-gray-400">Nossos agentes humanos estão disponíveis para casos específicos.</p>
           <button 
             onClick={() => window.location.href = 'mailto:suporte@feconecta.com.br'}
             className="px-8 py-4 bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-whatsapp-teal/20"
           >
             Falar com um Humano
           </button>
        </section>
      </div>
    </div>
  );
}
