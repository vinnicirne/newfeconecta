"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Gamepad2, 
  Sparkles, 
  Flame, 
  Trophy, 
  BrainCircuit, 
  Layers, 
  ChevronRight, 
  ArrowLeft,
  Star,
  Zap,
  BookOpen,
  Award,
  Crown
} from "lucide-react";
import BottomNav from "@/components/feed/BottomNav";
import { getStoredProfile } from "@/lib/profile-cache";
import { motion } from "framer-motion";

export default function GamesHubPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(() => getStoredProfile());
  const [userXp, setUserXp] = useState<number>(0);
  const [gamesPlayed, setGamesPlayed] = useState<number>(0);

  useEffect(() => {
    const cached = getStoredProfile();
    if (cached) setProfile(cached);

    // Carrega estatísticas do localStorage
    if (typeof window !== "undefined") {
      const savedXp = parseInt(localStorage.getItem("fc_games_xp") || "350", 10);
      const savedGames = parseInt(localStorage.getItem("fc_games_played") || "4", 10);
      setUserXp(savedXp);
      setGamesPlayed(savedGames);
    }
  }, []);

  const games = [
    {
      id: "quiz",
      title: "Quiz Bíblico do Dia",
      subtitle: "Desafio de 5 perguntas cronometradas",
      badge: "🔥 Mais Jogado",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      description: "Teste seu conhecimento bíblico com perguntas dinâmicas do Antigo e Novo Testamento. Ganhe XP e compartilhe no feed.",
      icon: BrainCircuit,
      color: "from-amber-500/20 via-orange-500/10 to-transparent",
      borderColor: "border-amber-500/30 hover:border-amber-400/60",
      iconColor: "text-amber-400 bg-amber-500/20",
      href: "/jogos/quiz",
      buttonText: "Jogar Quiz"
    },
    {
      id: "memoria",
      title: "Jogo da Memória Sagrado",
      subtitle: "Encontre os pares dos símbolos da Fé",
      badge: "✨ Relaxante",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      description: "Desafie sua mente combinando Arca da Aliança, Leão de Judá, Sarça Ardente, Peixe, Cruz e outros símbolos bíblicos.",
      icon: Layers,
      color: "from-emerald-500/20 via-teal-500/10 to-transparent",
      borderColor: "border-emerald-500/30 hover:border-emerald-400/60",
      iconColor: "text-emerald-400 bg-emerald-500/20",
      href: "/jogos/memoria",
      buttonText: "Jogar Memória"
    },
    {
      id: "snake",
      title: "Snake Sagrado (Google Snake)",
      subtitle: "Colete os Frutos e Coroas Sagradas",
      badge: "⚡ Clássico Arcade",
      badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/30",
      description: "O clássico jogo da cobrinha estilo Google Snake com tema sagrado! Colete frutos, pergaminhos e coroas da vida sem bater nas paredes.",
      icon: Sparkles,
      color: "from-teal-500/20 via-emerald-500/10 to-transparent",
      borderColor: "border-teal-500/30 hover:border-teal-400/60",
      iconColor: "text-teal-400 bg-teal-500/20",
      href: "/jogos/snake",
      buttonText: "Jogar Snake"
    }
  ];

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 font-sans pb-32">
      {/* Top Header Glass */}
      <header className="sticky top-0 z-30 bg-[#080d1a]/90 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Gamepad2 className="w-4 h-4 text-slate-950 fill-slate-950" />
            </div>
            <div>
              <h1 className="text-base font-black text-white leading-tight">Arena Fé & Sabedoria</h1>
              <p className="text-[10px] text-slate-400">Jogos Bíblicos e Desafios Interativos</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black text-amber-300">{userXp} XP</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        
        {/* Banner de Boas-Vindas */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900/80 to-[#0c162d] border border-indigo-500/20 p-6 shadow-2xl"
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[11px] font-bold">
              <Crown className="w-3.5 h-3.5 text-amber-400" /> Desafio da Sabedoria
            </div>
            
            <h2 className="text-xl font-black text-white tracking-tight">
              Aprenda a Palavra jogando e compartilhe suas vitórias!
            </h2>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Responda perguntas, teste sua memória com símbolos bíblicos e ganhe medalhas para subir de nível no FéConecta.
            </p>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">XP Acumulado</span>
                <span className="text-base font-black text-amber-400">{userXp}</span>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Partidas</span>
                <span className="text-base font-black text-emerald-400">{gamesPlayed}</span>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-3 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Nível</span>
                <span className="text-base font-black text-indigo-300">Discípulo</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Lista de Jogos Disponíveis */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Modos de Jogo
            </h3>
            <span className="text-[11px] text-slate-500">3 jogos disponíveis</span>
          </div>

          <div className="grid gap-4">
            {games.map((game, idx) => {
              const Icon = game.icon;
              return (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${game.color} bg-[#0e1628] border ${game.borderColor} p-5 transition-all hover:shadow-xl hover:scale-[1.01]`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${game.iconColor} shadow-inner`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                            {game.title}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-400">{game.subtitle}</p>
                      </div>
                    </div>

                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${game.badgeColor}`}>
                      {game.badge}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {game.description}
                  </p>

                  <Link 
                    href={game.href}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs text-white transition-all active:scale-95 shadow-sm"
                  >
                    <span>{game.buttonText}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

      </main>

      {/* Navegação Inferior Nativa */}
      <BottomNav />
    </div>
  );
}
