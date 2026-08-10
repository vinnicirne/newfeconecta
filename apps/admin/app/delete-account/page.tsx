"use client";

import React, { useState } from "react";
import { Trash2, ArrowLeft, Mail, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DeleteAccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulando envio de solicitação
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsLoading(false);
    setIsSubmitted(true);
  };

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
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h1 className="text-lg font-bold">Exclusão de Conta</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        {!isSubmitted ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div>
              <h2 className="text-3xl font-black text-white mb-4">Solicitar Exclusão de Conta</h2>
              <p className="text-gray-400 leading-relaxed">
                Lamentamos ver você partir. Se você decidir excluir sua conta na <span className="text-whatsapp-green font-bold">FéConecta</span>, seguiremos todos os protocolos de segurança e privacidade para garantir a remoção definitiva dos seus dados.
              </p>
            </div>

            {/* Warning Box */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 flex gap-4">
              <div className="shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="font-bold text-red-500">O que acontece ao excluir sua conta?</h3>
                <ul className="text-sm text-gray-400 space-y-2 list-disc list-inside">
                  <li>Seu perfil e dados pessoais serão removidos permanentemente.</li>
                  <li>Todos os seus posts, comentários e mídias serão apagados.</li>
                  <li>Sua lista de amigos e conexões será desfeita.</li>
                  <li>Esta ação é <span className="text-white font-bold">irreversível</span> após o processamento.</li>
                </ul>
              </div>
            </div>

            <section className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Formulário de Solicitação</h3>
                <p className="text-sm text-gray-400">
                  Preencha os dados abaixo para que possamos validar e processar sua solicitação em até 30 dias.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-gray-400">E-mail associado à conta</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="exemplo@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-whatsapp-green/50 transition-all h-12"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="reason" className="text-sm font-medium text-gray-400">Motivo da exclusão (opcional)</label>
                  <textarea
                    id="reason"
                    rows={4}
                    placeholder="Nos conte por que deseja excluir sua conta. Feedbacks nos ajudam a melhorar."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full rounded-md bg-white/5 border border-white/10 p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-whatsapp-green/50 transition-all"
                  />
                </div>

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 rounded-xl transition-all shadow-lg shadow-red-900/20"
                  >
                    {isLoading ? "Processando..." : "Confirmar Solicitação de Exclusão"}
                  </Button>
                </div>
              </form>
            </section>

            <div className="border-t border-white/5 pt-8">
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/5">
                <Mail className="w-5 h-5 text-whatsapp-green mt-1" />
                <div className="space-y-1">
                  <p className="text-sm font-bold">Precisa de ajuda imediata?</p>
                  <p className="text-sm text-gray-400">
                    Você também pode solicitar a exclusão enviando um e-mail para <span className="text-whatsapp-green">contato@feconecta.com.br</span> com o assunto "Exclusão de Dados".
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center space-y-6 animate-in zoom-in duration-500">
            <div className="w-20 h-20 rounded-full bg-whatsapp-green/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-whatsapp-green" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-white">Solicitação Recebida</h2>
              <p className="text-gray-400 max-w-sm mx-auto">
                Sua solicitação foi registrada com sucesso. Iniciaremos o processamento e sua conta será removida permanentemente em até 30 dias.
              </p>
            </div>
            <Button 
              onClick={() => router.push("/")}
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-white"
            >
              Voltar ao Início
            </Button>
          </div>
        )}

        <div className="border-t border-white/5 pt-8 mt-10 text-center">
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} FéConecta. Seus dados são processados de acordo com a LGPD.
          </p>
        </div>
      </div>
    </div>
  );
}
