"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  RotateCcw, 
  Trophy, 
  Sparkles, 
  Send, 
  Share2, 
  Maximize2, 
  Minimize2,
  Gamepad2,
  Zap,
  Flame,
  Volume2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
// @ts-ignore
import confetti from "canvas-confetti";
import { motion } from "framer-motion";

export default function GoogleSnakeGamePage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedHigh = parseInt(localStorage.getItem("fc_snake_highscore") || "0", 10);
      setHighScore(savedHigh);
    }
  }, []);

  const handleToggleFullscreen = () => {
    setIsFullscreen(prev => !prev);
  };

  const handleRestart = () => {
    if (iframeRef.current) {
      iframeRef.current.src = "/games/google-snake/index.html";
    }
  };

  // Publicar pontuação no feed social
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

      const promptScore = prompt("Qual pontuação você acabou de alcançar no Google Snake?", "25");
      if (!promptScore || isNaN(Number(promptScore))) {
        setIsPublishing(false);
        return;
      }

      const points = parseInt(promptScore, 10);
      if (points > highScore) {
        setHighScore(points);
        localStorage.setItem("fc_snake_highscore", points.toString());
      }

      const content = `🐍 Joguei o clássico Google Snake na Arena FéConecta!\n\n🍎 Pontuação: ${points} Maçãs\n🏆 Recorde da Fé: ${Math.max(points, highScore)} pontos\n🎖️ Venha bater meu recorde no modo clássico arcade!\n\n👉 Jogue grátis em /jogos/snake`;

      const { error } = await supabase.from("posts").insert({
        author_id: user.id,
        user_id: user.id,
        profile_id: user.id,
        content: content,
        post_type: "text"
      });

      if (error) throw error;

      // @ts-ignore
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      toast.success("Pontuação compartilhada no Feed com sucesso!");
      router.push("/");
    } catch (err) {
      toast.error("Erro ao compartilhar pontuação.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className={`min-h-screen bg-[#080d1a] text-slate-100 font-sans flex flex-col justify-between ${
      isFullscreen ? "p-0 fixed inset-0 z-50 overflow-hidden" : "p-3 sm:p-5 pb-16"
    }`}>
      {/* Top Header */}
      {!isFullscreen && (
        <header className="max-w-4xl w-full mx-auto flex items-center justify-between py-2">
          <Link href="/jogos" className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">🐍</span>
            <span className="font-bold text-sm text-white">Google Snake Oficial</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-black text-amber-300">
              <Trophy className="w-3.5 h-3.5" />
              <span>{highScore}</span>
            </div>
            <button
              onClick={handleToggleFullscreen}
              className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
              title="Tela Cheia"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </header>
      )}

      {/* Main Game Arena */}
      <main className={`w-full mx-auto flex-1 flex flex-col items-center justify-center ${
        isFullscreen ? "h-screen max-w-full" : "max-w-4xl space-y-3"
      }`}>
        
        {/* Barra de Controles Rápidos */}
        {!isFullscreen && (
          <div className="w-full flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 px-4 shadow-lg">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              <span>Use as <b>Setas</b> ou <b>WASD</b> para mover</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRestart}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>

              <button
                onClick={handleShareToFeed}
                disabled={isPublishing}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Postar no Feed</span>
              </button>
            </div>
          </div>
        )}

        {/* Frame do Google Snake Oficial */}
        <div className={`relative w-full rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-800 bg-[#4e6d31] transition-all ${
          isFullscreen 
            ? "h-full rounded-none border-none" 
            : "h-[480px] sm:h-[540px] md:h-[600px] max-w-3xl"
        }`}>
          {isFullscreen && (
            <button
              onClick={handleToggleFullscreen}
              className="absolute top-4 right-4 z-50 p-2.5 bg-slate-950/80 hover:bg-slate-900 text-white rounded-xl shadow-xl backdrop-blur-sm border border-slate-700"
              title="Sair da Tela Cheia"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          )}

          <iframe
            ref={iframeRef}
            src="/games/google-snake/index.html"
            className="w-full h-full border-0 block"
            title="Google Snake Original"
            allow="autoplay"
          />
        </div>

      </main>
    </div>
  );
}
