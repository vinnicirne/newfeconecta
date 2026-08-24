"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  RotateCcw, 
  Trophy, 
  Sparkles, 
  Send, 
  Share2, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Flame,
  Volume2,
  VolumeX,
  Apple
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
// @ts-ignore
import confetti from "canvas-confetti";
import { motion } from "framer-motion";

const GRID_SIZE = 16;
const INITIAL_SPEED = 140;

interface Position {
  x: number;
  y: number;
}

const HOLY_ITEMS = [
  { symbol: "🍎", name: "Fruto do Espírito", points: 10 },
  { symbol: "🍇", name: "Uva da Promessa", points: 15 },
  { symbol: "🍞", name: "Pão da Vida", points: 20 },
  { symbol: "📜", name: "Pergaminho Sagrado", points: 30 },
  { symbol: "👑", name: "Coroa da Vida", points: 50 }
];

export default function HolySnakeGamePage() {
  const router = useRouter();
  const [snake, setSnake] = useState<Position[]>([
    { x: 8, y: 8 },
    { x: 8, y: 9 },
    { x: 8, y: 10 }
  ]);
  const [direction, setDirection] = useState<Position>({ x: 0, y: -1 });
  const [nextDirection, setNextDirection] = useState<Position>({ x: 0, y: -1 });
  const [food, setFood] = useState<Position & { itemIndex: number }>({ x: 4, y: 4, itemIndex: 0 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const gameLoopRef = useRef<any>(null);

  // Carregar recorde do localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedHigh = parseInt(localStorage.getItem("fc_snake_highscore") || "0", 10);
      setHighScore(savedHigh);
    }
  }, []);

  // Gerar nova comida em posição livre
  const generateFood = useCallback((currentSnake: Position[]) => {
    let newX: number;
    let newY: number;
    let collision: boolean;

    do {
      newX = Math.floor(Math.random() * GRID_SIZE);
      newY = Math.floor(Math.random() * GRID_SIZE);
      collision = currentSnake.some(seg => seg.x === newX && seg.y === newY);
    } while (collision);

    const randomItemIdx = Math.floor(Math.random() * HOLY_ITEMS.length);
    return { x: newX, y: newY, itemIndex: randomItemIdx };
  }, []);

  // Iniciar partida
  const startGame = () => {
    const initialSnake = [
      { x: 8, y: 8 },
      { x: 8, y: 9 },
      { x: 8, y: 10 }
    ];
    setSnake(initialSnake);
    setDirection({ x: 0, y: -1 });
    setNextDirection({ x: 0, y: -1 });
    setFood(generateFood(initialSnake));
    setScore(0);
    setSpeed(INITIAL_SPEED);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  // Tratar teclas do teclado (WASD e Setas)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || isGameOver) {
        if (e.key === " " || e.key === "Enter") {
          startGame();
        }
        return;
      }

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          if (direction.y === 0) setNextDirection({ x: 0, y: -1 });
          break;
        case "ArrowDown":
        case "s":
        case "S":
          if (direction.y === 0) setNextDirection({ x: 0, y: 1 });
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          if (direction.x === 0) setNextDirection({ x: -1, y: 0 });
          break;
        case "ArrowRight":
        case "d":
        case "D":
          if (direction.x === 0) setNextDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [direction, isPlaying, isGameOver]);

  // Controles virtuais (Mobile)
  const handleVirtualDpad = (dir: "up" | "down" | "left" | "right") => {
    if (!isPlaying) startGame();
    if (dir === "up" && direction.y === 0) setNextDirection({ x: 0, y: -1 });
    if (dir === "down" && direction.y === 0) setNextDirection({ x: 0, y: 1 });
    if (dir === "left" && direction.x === 0) setNextDirection({ x: -1, y: 0 });
    if (dir === "right" && direction.x === 0) setNextDirection({ x: 1, y: 0 });
  };

  // Loop do Jogo
  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    gameLoopRef.current = setInterval(() => {
      setDirection(nextDirection);

      setSnake(prevSnake => {
        const head = prevSnake[0];
        const newHead = {
          x: head.x + nextDirection.x,
          y: head.y + nextDirection.y
        };

        // Colisão com paredes
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          handleGameOver();
          return prevSnake;
        }

        // Colisão com o próprio corpo
        if (prevSnake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
          handleGameOver();
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Coletou o item sagrado
        if (newHead.x === food.x && newHead.y === food.y) {
          const item = HOLY_ITEMS[food.itemIndex];
          const newScore = score + item.points;
          setScore(newScore);

          if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem("fc_snake_highscore", newScore.toString());
          }

          // Aumenta ligeiramente a velocidade
          setSpeed(prev => Math.max(70, prev - 2));
          setFood(generateFood(newSnake));

          // Efeito leve
          if (item.points >= 30) {
            // @ts-ignore
            confetti({
              particleCount: 20,
              spread: 40,
              origin: { y: 0.8 }
            });
          }
        } else {
          newSnake.pop(); // Remove a cauda se não comeu
        }

        return newSnake;
      });
    }, speed);

    return () => clearInterval(gameLoopRef.current);
  }, [isPlaying, isGameOver, nextDirection, food, score, highScore, speed, generateFood]);

  const handleGameOver = () => {
    setIsGameOver(true);
    setIsPlaying(false);
    clearInterval(gameLoopRef.current);

    if (typeof window !== "undefined") {
      const currentXp = parseInt(localStorage.getItem("fc_games_xp") || "0", 10);
      localStorage.setItem("fc_games_xp", (currentXp + score).toString());
    }

    if (score >= 100) {
      // @ts-ignore
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  };

  // Publicar resultado no feed
  const handleShareToFeed = async () => {
    if (isPublishing) return;
    setIsPublishing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error("Faça login para compartilhar no feed.");
        setIsPublishing(false);
        return;
      }

      const content = `🐍 Fiz ${score} pontos no Snake Sagrado (Google Snake) da Arena FéConecta!\n\n🍎 Frutos e coroas coletados\n🏆 Recorde: ${Math.max(score, highScore)} pontos\n🎖️ +${score} XP adicionados\n\n👉 Consegue superar minha pontuação em /jogos/snake?`;

      const { error } = await supabase.from("posts").insert({
        author_id: user.id,
        user_id: user.id,
        profile_id: user.id,
        content: content,
        post_type: "text"
      });

      if (error) throw error;

      toast.success("Pontuação compartilhada no feed com sucesso!");
      router.push("/");
    } catch (err) {
      toast.error("Erro ao publicar pontuação.");
    } finally {
      setIsPublishing(false);
    }
  };

  const currentFoodItem = HOLY_ITEMS[food.itemIndex];

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 font-sans flex flex-col justify-between p-3 sm:p-5 select-none pb-16">
      {/* Top Header */}
      <header className="max-w-md w-full mx-auto flex items-center justify-between py-2">
        <Link href="/jogos" className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xl">🐍</span>
          <span className="font-bold text-sm text-white">Snake Sagrado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-black text-amber-300">
            <Trophy className="w-3.5 h-3.5" />
            <span>{highScore}</span>
          </div>
        </div>
      </header>

      {/* Main Game Arena */}
      <main className="max-w-md w-full mx-auto flex-1 flex flex-col items-center justify-center space-y-3">
        
        {/* Placar Superior */}
        <div className="w-full flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-3 px-4 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Pontos:</span>
            <span className="text-base font-black text-emerald-400">{score}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span>Alvo:</span>
            <span className="text-base">{currentFoodItem.symbol}</span>
            <span className="text-[10px] text-amber-400 font-bold">+{currentFoodItem.points}pts</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Tam: {snake.length}</span>
          </div>
        </div>

        {/* Tabuleiro Grid (Estilo Google Snake) */}
        <div className="relative w-full aspect-square max-w-[360px] sm:max-w-[400px] bg-[#0c1527] border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-1">
          {/* Fundo xadrez sutil */}
          <div className="absolute inset-0 grid grid-cols-16 grid-rows-16 opacity-30 pointer-events-none">
            {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
              const row = Math.floor(i / GRID_SIZE);
              const col = i % GRID_SIZE;
              const isEven = (row + col) % 2 === 0;
              return (
                <div 
                  key={i} 
                  className={isEven ? "bg-slate-800/40" : "bg-transparent"} 
                />
              );
            })}
          </div>

          {/* Comida Sagrada */}
          <motion.div
            key={`${food.x}-${food.y}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute flex items-center justify-center text-lg sm:text-xl drop-shadow-md"
            style={{
              width: `${100 / GRID_SIZE}%`,
              height: `${100 / GRID_SIZE}%`,
              left: `${(food.x * 100) / GRID_SIZE}%`,
              top: `${(food.y * 100) / GRID_SIZE}%`
            }}
          >
            {currentFoodItem.symbol}
          </motion.div>

          {/* Corpo da Cobra */}
          {snake.map((seg, idx) => {
            const isHead = idx === 0;
            return (
              <div
                key={idx}
                className={`absolute transition-all duration-75 ${
                  isHead
                    ? "bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-lg shadow-md z-10"
                    : "bg-emerald-600/90 rounded-md"
                }`}
                style={{
                  width: `${100 / GRID_SIZE}%`,
                  height: `${100 / GRID_SIZE}%`,
                  left: `${(seg.x * 100) / GRID_SIZE}%`,
                  top: `${(seg.y * 100) / GRID_SIZE}%`,
                  transform: isHead ? "scale(1.05)" : "scale(0.95)"
                }}
              >
                {isHead && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Overlay de Início ou Fim de Jogo */}
          {(!isPlaying || isGameOver) && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20 space-y-4 animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20">
                {isGameOver ? "💥" : "🐍"}
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">
                  {isGameOver ? "Fim de Jogo!" : "Snake Sagrado"}
                </h3>
                <p className="text-xs text-slate-300">
                  {isGameOver
                    ? `Você fez ${score} pontos coletando itens sagrados!`
                    : "Guie a serpente para colher os frutos sagrados sem bater nas paredes!"}
                </p>
              </div>

              <div className="space-y-2 w-full max-w-[220px]">
                <button
                  onClick={startGame}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isGameOver ? "Jogar Novamente" : "Começar Agora"}</span>
                </button>

                {isGameOver && score > 0 && (
                  <button
                    onClick={handleShareToFeed}
                    disabled={isPublishing}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isPublishing ? "Publicando..." : "Postar no Feed"}</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* D-Pad Virtual para Celular */}
        <div className="w-full max-w-[240px] pt-1">
          <div className="grid grid-cols-3 gap-1.5">
            <div />
            <button
              onClick={() => handleVirtualDpad("up")}
              className="h-11 rounded-xl bg-slate-900/90 border border-slate-800 active:bg-emerald-500/20 text-slate-300 flex items-center justify-center active:scale-90 transition-all"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
            <div />

            <button
              onClick={() => handleVirtualDpad("left")}
              className="h-11 rounded-xl bg-slate-900/90 border border-slate-800 active:bg-emerald-500/20 text-slate-300 flex items-center justify-center active:scale-90 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>

            <button
              onClick={() => handleVirtualDpad("down")}
              className="h-11 rounded-xl bg-slate-900/90 border border-slate-800 active:bg-emerald-500/20 text-slate-300 flex items-center justify-center active:scale-90 transition-all"
            >
              <ChevronDown className="w-6 h-6" />
            </button>

            <button
              onClick={() => handleVirtualDpad("right")}
              className="h-11 rounded-xl bg-slate-900/90 border border-slate-800 active:bg-emerald-500/20 text-slate-300 flex items-center justify-center active:scale-90 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
