"use client";

import React from "react";
import { Megaphone, ArrowLeft, Target, ShieldCheck, Heart } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdvertisingPage() {
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
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold">Publicidade</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="space-y-12 text-gray-300 leading-relaxed">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-white">Impulsione no Reino</h2>
            <p className="text-lg text-gray-400">
              Conecte sua marca, ministério ou evento com a maior audiência cristã digital do Brasil.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-white/5 rounded-[32px] border border-white/5 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-whatsapp-teal/20 flex items-center justify-center">
                <Target className="w-6 h-6 text-whatsapp-teal" />
              </div>
              <h3 className="text-xl font-bold text-white">Segmentação por Fé</h3>
              <p className="text-sm">Alcance o público certo baseando-se em interesses ministeriais, denominações e relevância regional.</p>
            </div>
            <div className="p-6 bg-white/5 rounded-[32px] border border-white/5 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-whatsapp-green/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-whatsapp-green" />
              </div>
              <h3 className="text-xl font-bold text-white">Anúncios Seguros</h3>
              <p className="text-sm">Nosso rigoroso sistema de moderação garante que todos os anúncios respeitem os valores cristãos da plataforma.</p>
            </div>
          </div>

          <section className="space-y-6">
            <h3 className="text-2xl font-black text-white">Nossos Compromissos</h3>
            <div className="space-y-4">
              <div className="flex gap-4 p-4 hover:bg-white/5 rounded-2xl transition-all border border-transparent hover:border-white/5 group">
                <Heart className="w-6 h-6 text-pink-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <h4 className="font-bold text-white">Publicidade Ética</h4>
                  <p className="text-sm">Não permitimos anúncios que promovam conteúdos inadequados, jogos de azar ou promessas irreais.</p>
                </div>
              </div>
              {/* Outros itens similares... */}
            </div>
          </section>

          <div className="p-8 bg-gradient-to-br from-whatsapp-teal/20 to-whatsapp-green/20 rounded-[40px] border border-whatsapp-teal/20 text-center space-y-6">
            <h3 className="text-2xl font-black text-white">Pronto para começar?</h3>
            <p className="text-gray-400">Nossos especialistas estão prontos para ajudar a desenhar sua estratégia de crescimento.</p>
            <button className="px-8 py-4 bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95">
              Falar com Comercial
            </button>
          </div>

          <div className="border-t border-white/10 pt-8 mt-10 text-center">
             <p className="text-gray-500 text-sm italic">FéConecta Ads - Conectando marcas à eternidade.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
