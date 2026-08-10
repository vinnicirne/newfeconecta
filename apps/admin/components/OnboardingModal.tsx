"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Flame, Heart, BookOpen, Mic2, Sparkles, Users,
  ChevronRight, X, Sprout, MessageCircle, Shield, Globe
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const ONBOARD_KEY = "feconecta_onboard_v1_seen";

const slides = [
  {
    id: "welcome",
    gradient: "from-[#1a1a2e] via-[#0f2027] to-[#0a0a0a]",
    accentGradient: "from-[#3fff8b] to-[#00d4ff]",
    icon: Flame,
    iconBg: "bg-gradient-to-br from-[#3fff8b]/20 to-[#00d4ff]/20",
    iconColor: "text-[#3fff8b]",
    tag: "Bem-vindo",
    tagColor: "text-[#3fff8b] border-[#3fff8b]/30 bg-[#3fff8b]/10",
    title: "FéConecta",
    subtitle: "A rede social cristã",
    description:
      "Um lugar criado para conectar vidas através da fé. Aqui você compartilha, ora, cresce e se conecta com irmãos de todo o Brasil.",
    highlight: "Construído sobre a Palavra. Movido pelo Espírito.",
    highlightColor: "text-[#3fff8b]",
    visual: "cross",
  },
  {
    id: "feed",
    gradient: "from-[#0a0a1a] via-[#0d1117] to-[#0a0a0a]",
    accentGradient: "from-amber-400 to-orange-500",
    icon: Sparkles,
    iconBg: "bg-amber-400/10",
    iconColor: "text-amber-400",
    tag: "Feed",
    tagColor: "text-amber-400 border-amber-400/30 bg-amber-400/10",
    title: "Compartilhe\nsua fé",
    subtitle: "Testemunhos, orações e reflexões",
    description:
      "Publique o que Deus tem feito na sua vida. Curta, comente e ore junto com a comunidade. Cada publicação é uma semente plantada no Reino.",
    highlight: `"Anunciai as suas obras entre os povos." — Salmos 105:1`,
    highlightColor: "text-amber-400",
    visual: "feed",
  },
  {
    id: "bible",
    gradient: "from-[#0a1a0a] via-[#0d1a0d] to-[#0a0a0a]",
    accentGradient: "from-emerald-400 to-green-600",
    icon: BookOpen,
    iconBg: "bg-emerald-400/10",
    iconColor: "text-emerald-400",
    tag: "Bíblia Sagrada",
    tagColor: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
    title: "A Palavra\nao alcance",
    subtitle: "NVI, ACF, AA — sempre disponível",
    description:
      "Leia, pesquise e medite nas Escrituras a qualquer hora. A Bíblia completa, offline, com múltiplas versões integradas ao app.",
    highlight: `"Lâmpada para os meus pés é a tua palavra." — Salmos 119:105`,
    highlightColor: "text-emerald-400",
    visual: "bible",
  },
  {
    id: "guerra",
    gradient: "from-[#1a0a0a] via-[#1a0d0d] to-[#0a0a0a]",
    accentGradient: "from-red-400 to-rose-600",
    icon: Mic2,
    iconBg: "bg-red-400/10",
    iconColor: "text-red-400",
    tag: "Sala de Guerra",
    tagColor: "text-red-400 border-red-400/30 bg-red-400/10",
    title: "Ore em\ntempo real",
    subtitle: "Interceda ao vivo com a igreja",
    description:
      "Entre nas Salas de Guerra e interceda ao vivo com outros crentes. A oração coletiva que move montanhas — aqui e agora.",
    highlight: `"Onde dois ou três estiverem reunidos..." — Mateus 18:20`,
    highlightColor: "text-red-400",
    visual: "guerra",
  },
  {
    id: "community",
    gradient: "from-[#0a0a1a] via-[#0a0d1a] to-[#0a0a0a]",
    accentGradient: "from-purple-400 to-indigo-500",
    icon: Users,
    iconBg: "bg-purple-400/10",
    iconColor: "text-purple-400",
    tag: "Comunidade",
    tagColor: "text-purple-400 border-purple-400/30 bg-purple-400/10",
    title: "Conectados\npela fé",
    subtitle: "Siga, mensagens, tribos",
    description:
      "Siga líderes e irmãos. Envie mensagens privadas. Participe das Tribos — grupos de interesse dentro da comunidade cristã.",
    highlight: `"Para que sejam um, assim como nós somos um." — João 17:22`,
    highlightColor: "text-purple-400",
    visual: "community",
  },
  {
    id: "cta",
    gradient: "from-[#0a1a0a] via-[#051a0d] to-[#0a0a0a]",
    accentGradient: "from-[#3fff8b] to-[#00d4ff]",
    icon: Heart,
    iconBg: "bg-gradient-to-br from-[#3fff8b]/20 to-[#00d4ff]/10",
    iconColor: "text-[#3fff8b]",
    tag: "Pronto!",
    tagColor: "text-[#3fff8b] border-[#3fff8b]/30 bg-[#3fff8b]/10",
    title: "Seja bem-vindo\nà família",
    subtitle: "O Reino te espera aqui",
    description:
      "Tudo pronto para começar. Explore o feed, leia a Palavra, ore com a comunidade. O FéConecta é a sua casa espiritual digital.",
    highlight: "Que Deus abençoe cada passo da sua jornada aqui. 🙏",
    highlightColor: "text-[#3fff8b]",
    visual: "cta",
  },
];

