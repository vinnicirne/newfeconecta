"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Layers, 
  Sparkles, 
  Clock, 
  RotateCcw, 
  Trophy, 
  Share2, 
  Send,
  Flame,
  Crown
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getStoredProfile } from "@/lib/profile-cache";
import { toast } from "sonner";
// @ts-ignore
import confetti from "canvas-confetti";
import { motion } from "framer-motion";

interface MemoryCard {
  id: number;
  symbol: string;
  name: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const BIBLE_SYMBOLS = [
  { symbol: "🦁", name: "Leão de Judá" },
  { symbol: "🕊️", name: "Pomba da Paz" },
  { symbol: "✝️", name: "Cruz da Salvação" },
  { symbol: "🐟", name: "Peixe Ichthys" },
  { symbol: "⚓", name: "Âncora da Fé" },
  { symbol: "👑", name: "Coroa da Vida" },
  { symbol: "🍞", name: "Pão da Vida" },
  { symbol: "🔥", name: "Sarça Ardente" }
];

export default function MemoryGamePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(() => getStoredProfile());
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isWon, setIsWon] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    const cached = getStoredProfile();
    if (cached) setProfile(cached);
    startNewGame();
  }, []);

  // Timer
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && !isWon) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isWon]);

  // Embaralhar e Iniciar Novo Jogo
  const startNewGame = () => {
    const duplicated = [...BIBLE_SYMBOLS, ...BIBLE_SYMBOLS];
    const shuffled = duplicated
      .sort(() => Math.random() - 0.5)
      .map((item, index) => ({
        id: index,
        symbol: item.symbol,
        name: item.name,
        isFlipped: false,
        isMatched: false
      }));

    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setSeconds(0);
    setIsPlaying(true);
    setIsWon(false);
  };

  // Virar Carta
  const handleCardClick = (index: number) => {
    if (!isPlaying || isWon) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;
    if (flippedCards.length === 2) return;

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(prev => prev + 1);
      const [firstIdx, secondIdx] = newFlipped;

      if (cards[firstIdx].symbol === cards[secondIdx].symbol) {
        // Acertou par
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => 
            i === firstIdx || i === secondIdx ? { ...c, isMatched: true } : c
          ));
          setFlippedCards([]);
          setMatches(prev => {
            const nextMatches = prev + 1;
            if (nextMatches === BIBLE_SYMBOLS.length) {
              handleWin();
            }
            return nextMatches;
          });
        }, 500);
      } else {
        // Errou par
        setTimeout(() => {
          setCards(prev => prev.map((c, i) => 
            i === firstIdx || i === secondIdx ? { ...c, isFlipped: false } : c
          ));
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  const handleWin = () => {
    setIsWon(true);
    setIsPlaying(false);
    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.6 }
    });

    if (typeof window !== "undefined") {
      const currentXp = parseInt(localStorage.getItem("fc_games_xp") || "0", 10);
      const totalPlayed = parseInt(localStorage.getItem("fc_games_played") || "0", 10);
      localStorage.setItem("fc_games_xp", (currentXp + 200).toString());
      localStorage.setItem("fc_games_played", (totalPlayed + 1).toString());
    }
  };

  const handleShareToFeed = async () => {
    if (isPublishing) return;
    setIsPublishing(true);

    try {
      const user = profile || getStoredProfile();
      if (!user?.id) {
        toast.error("Faça login para compartilhar.");
        setIsPublishing(false);
        return;
      }

      const content = `✨ Concluí o Jogo da Memória Sagrado na Arena FéConecta!\n\n🏆 8 Pares Encontrados em ${moves} jogadas!\n⏱️ Tempo: ${seconds}s\n🎖️ +200 XP da Fé conquistados\n\n👉 Jogue também em /jogos`;

      const { error } = await supabase.from('posts').insert({
        user_id: user.id,
        content: content,
        media_type: 'text',
        created_at: new Date().toISOString()
      });

      if (error) throw error;

      toast.success("Resultado publicado no Feed com sucesso!");
      router.push("/");
    } catch (err) {
      toast.error("Erro ao publicar.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 font-sans flex flex-col justify-between p-4 md:p-6 pb-20">
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between py-2">
        <Link href="/jogos" className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-sm text-white">Jogo da Memória Sagrado</span>
        </div>
        <button 
          onClick={startNewGame}
          className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
          title="Reiniciar"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </header>

      {/* Main Board */}
      <main className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center py-4 space-y-4">
        
        {/* Status Bar */}
        <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl p-3 px-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Jogadas:</span>
            <span className="text-sm font-black text-amber-400">{moves}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Pares:</span>
            <span className="text-sm font-black text-emerald-400">{matches} / 8</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs text-indigo-300">
            <Clock className="w-3.5 h-3.5" />
            <span>{seconds}s</span>
          </div>
        </div>

        {/* Tabuleiro 4x4 */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          {cards.map((card, idx) => (
            <motion.button
              key={card.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCardClick(idx)}
              className={`aspect-square rounded-2xl flex flex-col items-center justify-center transition-all duration-300 relative border ${
                card.isMatched
                  ? 'bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : card.isFlipped
                  ? 'bg-slate-800 border-amber-500/50 scale-105 shadow-md'
                  : 'bg-gradient-to-br from-slate-900 to-[#0e1628] border-slate-800 hover:border-slate-700'
              }`}
            >
              {card.isFlipped || card.isMatched ? (
                <div className="flex flex-col items-center justify-center p-1 text-center animate-in zoom-in-50 duration-200">
                  <span className="text-2xl sm:text-3xl leading-none">{card.symbol}</span>
                  <span className="text-[9px] font-bold text-slate-300 mt-1 truncate max-w-[60px] leading-tight">
                    {card.name}
                  </span>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-950/60 border border-slate-800/80 flex items-center justify-center text-slate-600">
                  <Crown className="w-4 h-4" />
                </div>
              )}
            </motion.button>
          ))}
        </div>

        {/* Modal de Vitória */}
        {isWon && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl bg-gradient-to-br from-slate-900/95 to-[#0e1628] border border-emerald-500/30 p-6 text-center space-y-4 shadow-2xl mt-4"
          >
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <Trophy className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white">Parabéns! Memória Excelente!</h3>
              <p className="text-xs text-slate-300">
                Você encontrou todos os 8 pares em {moves} jogadas e {seconds} segundos.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleShareToFeed}
                disabled={isPublishing}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-bold text-xs text-slate-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Send className="w-4 h-4" />
                <span>{isPublishing ? "Publicando..." : "Publicar Conquista no Feed"}</span>
              </button>

              <button
                onClick={startNewGame}
                className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-xs text-slate-300 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Jogar Novamente</span>
              </button>
            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}
