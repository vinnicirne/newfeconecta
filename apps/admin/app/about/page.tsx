import React from "react";
import { Metadata } from "next";
import { ArrowLeft, Heart, Sparkles, Users, MessageCircle } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre Nós | FéConecta",
  description: "Não somos uma rede social. Somos um movimento. Conheça a história por trás da FéConecta.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-gray-900 dark:text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-gray-100 dark:border-white/5">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Sobre a FéConecta</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5">
        {/* Hero — Carta do Fundador */}
        <section className="pt-14 pb-12">
          {/* Eyebrow */}
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-500 mb-6">Nossa história</p>

          <h1 className="text-[2.6rem] leading-[1.1] font-black text-gray-900 dark:text-white tracking-tight mb-6">
            Não criamos uma plataforma.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-teal-400">
              Abrimos um espaço sagrado.
            </span>
          </h1>

          <p className="text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
            Em 2023, um grupo de cristãos que amava tecnologia se fez uma pergunta simples: <em className="text-gray-700 dark:text-gray-200 not-italic font-medium">por que nossas redes sociais nos afastam de Deus em vez de nos aproximar?</em>
          </p>
        </section>

        {/* Divisor com citação */}
        <blockquote className="border-l-4 border-green-400 pl-5 my-2 mb-12">
          <p className="text-xl font-semibold text-gray-800 dark:text-gray-100 leading-snug italic">
            "E perseveravam na doutrina dos apóstolos, e na comunhão..."
          </p>
          <cite className="text-sm text-gray-400 mt-2 block not-italic">— Atos 2:42</cite>
        </blockquote>

        {/* Corpo da carta */}
        <section className="space-y-5 text-gray-600 dark:text-gray-400 leading-relaxed text-[1.05rem] pb-14 border-b border-gray-100 dark:border-white/5">
          <p>
            As redes que existiam nos vendiam atenção. Cada scroll projetado para nos manter presos, consumindo conteúdo de tudo — menos do que realmente edifica.
          </p>
          <p>
            Então decidimos construir do zero. Não um produto. Um <strong className="text-gray-900 dark:text-white font-semibold">movimento digital</strong>. Um lugar onde você pode postar sua oração sem vergonha, descobrir uma célula do outro lado da cidade, ou simplesmente ler a palavra do dia sem anúncio de cerveja no meio.
          </p>
          <p>
            A FéConecta não nasceu de investidores ou de uma estratégia de mercado. Nasceu de uma necessidade real — <strong className="text-gray-900 dark:text-white font-semibold">a nossa mesma.</strong>
          </p>
        </section>

        {/* Valores */}
        <section className="py-14 space-y-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-500">O que nos move</p>
          <div className="space-y-8">
            <div className="group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-green-400/10 flex items-center justify-center shrink-0">
                  <Heart className="w-4 h-4 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Comunhão de verdade</h3>
              </div>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed pl-11">
                Aqui você não é um usuário. É um irmão. Cada recurso foi pensado para aproximar pessoas, não para criar dependência da tela.
              </p>
            </div>
            <div className="group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-teal-400/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Tecnologia a serviço do Reino</h3>
              </div>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed pl-11">
                Usamos o que há de mais moderno — IA, tempo real, notificações inteligentes — mas sempre com um único propósito: amplificar a voz das igrejas, não substituí-la.
              </p>
            </div>
            <div className="group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-amber-400/10 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Construído por quem usa</h3>
              </div>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed pl-11">
                Nossa equipe frequenta igrejas. Vai ao culto de quarta. Pede oração no grupo do WhatsApp. Isso muda tudo na forma como projetamos cada detalhe.
              </p>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="pb-14 border-t border-gray-100 dark:border-white/5 pt-14">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-500 mb-10">A jornada</p>
          <div className="space-y-0">
            {[
              {
                year: "2023",
                title: "A centelha",
                text: "Uma conversa após o culto. Um grupo de WhatsApp com memes de Biblia e uma pergunta: e se a gente fizesse algo de verdade?",
                color: "bg-green-400",
              },
              {
                year: "2024",
                title: "O primeiro commit",
                text: "Primeiras linhas de código. Primeiras igrejas testando. Primeiro pastor que chegou e disse: 'era isso que eu precisava.'",
                color: "bg-teal-400",
              },
              {
                year: "2025",
                title: "A comunidade cresce",
                text: "Ministérios, células, santuários de oração. A plataforma ganhou vida própria — os usuários nos ensinaram o que precisávamos construir.",
                color: "bg-emerald-400",
              },
              {
                year: "Hoje",
                title: "Você faz parte disso",
                text: "Cada perfil criado, cada oração compartilhada, cada conexão entre irmãos. Isso é a FéConecta — e ela é sua também.",
                color: "bg-green-400",
              },
            ].map((item, i, arr) => (
              <div key={i} className="flex gap-5">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${item.color} mt-1.5 shrink-0`} />
                  {i < arr.length - 1 && (
                    <div className="w-px flex-1 bg-gray-100 dark:bg-white/5 mt-2 mb-2" />
                  )}
                </div>
                <div className={`pb-10 ${i === arr.length - 1 ? "pb-0" : ""}`}>
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{item.year}</span>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white mt-0.5 mb-1">{item.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="pb-20 pt-4">
          <div className="bg-gradient-to-br from-green-500/10 to-teal-500/10 rounded-3xl p-8 text-center border border-green-500/10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-teal-400 flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">Quer falar com a gente?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-xs mx-auto leading-relaxed">
              Tem uma sugestão, um bug para reportar ou só quer mandar um salve? A gente lê tudo.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register" className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity shadow-lg shadow-green-500/20">
                Entrar para a comunidade
              </Link>
              <Link href="/" className="px-6 py-3 bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                Ver o feed
              </Link>
            </div>
          </div>
        </section>

        <div className="text-center pb-10 text-xs text-gray-300 dark:text-gray-600">
          Feito com fé, café e muita oração. 🙏
        </div>
      </div>
    </div>
  );
}
