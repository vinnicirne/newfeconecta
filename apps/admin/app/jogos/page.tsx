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
  Crown,
  Boxes,
  Play,
  TrendingUp,
  Search,
  Filter,
  ShieldAlert,
  Users
} from "lucide-react";
import BottomNav from "@/components/feed/BottomNav";
import { getStoredProfile } from "@/lib/profile-cache";
import { motion, AnimatePresence } from "framer-motion";

export default function GamesHubPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(() => getStoredProfile());
  const [userXp, setUserXp] = useState<number>(350);
  const [gamesPlayed, setGamesPlayed] = useState<number>(4);
  const [activeCategory, setActiveCategory] = useState<string>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    const cached = getStoredProfile();
    if (cached) setProfile(cached);

    if (typeof window !== "undefined") {
      const savedXp = parseInt(localStorage.getItem("fc_games_xp") || "350", 10);
      const savedGames = parseInt(localStorage.getItem("fc_games_played") || "4", 10);
      setUserXp(savedXp);
      setGamesPlayed(savedGames);
    }
  }, []);

  const categories = [
    { id: "todos", label: "Todos os Jogos", icon: "🎮" },
    { id: "biblia", label: "Bíblia & Quiz", icon: "📖" },
    { id: "arcade", label: "Arcade Clássico", icon: "🕹️" },
    { id: "puzzle", label: "Raciocínio & Blocos", icon: "🧩" },
  ];

  const games = [
    {
      id: "quiz",
      title: "Quiz Bíblico do Dia",
      tagline: "Desafio Teológico de 5 Questões",
      category: "biblia",
      badge: "🔥 Mais Jogado",
      badgeColor: "from-amber-500 to-orange-600 text-white",
      coverGradient: "from-amber-600/30 via-orange-600/20 to-slate-950",
      accentBorder: "group-hover:border-amber-500/80 hover:shadow-amber-500/20",
      icon: BrainCircuit,
      iconEmoji: "🧠",
      href: "/jogos/quiz",
      playersCount: "1.4k jogando",
      xpReward: "+150 XP",
      featured: true,
      description: "Teste seus conhecimentos bíblicos com perguntas dinâmicas do Antigo e Novo Testamento com cronômetro e ranking."
    },
    {
      id: "blocos",
      title: "Block Blast",
      tagline: "Encaixe os Blocos & Combos 8x8",
      category: "puzzle",
      badge: "⭐ Super Viciante",
      badgeColor: "from-purple-500 to-indigo-600 text-white",
      coverGradient: "from-purple-600/30 via-indigo-600/20 to-slate-950",
      accentBorder: "group-hover:border-purple-500/80 hover:shadow-purple-500/20",
      icon: Boxes,
      iconEmoji: "🧱",
      href: "/jogos/blocos",
      playersCount: "2.8k jogando",
      xpReward: "+300 XP",
      featured: true,
      description: "O sucesso mundial de quebra-cabeça de blocos! Encaixe as peças, limpe linhas e bata recordes mundiais."
    },
    {
      id: "snake",
      title: "Google Snake Clássico",
      tagline: "O Lendário Jogo da Serpente Oficial",
      category: "arcade",
      badge: "⚡ Clássico Retro",
      badgeColor: "from-emerald-500 to-teal-600 text-slate-950",
      coverGradient: "from-emerald-600/30 via-teal-600/20 to-slate-950",
      accentBorder: "group-hover:border-emerald-500/80 hover:shadow-emerald-500/20",
      icon: Sparkles,
      iconEmoji: "🐍",
      href: "/jogos/snake",
      playersCount: "3.1k jogando",
      xpReward: "+200 XP",
      featured: false,
      description: "O jogo original do Google Snake com física suave de 60fps, maçãs, efeitos sonoros e suporte completo a teclado e touch."
    },
    {
      id: "memoria",
      title: "Memória Sagrada",
      tagline: "Encontre os Símbolos da Aliança",
      category: "biblia",
      badge: "✨ Relaxante",
      badgeColor: "from-blue-500 to-cyan-600 text-white",
      coverGradient: "from-blue-600/30 via-cyan-600/20 to-slate-950",
      accentBorder: "group-hover:border-cyan-500/80 hover:shadow-cyan-500/20",
      icon: Layers,
      iconEmoji: "🦁",
      href: "/jogos/memoria",
      playersCount: "940 jogando",
      xpReward: "+200 XP",
      featured: false,
      description: "Encontre os pares da Arca, Leão de Judá, Sarça Ardente, Peixe Ichthys e Cruz em menos movimentos para ganhar XP."
    }
  ];

  const filteredGames = games.filter(game => {
    const matchesCat = activeCategory === "todos" || game.category === activeCategory;
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          game.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Cálculo de Nível do Jogador
  const playerLevel = Math.floor(userXp / 500) + 1;
  const levelProgress = ((userXp % 500) / 500) * 100;

  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 font-sans pb-32 selection:bg-amber-500 selection:text-slate-950">
      
      {/* 🌟 Top Navigation Gamer Bar */}
      <header className="sticky top-0 z-40 bg-[#050811]/90 backdrop-blur-2xl border-b border-white/10 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Voltar */}
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="p-2.5 hover:bg-white/10 rounded-2xl transition-all text-slate-400 hover:text-white active:scale-95 border border-white/5"
              title="Voltar para a Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30 ring-2 ring-amber-400/20 animate-pulse">
                <Gamepad2 className="w-5 h-5 text-slate-950 fill-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase italic">
                    Arena <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Play</span>
                  </h1>
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">Centro de Jogos & Entretenimento Cristão</p>
              </div>
            </div>
          </div>

          {/* Player HUD & Level Stats */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <span>Nível {playerLevel}</span>
                <span className="text-amber-400 font-extrabold">• Discípulo Gamer</span>
              </div>
              <div className="w-28 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: `${levelProgress}%` }} />
              </div>
            </div>

            <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-2xl shadow-inner">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-amber-400/80 leading-none">XP Total</span>
                <span className="text-sm font-black text-amber-300 leading-tight">{userXp}</span>
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* 🚀 Main Content Portal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8">

        {/* 🏆 HERO BANNER DESTAQUE (Estilo Steam / Apple Arcade) */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-900 via-[#0d162d] to-[#120e2e] border border-white/10 shadow-2xl p-6 sm:p-10"
        >
          {/* Luzes Neon de Fundo */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-500/15 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 grid md:grid-cols-12 gap-6 items-center">
            
            <div className="md:col-span-8 space-y-4 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/30 text-amber-300 text-xs font-black uppercase tracking-wider">
                <Crown className="w-4 h-4 text-amber-400" /> Destaque da Semana • Temporada da Fé
              </div>

              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none uppercase italic">
                Desafie sua mente, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400">
                  conquiste recordes
                </span> & ganhe XP!
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Jogue os maiores sucessos mundiais adaptados para a nossa comunidade. Jogue Block Blast, Quiz Bíblico, Google Snake e compartilhe suas conquistas direto no feed!
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/jogos/blocos"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 hover:from-purple-400 hover:to-indigo-400 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-purple-500/25 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Jogar Block Blast</span>
                </Link>

                <Link
                  href="/jogos/quiz"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider border border-white/10 active:scale-95 transition-all backdrop-blur-md"
                >
                  <BrainCircuit className="w-4 h-4 text-amber-400" />
                  <span>Quiz Bíblico</span>
                </Link>
              </div>
            </div>

            {/* Card Lateral de Estatísticas Gamer */}
            <div className="md:col-span-4 bg-slate-950/70 border border-white/10 backdrop-blur-xl rounded-3xl p-5 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Suas Conquistas</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Partidas</span>
                  <span className="text-xl font-black text-emerald-400">{gamesPlayed}</span>
                </div>
                <div className="bg-white/5 rounded-2xl p-3 text-center border border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Nível Atual</span>
                  <span className="text-xl font-black text-indigo-300">Lv.{playerLevel}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 text-center">
                <p className="text-[11px] text-amber-300 font-medium">
                  🔥 Cada vitória rende até <b>+300 XP</b> para o seu perfil e postagem automática no Feed!
                </p>
              </div>
            </div>

          </div>
        </motion.section>

        {/* 🎯 BARRA DE FILTROS & CATEGORIAS (Estilo Netflix / Arcade) */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Abas */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 scrollbar-none">
            {categories.map(cat => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                    isActive 
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black shadow-lg shadow-orange-500/20" 
                      : "bg-slate-900/90 text-slate-300 hover:bg-slate-800 border border-white/5 hover:border-white/15"
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Barra de Busca de Jogos */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar jogo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900/90 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400/60 transition-all"
            />
          </div>

        </div>

        {/* 🎮 GRID DE JOGOS (Cards Visuais 3D / Posters) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredGames.map((game, idx) => {
            const Icon = game.icon;
            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`group relative overflow-hidden rounded-[28px] bg-gradient-to-b ${game.coverGradient} border border-white/10 ${game.accentBorder} p-5 flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl`}
              >
                {/* Top Badge & Players */}
                <div className="flex items-start justify-between gap-2 mb-4">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-full bg-gradient-to-r ${game.badgeColor} shadow-md uppercase tracking-wider`}>
                    {game.badge}
                  </span>

                  <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <Sparkles className="w-3 h-3" />
                    <span>{game.xpReward}</span>
                  </div>
                </div>

                {/* Ícone 3D / Capa Central */}
                <div className="my-3 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-3xl bg-slate-950/80 border border-white/10 flex items-center justify-center text-4xl shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                    {game.iconEmoji}
                  </div>
                </div>

                {/* Info Text */}
                <div className="space-y-1.5 my-2">
                  <h3 className="text-lg font-black text-white group-hover:text-amber-300 transition-colors leading-tight">
                    {game.title}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium line-clamp-1">
                    {game.tagline}
                  </p>
                  <p className="text-[11px] text-slate-300/80 leading-relaxed line-clamp-2 pt-1">
                    {game.description}
                  </p>
                </div>

                {/* Bottom Action Button */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Users className="w-3 h-3" /> {game.playersCount}
                  </span>

                  <Link
                    href={game.href}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 group-hover:bg-gradient-to-r group-hover:from-amber-500 group-hover:to-orange-500 group-hover:text-slate-950 text-white font-black text-xs transition-all active:scale-95 shadow-sm"
                  >
                    <span>JOGAR</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Mensagem se busca vazia */}
        {filteredGames.length === 0 && (
          <div className="text-center py-16 bg-slate-900/40 rounded-3xl border border-white/5">
            <Gamepad2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h4 className="text-base font-bold text-white">Nenhum jogo encontrado</h4>
            <p className="text-xs text-slate-400 mt-1">Tente buscar por outro termo ou categoria.</p>
          </div>
        )}

      </main>

      {/* Navegação Inferior Nativa do App */}
      <BottomNav />
    </div>
  );
}
