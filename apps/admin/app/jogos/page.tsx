"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft,
  Sparkles,
  Trophy,
  Play,
  Flame,
  ChevronRight,
  Smile,
  Heart,
  Gamepad2
} from "lucide-react";
import BottomNav from "@/components/feed/BottomNav";
import { getStoredProfile } from "@/lib/profile-cache";
import { motion } from "framer-motion";

export default function JogosPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(() => getStoredProfile());
  const [userXp, setUserXp] = useState<number>(0);
  const [gamesPlayed, setGamesPlayed] = useState<number>(0);

  useEffect(() => {
    const cached = getStoredProfile();
    if (cached) setProfile(cached);

    if (typeof window !== "undefined") {
      const savedXp = parseInt(localStorage.getItem("fc_games_xp") || "120", 10);
      const savedGames = parseInt(localStorage.getItem("fc_games_played") || "2", 10);
      setUserXp(savedXp);
      setGamesPlayed(savedGames);
    }
  }, []);

  const userName = profile?.first_name || profile?.full_name?.split(" ")[0] || profile?.username || "Amigo";

  const games = [
    {
      id: "quiz",
      title: "Quiz da Bíblia",
      category: "Conhecimento Bíblico",
      description: "5 perguntinhas rápidas sobre histórias, personagens e versículos pra exercitar a memória da Palavra.",
      time: "2 min",
      icon: "📖",
      color: "from-amber-500/15 to-orange-500/5",
      border: "border-amber-500/20 hover:border-amber-400/50",
      btnColor: "bg-amber-500 hover:bg-amber-400 text-slate-950",
      href: "/jogos/quiz",
      buttonText: "Jogar Quiz"
    },
    {
      id: "blocos",
      title: "Block Blast",
      category: "Quebra-Cabeça & Lógica",
      description: "O passatempo de encaixar blocos coloridos e limpar o tabuleiro. Simples, viciante e relaxante.",
      time: "Livre",
      icon: "🧱",
      color: "from-purple-500/15 to-indigo-500/5",
      border: "border-purple-500/20 hover:border-purple-400/50",
      btnColor: "bg-purple-500 hover:bg-purple-400 text-white",
      href: "/jogos/blocos",
      buttonText: "Jogar Blocos"
    },
    {
      id: "snake",
      title: "Jogo da Cobrinha",
      category: "Arcade Clássico",
      description: "Aquele clássico do Google de comer maçãs e desviar do próprio rabo pra passar o tempo.",
      time: "Livre",
      icon: "🐍",
      color: "from-emerald-500/15 to-teal-500/5",
      border: "border-emerald-500/20 hover:border-emerald-400/50",
      btnColor: "bg-emerald-500 hover:bg-emerald-400 text-slate-950",
      href: "/jogos/snake",
      buttonText: "Jogar Cobrinha"
    },
    {
      id: "memoria",
      title: "Jogo da Memória",
      category: "Concentração & Paz",
      description: "Vire as cartas e encontre os pares dos símbolos da nossa fé com tranquilidade.",
      time: "3 min",
      icon: "🕊️",
      color: "from-sky-500/15 to-blue-500/5",
      border: "border-sky-500/20 hover:border-sky-400/50",
      btnColor: "bg-sky-500 hover:bg-sky-400 text-slate-950",
      href: "/jogos/memoria",
      buttonText: "Jogar Memória"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14] text-slate-900 dark:text-slate-100 font-sans pb-32 transition-colors">
      
      {/* Barra Superior Humana e Limpa */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#070b14]/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/5 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Jogos & Passatempos
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pra relaxar, aprender e se divertir
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{userXp} XP</span>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        
        {/* Saudação Amigável */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white dark:bg-[#0d1424] border border-slate-200 dark:border-white/5 p-6 shadow-sm dark:shadow-xl relative overflow-hidden"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Smile className="w-4 h-4" />
              <span>Olá, {userName}!</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Tire um momento pra descontrair hoje
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              Escolha um joguinho abaixo. Você pode testar seus conhecimentos da Bíblia, passar o tempo com a cobrinha ou relaxar montando blocos. Ao final de cada partida, você pode compartilhar sua pontuação com os irmãos no Feed!
            </p>
          </div>
        </motion.div>

        {/* Grade de Jogos Limpa e Organizada */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Escolha o que quer jogar
            </h3>
            <span className="text-xs text-slate-400">4 jogos</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {games.map((game, idx) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`rounded-3xl bg-gradient-to-br ${game.color} bg-white dark:bg-[#0c1220] border ${game.border} p-5 flex flex-col justify-between transition-all hover:shadow-md dark:hover:shadow-xl`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-white/5 flex items-center justify-center text-2xl">
                        {game.icon}
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 block">
                          {game.category}
                        </span>
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {game.title}
                        </h4>
                      </div>
                    </div>

                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                      {game.time}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    {game.description}
                  </p>
                </div>

                <Link
                  href={game.href}
                  className={`w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98 shadow-sm ${game.btnColor}`}
                >
                  <span>{game.buttonText}</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

      </main>

      {/* Navegação Inferior */}
      <BottomNav />
    </div>
  );
}
