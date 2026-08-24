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
  Maximize2, 
  Minimize2,
  Gamepad2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
// @ts-ignore
import confetti from "canvas-confetti";

export default function GoogleSnakeGamePage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
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

      const promptScore = prompt("Qual pontuação você alcançou no Google Snake?", "25");
      if (!promptScore || isNaN(Number(promptScore))) {
        setIsPublishing(false);
        return;
      }

      const points = parseInt(promptScore, 10);
      if (points > highScore) {
        setHighScore(points);
        localStorage.setItem("fc_snake_highscore", points.toString());
      }

      const content = `🐍 Joguei o clássico Google Snake na Arena FéConecta!\n\n🍎 Pontuação: ${points} Maçãs\n🏆 Recorde: ${Math.max(points, highScore)} pontos\n🎖️ Consegue bater minha pontuação?\n\n👉 Jogue em /jogos/snake`;

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
    <div className="fixed inset-0 w-full h-full bg-[#4e6d31] flex flex-col justify-between overflow-hidden select-none z-50">
      
      {/* Top Header Gamer */}
      <header 
        className="w-full bg-slate-950/90 backdrop-blur-md px-3 sm:px-5 py-2.5 flex items-center justify-between border-b border-white/10 shrink-0 z-10"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)' }}
      >
        <div className="flex items-center gap-3">
          <Link 
            href="/jogos" 
            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white active:scale-95 transition-all"
            title="Voltar para a Arena"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">🐍</span>
            <span className="font-black text-sm text-white tracking-wide">Google Snake</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-full text-xs font-black text-amber-300">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>{highScore}</span>
          </div>

          <button
            onClick={handleRestart}
            className="p-2 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl transition-all active:scale-95"
            title="Reiniciar Jogo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleShareToFeed}
            disabled={isPublishing}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Postar no Feed</span>
          </button>
        </div>
      </header>

      {/* Frame do Jogo 100% Responsivo */}
      <main className="flex-1 w-full h-full relative bg-[#4e6d31] flex items-center justify-center overflow-hidden">
        <iframe
          ref={iframeRef}
          src="/games/google-snake/index.html"
          className="w-full h-full border-0 block"
          title="Google Snake Original"
          allow="autoplay; fullscreen"
        />
      </main>

    </div>
  );
}
