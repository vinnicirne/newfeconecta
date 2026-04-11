"use client";

import React from "react";
import { Flame, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link href="/register" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-whatsapp-teal to-whatsapp-green flex items-center justify-center">
              <Flame className="w-5 h-5 text-white fill-white" />
            </div>
            <h1 className="text-lg font-bold">Política de Privacidade</h1>
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
            <h2 className="text-2xl font-black text-white mb-4">Política de Privacidade da FéConecta</h2>
            <p>
              A FéConecta valoriza e respeita a privacidade dos seus usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">1. Dados Coletados</h3>
            <p>Ao utilizar a FéConecta, coletamos os seguintes tipos de dados:</p>
            <div className="space-y-4 mt-3">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <h4 className="text-sm font-bold text-whatsapp-green mb-2">Dados Fornecidos pelo Usuário:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                  <li>Nome completo e sobrenome</li>
                  <li>Nome de usuário</li>
                  <li>Endereço de e-mail</li>
                  <li>Data de nascimento</li>
                  <li>Gênero</li>
                  <li>Igreja / Comunidade religiosa</li>
                  <li>Foto de perfil e banner</li>
                  <li>Biografia e links de redes sociais</li>
                </ul>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <h4 className="text-sm font-bold text-whatsapp-green mb-2">Dados Coletados Automaticamente:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm ml-2">
                  <li>Endereço IP e dados de geolocalização aproximada</li>
                  <li>Tipo de dispositivo e sistema operacional</li>
                  <li>Dados de uso e navegação na plataforma</li>
                  <li>Registros de acesso (logs), conforme exigência legal</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">2. Finalidade do Tratamento</h3>
            <p>Utilizamos seus dados pessoais para:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Criar e gerenciar sua conta na plataforma</li>
              <li>Personalizar sua experiência e exibir conteúdo relevante</li>
              <li>Enviar notificações e comunicações relacionadas ao serviço</li>
              <li>Garantir a segurança e integridade da plataforma</li>
              <li>Cumprir obrigações legais e regulatórias</li>
              <li>Realizar análises estatísticas e de uso (de forma anônima)</li>
              <li>Prevenir fraudes e atividades ilícitas</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">3. Base Legal</h3>
            <p>O tratamento de dados pessoais na FéConecta é fundamentado nas seguintes bases legais previstas na LGPD:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong>Consentimento do titular</strong> (Art. 7º, I)</li>
              <li><strong>Execução de contrato</strong> (Art. 7º, V)</li>
              <li><strong>Cumprimento de obrigação legal</strong> (Art. 7º, II)</li>
              <li><strong>Legítimo interesse</strong> (Art. 7º, IX)</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">4. Compartilhamento de Dados</h3>
            <p>
              Não vendemos, alugamos ou comercializamos seus dados pessoais. Seus dados podem ser compartilhados nas seguintes situações:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Com prestadores de serviço essenciais ao funcionamento da plataforma (ex: hospedagem, e-mail)</li>
              <li>Por determinação judicial ou cumprimento de obrigação legal</li>
              <li>Com sua autorização explícita para integração com serviços de terceiros</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">5. Armazenamento e Segurança</h3>
            <p>
              Seus dados são armazenados em servidores seguros com criptografia. Adotamos medidas técnicas e organizacionais adequadas para proteger suas informações contra acesso não autorizado, alteração, destruição ou divulgação indevida.
            </p>
            <p>
              Os dados são retidos pelo tempo necessário para cumprir as finalidades descritas nesta Política ou conforme exigido por lei.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">6. Seus Direitos (LGPD)</h3>
            <p>Como titular dos dados, você tem direito a:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              {[
                "Confirmar a existência de tratamento",
                "Acessar seus dados",
                "Corrigir dados incompletos ou desatualizados",
                "Solicitar a anonimização ou bloqueio de dados",
                "Solicitar a portabilidade dos dados",
                "Solicitar a eliminação dos dados",
                "Revogar o consentimento a qualquer momento",
                "Peticionar à ANPD (Autoridade Nacional)",
              ].map((right) => (
                <div key={right} className="flex items-start gap-2 bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-whatsapp-green mt-1.5 flex-shrink-0" />
                  <span className="text-sm">{right}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">7. Cookies e Tecnologias de Rastreamento</h3>
            <p>
              Utilizamos cookies e tecnologias semelhantes para melhorar a experiência do usuário, lembrar preferências e realizar análises de uso. Você pode gerenciar suas preferências de cookies nas configurações do seu navegador.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">8. Menores de Idade</h3>
            <p>
              A FéConecta não coleta intencionalmente dados de menores de 13 anos. Usuários entre 13 e 18 anos devem ter autorização dos pais ou responsáveis legais. Se tomarmos conhecimento de que dados de um menor foram coletados sem autorização, procederemos à eliminação imediata.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">9. Transferência Internacional de Dados</h3>
            <p>
              Seus dados podem ser processados em servidores localizados fora do Brasil. Nesses casos, garantimos que o nível de proteção atende aos padrões exigidos pela LGPD, através de cláusulas contratuais adequadas.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">10. Alterações na Política</h3>
            <p>
              Esta Política de Privacidade pode ser atualizada periodicamente para refletir mudanças em nossas práticas ou exigências legais. Notificaremos os usuários sobre alterações significativas por meio da plataforma ou por e-mail.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-bold text-white">11. Encarregado de Proteção de Dados (DPO)</h3>
            <p>
              Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento de dados pessoais, entre em contato com nosso Encarregado de Proteção de Dados:
            </p>
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mt-2">
              <p className="text-sm"><strong className="text-white">E-mail:</strong> <span className="text-whatsapp-green">privacidade@feconecta.com.br</span></p>
              <p className="text-sm mt-1"><strong className="text-white">Suporte:</strong> <span className="text-whatsapp-green">suporte@feconecta.com.br</span></p>
            </div>
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
