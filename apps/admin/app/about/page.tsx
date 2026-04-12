"use client";

import React from "react";
import { Users, ArrowLeft, Flame, Globe, Zap } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-whatsapp-teal to-whatsapp-green flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold">Sobre Nós</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="space-y-16 text-gray-300 leading-relaxed">
          {/* Hero Section */}
          <div className="space-y-6 pt-10">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-whatsapp-teal to-whatsapp-green p-0.5 shadow-2xl shadow-whatsapp-teal/20 mx-auto">
              <div className="w-full h-full rounded-[22px] bg-[#0a0a0a] flex items-center justify-center">
                <Flame className="w-10 h-10 text-whatsapp-green fill-whatsapp-green" />
              </div>
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-black text-white tracking-tight">Um Reino Conectado</h2>
              <p className="text-xl text-gray-400 max-w-xl mx-auto">
                A FéConecta é a primeira rede social focada exclusivamente na edificação, comunhão e expansão do Reino de Deus através da tecnologia.
              </p>
            </div>
          </div>

          {/* Mission/Vision */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <Globe className="w-6 h-6 text-whatsapp-teal" /> Nossa Missão
              </h3>
              <p>Proporcionar um ambiente digital seguro e inspirador onde cristãos de todo o mundo possam compartilhar sua fé, descobrir novos ministérios e crescer em comunidade.</p>
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                <Zap className="w-6 h-6 text-whatsapp-green" /> Tecnologia Cristã
              </h3>
              <p>Acreditamos que a tecnologia é uma ferramenta poderosa para o evangelismo. Por isso, desenvolvemos recursos de ponta para potencializar a voz da igreja no século XXI.</p>
            </div>
          </div>

          {/* Journey Section with Glassmorphism */}
          <section className="p-8 bg-white/5 rounded-[40px] border border-white/5 backdrop-blur-sm space-y-8">
            <h3 className="text-2xl font-black text-white text-center">Nossa Jornada</h3>
            <div className="relative space-y-12 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-whatsapp-teal/0 before:via-white/10 before:to-whatsapp-green/0">
              
              {/* Marco 1 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group animate-in slide-in-from-left duration-500">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-[#0a0a0a] text-whatsapp-teal font-bold shadow-xl shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                   1
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-[24px] bg-white/5 border border-white/5 backdrop-blur-md group-hover:bg-white/10 transition-all">
                  <h4 className="font-bold text-white mb-1">A Visão (2023)</h4>
                  <p className="text-sm text-gray-400">Nasceu o desejo de criar algo puro no meio do ruído digital. Uma visão de comunhão sem distrações mundanas.</p>
                </div>
              </div>

              {/* Marco 2 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group animate-in slide-in-from-right duration-500">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-[#0a0a0a] text-whatsapp-green font-bold shadow-xl shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                   2
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-[24px] bg-white/5 border border-white/5 backdrop-blur-md group-hover:bg-white/10 transition-all">
                  <h4 className="font-bold text-white mb-1">O Lançamento (2024)</h4>
                  <p className="text-sm text-gray-400">A FéConecta v1.0 é apresentada ao Brasil, conectando as primeiras igrejas e ministérios em um feed 100% cristão.</p>
                </div>
              </div>

              {/* Marco 3 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group animate-in slide-in-from-left duration-500">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-[#0a0a0a] text-whatsapp-teal font-bold shadow-xl shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                   3
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-[24px] bg-white/5 border border-white/5 backdrop-blur-md group-hover:bg-white/10 transition-all">
                  <h4 className="font-bold text-white mb-1">A Era da IA (2025)</h4>
                  <p className="text-sm text-gray-400">Integramos Agentes de Inteligência Artificial para suporte e moderação de conteúdo, protegendo a família digital.</p>
                </div>
              </div>

              {/* Marco 4 */}
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group animate-in slide-in-from-right duration-500">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-[#0a0a0a] text-whatsapp-green font-bold shadow-xl shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                   4
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-[24px] bg-white/5 border border-white/5 backdrop-blur-md group-hover:bg-white/10 transition-all">
                  <h4 className="font-bold text-white mb-1">Eternidade (2026)</h4>
                  <p className="text-sm text-gray-400">Nos tornamos o principal ecossistema digital do Reino, unindo tecnologia de ponta com valores inegociáveis.</p>
                </div>
              </div>

            </div>
          </section>

          <section className="text-center space-y-6 pb-20">
             <h3 className="text-2xl font-black text-white">Siga o Caminho</h3>
             <p className="text-gray-400">Junte-se a milhares de irmãos que já estão transformando sua experiência digital.</p>
             <div className="flex justify-center gap-4">
               <button className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all">Nossa Equipe</button>
               <button className="px-10 py-3 bg-whatsapp-teal hover:bg-whatsapp-tealLight rounded-xl font-bold transition-all shadow-xl shadow-whatsapp-teal/20">Criar Conta</button>
             </div>
          </section>
        </div>
      </div>
    </div>
  );
}