function SlideVisual({ type, accent }: { type: string; accent: string }) {
  if (type === "cross") {
    return (
      <div className="relative w-full flex items-center justify-center py-8">
        <div className="relative">
          <div
            className="w-16 h-40 rounded-full opacity-30 blur-2xl absolute -inset-8"
            style={{ background: "linear-gradient(to bottom, #3fff8b, #00d4ff)" }}
          />
          <div className="relative w-6 h-24 bg-gradient-to-b from-[#3fff8b] to-[#00d4ff] rounded-full shadow-lg shadow-[#3fff8b]/30" />
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-16 h-6 bg-gradient-to-r from-[#3fff8b] to-[#00d4ff] rounded-full shadow-lg shadow-[#3fff8b]/30" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-[#3fff8b]/40"
              style={{
                top: `${20 + Math.sin((i * Math.PI * 2) / 8) * 35}%`,
                left: `${50 + Math.cos((i * Math.PI * 2) / 8) * 35}%`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === "feed") {
    return (
      <div className="w-full space-y-2 px-2 py-4">
        {[
          { name: "Ana Lima", text: "Deus tem sido tão fiel!", color: "bg-amber-400/20 border-amber-400/30" },
          { name: "Pedro S.", text: "Oração respondida 🙏", color: "bg-emerald-400/20 border-emerald-400/30" },
          { name: "Maria C.", text: "A bênção chegou hoje!", color: "bg-purple-400/20 border-purple-400/30" },
        ].map((card, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 p-3 rounded-2xl border ${card.color} backdrop-blur-sm`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-xs font-black text-white">
              {card.name[0]}
            </div>
            <div>
              <p className="text-[10px] text-white/50 font-bold">{card.name}</p>
              <p className="text-xs text-white/80 font-medium">{card.text}</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <Heart className="w-3 h-3 text-rose-400" />
              <span className="text-[10px] text-white/40">12</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "bible") {
    return (
      <div className="w-full px-2 py-4">
        <div className="bg-white/5 border border-emerald-400/20 rounded-2xl p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Salmos 23</span>
          </div>
          <p className="text-sm text-white/80 leading-relaxed italic">
            "O Senhor é o meu pastor; nada me faltará. Deitar-me faz em verdes pastos..."
          </p>
          <div className="flex gap-2 mt-3">
            {["NVI", "ACF", "AA"].map((v) => (
              <span key={v} className="text-[10px] font-black px-2 py-1 rounded-lg bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                {v}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === "guerra") {
    return (
      <div className="w-full flex items-center justify-center py-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-400/40 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-red-500/30 border-2 border-red-400/60 flex items-center justify-center">
              <Mic2 className="w-6 h-6 text-red-400" />
            </div>
          </div>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-full border border-red-400/20 animate-ping"
              style={{ animationDelay: `${i * 0.5}s`, animationDuration: "2s" }}
            />
          ))}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-red-400/60"
                style={{
                  height: `${8 + Math.random() * 12}px`,
                  animation: `pulse 0.${3 + i}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === "community") {
    return (
      <div className="w-full py-4 flex items-center justify-center">
        <div className="relative w-40 h-24">
          {[
            { x: "50%", y: "50%", label: "Você", size: "w-12 h-12", z: 10 },
            { x: "15%", y: "20%", label: "Ana", size: "w-9 h-9", z: 5 },
            { x: "80%", y: "15%", label: "João", size: "w-9 h-9", z: 5 },
            { x: "10%", y: "70%", label: "Maria", size: "w-8 h-8", z: 5 },
            { x: "85%", y: "72%", label: "Pedro", size: "w-8 h-8", z: 5 },
          ].map((node, i) => (
            <div
              key={i}
              className={`absolute -translate-x-1/2 -translate-y-1/2 ${node.size} rounded-full bg-purple-400/20 border-2 border-purple-400/40 flex items-center justify-center`}
              style={{ left: node.x, top: node.y, zIndex: node.z }}
            >
              <span className="text-[8px] font-black text-purple-300">{node.label[0]}</span>
            </div>
          ))}
          {/* Connection lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 1 }}>
            {[
              [50, 50, 15, 20], [50, 50, 80, 15],
              [50, 50, 10, 70], [50, 50, 85, 72],
            ].map(([x1, y1, x2, y2], i) => (
              <line
                key={i}
                x1={`${x1}%`} y1={`${y1}%`}
                x2={`${x2}%`} y2={`${y2}%`}
                stroke="rgba(167,139,250,0.2)" strokeWidth="1"
              />
            ))}
          </svg>
        </div>
      </div>
    );
  }

  // cta
  return (
    <div className="w-full flex items-center justify-center py-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3fff8b]/20 to-[#00d4ff]/10 border border-[#3fff8b]/30 flex items-center justify-center">
          <Heart className="w-8 h-8 text-[#3fff8b] fill-[#3fff8b]/30" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
          <Sparkles className="w-3 h-3 text-amber-400" />
        </div>
        <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-purple-400/20 border border-purple-400/40 flex items-center justify-center">
          <BookOpen className="w-3 h-3 text-purple-400" />
        </div>
      </div>
    </div>
  );
}

export function OnboardingModal() {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [direction, setDirection] = useState<"next" | "prev">("next");

  useEffect(() => {
    // Pequeno delay para não bloquear o carregamento inicial
    const timer = setTimeout(async () => {
      const seen = localStorage.getItem(ONBOARD_KEY);
      if (!seen) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) setVisible(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(ONBOARD_KEY, "1");
    setVisible(false);
  }, []);

  const goTo = useCallback((index: number, dir: "next" | "prev" = "next") => {
    if (animating) return;
    setAnimating(true);
    setDirection(dir);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 200);
  }, [animating]);

  const next = useCallback(() => {
    if (current === slides.length - 1) { dismiss(); return; }
    goTo(current + 1, "next");
  }, [current, dismiss, goTo]);

  const prev = useCallback(() => {
    if (current === 0) return;
    goTo(current - 1, "prev");
  }, [current, goTo]);

  if (!visible) return null;

  const slide = slides[current];
  const Icon = slide.icon;
  const isLast = current === slides.length - 1;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col" style={{ fontFamily: "'Outfit', sans-serif" }}>
      {/* Background */}
      <div className={`absolute inset-0 bg-gradient-to-b ${slide.gradient} transition-all duration-500`} />
      
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")"
      }} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-6 pb-2" style={{ paddingTop: 'max(env(safe-area-inset-top), 48px)' }}>
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#3fff8b]/20 to-[#00d4ff]/10 border border-[#3fff8b]/30 flex items-center justify-center">
            <Flame className="w-4 h-4 text-[#3fff8b]" />
          </div>
          <span className="text-sm font-black text-white/50 tracking-tight">FéConecta</span>
        </div>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={dismiss}
            className="flex items-center gap-1 text-xs font-bold text-white/30 hover:text-white/60 transition-colors px-3 py-1.5 rounded-xl hover:bg-white/5"
          >
            Pular <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Progress dots */}
      <div className="relative z-10 flex items-center justify-center gap-2 mt-4">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > current ? "next" : "prev")}
            className="transition-all duration-300 rounded-full"
            style={{
              width: i === current ? "24px" : "6px",
              height: "6px",
              background: i === current
                ? "linear-gradient(to right, #3fff8b, #00d4ff)"
                : i < current
                ? "rgba(255,255,255,0.3)"
                : "rgba(255,255,255,0.1)",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div
        className="relative z-10 flex-1 flex flex-col px-6 pt-6 pb-4"
        style={{
          opacity: animating ? 0 : 1,
          transform: animating
            ? `translateX(${direction === "next" ? "-20px" : "20px"})`
            : "translateX(0)",
          transition: "all 0.2s ease-out",
        }}
      >
        {/* Tag */}
        <div className="mb-4">
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full border ${slide.tagColor}`}>
            <Icon className="w-3 h-3" />
            {slide.tag}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-black text-white tracking-tight leading-[1.1] mb-2" style={{ whiteSpace: "pre-line" }}>
          {slide.title}
        </h1>

        {/* Subtitle */}
        <p className="text-sm font-bold text-white/40 uppercase tracking-widest mb-6">
          {slide.subtitle}
        </p>

        {/* Visual */}
        <div className="flex-1 flex items-center justify-center min-h-0 max-h-48">
          <div className="w-full max-w-xs">
            <SlideVisual type={slide.visual} accent={slide.accentGradient} />
          </div>
        </div>

        {/* Description */}
        <p className="text-base text-white/70 leading-relaxed mb-4">
          {slide.description}
        </p>

        {/* Highlight quote */}
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 mb-6">
          <p className={`text-xs font-bold italic leading-relaxed ${slide.highlightColor}`}>
            {slide.highlight}
          </p>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="relative z-10 px-6 pt-4" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 48px)' }}>
        <div className="flex items-center gap-3">
          {/* Back button */}
          {current > 0 && (
            <button
              onClick={prev}
              className="w-12 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/10 transition-all active:scale-95"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
          )}

          {/* Next / CTA button */}
          <button
            onClick={next}
            className="flex-1 h-14 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-2xl"
            style={{
              background: isLast
                ? "linear-gradient(135deg, #3fff8b, #00d4ff)"
                : "linear-gradient(135deg, #3fff8b 0%, #00d4ff 100%)",
              color: "#0a1a0a",
              boxShadow: "0 8px 32px rgba(63,255,139,0.25)",
            }}
          >
            {isLast ? (
              <>
                <Heart className="w-4 h-4 fill-current" />
                Entrar na Comunidade
              </>
            ) : (
              <>
                Próximo
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Slide counter */}
        <p className="text-center text-[10px] text-white/20 font-bold mt-3 uppercase tracking-widest">
          {current + 1} de {slides.length}
        </p>
      </div>
    </div>
  );
}
