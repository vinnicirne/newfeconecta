"use client";

import React from "react";
import { Shield, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
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
              <Shield className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold">Privacidade</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="space-y-8 text-gray-300 leading-relaxed">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">
              Última atualização: 12 de Abril de 2026
            </p>
            <h2 className="text-2xl font-black text-white mb-4">Política de Privacidade</h2>
            <p>
              Sua privacidade é nossa prioridade. Esta política explica como a FéConecta coleta, usa e protege seus dados em conformidade com a Lei Geral de Proteção de Dados (LGPD).
            </p>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">1. Dados Coletados</h3>
            <p>Coletamos informações que você fornece voluntariamente, como:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Nome, e-mail, e foto de perfil.</li>
              <li>Conteúdo que você publica (posts, áudios, vídeos).</li>
              <li>Informações de verificação ministerial (quando solicitado).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">2. Uso das Informações</h3>
            <p>Utilizamos seus dados para:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Fornecer e personalizar o feed social.</li>
              <li>Processar selos de verificação premium.</li>
              <li>Garantir a segurança da comunidade cristã.</li>
              <li>Comunicar atualizações importantes da plataforma.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">3. Compartilhamento de Dados</h3>
            <p>
              Não vendemos seus dados para terceiros. O compartilhamento ocorre apenas com provedores de serviço (como Mercado Pago para pagamentos ou Supabase para armazenamento) sob rigorosas cláusulas de confidencialidade.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">4. Seus Direitos</h3>
            <p>Você tem o direito de acessar, corrigir, portar ou excluir seus dados a qualquer momento através das configurações de perfil ou entrando em contato com nosso DPO (Data Protection Officer).</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">5. Segurança</h3>
            <p>
              Empregamos criptografia de ponta a ponta em conversas privadas e protocolos de segurança avançados em nossos servidores para proteger suas informações contra acessos não autorizados.
            </p>
          </section>

          <div className="border-t border-white/10 pt-8 mt-10 text-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} FéConecta. Sua fé, seus dados, protegidos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
