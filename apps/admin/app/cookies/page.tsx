"use client";

import React from "react";
import { Cookie, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CookiesPage() {
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
              <Cookie className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold">Cookies</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="space-y-8 text-gray-300 leading-relaxed">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">
              Transparência e Controle
            </p>
            <h2 className="text-2xl font-black text-white mb-4">Política de Cookies</h2>
            <p>
              Na FéConecta, utilizamos cookies para melhorar sua experiência, garantir a segurança e personalizar o conteúdo que você vê. Esta página detalha como e por que usamos essas tecnologias.
            </p>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">1. O que são Cookies?</h3>
            <p>
              Cookies são pequenos arquivos de texto armazenados no seu dispositivo (computador, celular ou tablet) quando você visita um site. Eles permitem que a plataforma lembre de suas ações e preferências ao longo do tempo.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">2. Categorias de Cookies que utilizamos</h3>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <h4 className="font-bold text-whatsapp-green mb-1">Essenciais</h4>
                <p className="text-sm">Necessários para que a plataforma funcione. Eles permitem a navegação e o acesso às áreas seguras. Sem eles, o login não seria possível.</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <h4 className="font-bold text-whatsapp-green mb-1">Funcionais</h4>
                <p className="text-sm">Lembram suas escolhas, como idioma selecionado ou preferências de tema (dark/light), para uma experiência mais personalizada.</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <h4 className="font-bold text-whatsapp-green mb-1">Analíticos</h4>
                <p className="text-sm">Ajudam-nos a entender como os usuários interagem com a FéConecta, identificando problemas técnicos e áreas que precisam de melhoria.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">3. Gestão de Preferências</h3>
            <p>
              Você pode controlar ou excluir os cookies através das configurações do seu navegador. Note que desativar cookies essenciais pode impedir que você utilize certas funcionalidades da plataforma.
            </p>
          </section>

          <div className="border-t border-white/10 pt-8 mt-10 text-center">
            <p className="text-gray-500 text-sm">
              Ao continuar navegando, você concorda com o uso de cookies conforme descrito nesta política.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
