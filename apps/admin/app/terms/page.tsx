"use client";

import React from "react";
import { Flame, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TermsPage() {
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
              <Flame className="w-5 h-5 text-white fill-white" />
            </div>
            <h1 className="text-lg font-bold">Termos de Uso</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="space-y-8 text-gray-300 leading-relaxed">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-2">
              Última atualização: 10 de Abril de 2026
            </p>
            <h2 className="text-2xl font-black text-white mb-4">Termos de Uso da Plataforma FéConecta</h2>
            <p>
              Bem-vindo(a) à FéConecta! Ao acessar e utilizar nossa plataforma, você concorda com os presentes Termos de Uso. Leia-os atentamente.
            </p>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">1. Aceitação dos Termos</h3>
            <p>
              Ao criar uma conta ou utilizar qualquer funcionalidade da FéConecta, você declara que leu, compreendeu e aceita integralmente estes Termos de Uso e nossa Política de Privacidade. Caso não concorde com qualquer disposição, você não deverá utilizar a plataforma.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">2. Sobre a Plataforma</h3>
            <p>
              A FéConecta é uma rede social voltada para a comunidade cristã, com o objetivo de conectar pessoas de fé, igrejas e ministérios em um ambiente seguro e edificante. Nossa missão é ser um lugar de adoração e comunhão digital.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">3. Elegibilidade</h3>
            <p>
              Para utilizar a FéConecta, você deve ter no mínimo 13 anos de idade. Menores de 18 anos devem ter autorização dos pais ou responsáveis legais. Ao criar uma conta, você declara que as informações fornecidas são verdadeiras e atualizadas.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">4. Conta do Usuário</h3>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Você é responsável por manter a confidencialidade de suas credenciais de acesso.</li>
              <li>Cada pessoa pode possuir apenas uma conta na plataforma.</li>
              <li>O nome de usuário escolhido não pode violar direitos de terceiros ou conter termos ofensivos.</li>
              <li>Você é responsável por todas as atividades realizadas em sua conta.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">5. Conduta do Usuário</h3>
            <p>Ao utilizar a FéConecta, você se compromete a:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Não publicar conteúdo ilegal, ofensivo, difamatório, obsceno ou que incite violência.</li>
              <li>Não praticar assédio, bullying, discriminação ou qualquer forma de intimidação.</li>
              <li>Não utilizar a plataforma para fins comerciais não autorizados, spam ou propaganda enganosa.</li>
              <li>Não compartilhar informações pessoais de terceiros sem consentimento.</li>
              <li>Respeitar os direitos autorais e propriedade intelectual.</li>
              <li>Contribuir para um ambiente respeitoso, baseado em valores cristãos de amor, respeito e edificação mútua.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">6. Conteúdo do Usuário</h3>
            <p>
              Ao publicar conteúdo na FéConecta (textos, imagens, vídeos, áudios), você concede à plataforma uma licença não exclusiva, mundial, gratuita e transferível para usar, reproduzir, distribuir e exibir tal conteúdo no âmbito dos serviços da plataforma. Você mantém todos os direitos de propriedade sobre o conteúdo original.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">7. Moderação e Remoção de Conteúdo</h3>
            <p>
              A FéConecta reserva-se o direito de remover, a seu critério, qualquer conteúdo que viole estes Termos ou que seja reportado por outros usuários. A recorrência de violações pode resultar em suspensão temporária ou permanente da conta.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">8. Propriedade Intelectual</h3>
            <p>
              Todo o conteúdo e funcionalidades da plataforma FéConecta, incluindo design, logotipos, textos e código-fonte, são protegidos por direitos autorais e não podem ser copiados, reproduzidos ou distribuídos sem autorização expressa.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">9. Limitação de Responsabilidade</h3>
            <p>
              A FéConecta é fornecida &quot;como está&quot;, sem garantias de qualquer tipo. Não nos responsabilizamos por danos diretos, indiretos, incidentais ou consequenciais decorrentes do uso da plataforma, incluindo perda de dados ou interrupção de serviço.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">10. Modificações dos Termos</h3>
            <p>
              Podemos atualizar estes Termos de Uso periodicamente. Notificaremos os usuários sobre mudanças significativas através da plataforma ou por e-mail. O uso continuado após as alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">11. Encerramento da Conta</h3>
            <p>
              Você pode solicitar o encerramento da sua conta a qualquer momento. A FéConecta pode encerrar ou suspender sua conta em caso de violação destes Termos, sem necessidade de aviso prévio.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">12. Legislação Aplicável</h3>
            <p>
              Estes Termos são regidos pela legislação brasileira, incluindo o Marco Civil da Internet (Lei nº 12.965/2014), a Lei Geral de Proteção de Dados (Lei nº 13.709/2018) e o Código de Defesa do Consumidor (Lei nº 8.078/1990). Eventuais disputas serão submetidas ao foro da comarca de domicílio do usuário.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">13. Contato</h3>
            <p>
              Para dúvidas ou solicitações relacionadas a estes Termos de Uso, entre em contato através do e-mail: <span className="text-whatsapp-green font-bold">suporte@feconecta.com.br</span>.
            </p>
          </section>

          <div className="border-t border-white/10 pt-8 mt-10 text-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} FéConecta. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
