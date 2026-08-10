"use client";

import React from "react";
import { ArrowLeft, Heart, Sprout, Grape, Building, CheckCircle2, Flame, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SemeiPage() {
  const router = useRouter();

  const tiers = [
    {
      name: "Semente de Esperança",
      price: "10,00",
      icon: Sprout,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/20",
      gradient: "from-emerald-400 to-emerald-600",
      link: "https://pay.kiwify.com.br/HggmZy6",
      benefits: [
        "Apoie a manutenção dos servidores",
        "Ajude a espalhar a Palavra",
        "Regue esta obra"
      ]
    },
    {
      name: "Fruto Abundante",
      price: "50,00",
      icon: Grape,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
      border: "border-purple-400/30",
      gradient: "from-purple-400 to-purple-600",
      link: "https://pay.kiwify.com.br/gpX45T9",
      popular: true,
      benefits: [
        "Acelere o desenvolvimento de recursos",
        "Permita alcance a mais vidas",
        "Multiplique nossa capacidade técnica",
        "Sementeira de abundância"
      ]
    },
    {
      name: "Pilar da Obra",
      price: "100,00",
      icon: Building,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-400/20",
      gradient: "from-amber-400 to-amber-600",
      link: "https://pay.kiwify.com.br/h1JgZPQ",
      benefits: [
        "Sustente a base da nossa fundação",
        "Garanta a estabilidade de longo prazo",
        "Impacto direto na segurança do app",
        "Seja um parceiro master"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header Fixo */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Heart className="w-4 h-4 text-white fill-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight leading-none">Semear</h1>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-0.5">Propósito Maior</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 pb-24">
        {/* Hero Section */}
        <div className="text-center space-y-6 max-w-2xl mx-auto mb-16 animate-in slide-in-from-bottom duration-700 fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-widest mb-2">
            <Flame className="w-4 h-4" /> Expandindo o Reino
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.1]">
            Ajude a multiplicar <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400">
              esta obra.
            </span>
          </h2>
          <p className="text-lg text-gray-400 leading-relaxed">
            O FéConecta nasceu com um propósito: unir vidas e espalhar a Palavra. Hoje, você pode plantar uma semente e nos ajudar a manter e expandir este propósito para milhares de pessoas.
          </p>
        </div>

        {/* Pricing Tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {tiers.map((tier, idx) => {
            const Icon = tier.icon;
            
            return (
              <div 
                key={tier.name}
                className={`relative flex flex-col p-8 rounded-[32px] bg-white/[0.02] border backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 hover:bg-white/[0.04] ${tier.border} ${tier.popular ? 'md:-mt-4 md:mb-4 shadow-2xl shadow-purple-500/10' : ''} animate-in slide-in-from-bottom duration-500 fade-in fill-mode-both`}
                style={{ animationDelay: `${idx * 150}ms` }}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg shadow-purple-500/20">
                    Mais Escolhida
                  </div>
                )}
                
                <div className={`w-14 h-14 rounded-2xl ${tier.bg} flex items-center justify-center mb-6`}>
                  <Icon className={`w-7 h-7 ${tier.color}`} />
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-sm font-bold text-gray-500">R$</span>
                  <span className="text-4xl font-black text-white">{tier.price}</span>
                </div>
                
                <div className="space-y-4 flex-1 mb-8">
                  {tier.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className={`w-5 h-5 shrink-0 ${tier.color}`} />
                      <span className="text-sm text-gray-300 font-medium leading-tight pt-0.5">{benefit}</span>
                    </div>
                  ))}
                </div>
                
                <a 
                  href={tier.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r ${tier.gradient} text-white font-bold transition-all hover:opacity-90 hover:scale-[1.02] active:scale-95 shadow-lg shadow-white/5`}
                >
                  Semear Agora <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-16 text-center max-w-xl mx-auto animate-in slide-in-from-bottom duration-700 fade-in delay-500">
          <p className="text-sm text-gray-500 font-medium">
            "Cada um dê conforme determinou em seu coração, não com pesar ou por obrigação, pois Deus ama quem dá com alegria." <br />
            <span className="text-gray-400 font-bold mt-2 inline-block">2 Coríntios 9:7</span>
          </p>
        </div>
      </div>
    </div>
  );
}
