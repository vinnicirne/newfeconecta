"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  BrainCircuit, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  Share2, 
  RotateCcw, 
  Send, 
  Award, 
  BookOpen,
  Zap,
  Flame,
  HelpCircle,
  ChevronRight
} from "lucide-react";
import { 
  getRandomDailyQuestions, 
  calculateRank, 
  QuizQuestion, 
  GameResult 
} from "../lib/games-engine";
import { supabase } from "@/lib/supabase";
import { getStoredProfile } from "@/lib/profile-cache";
import { toast } from "sonner";
// @ts-ignore
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

export default function BibleQuizGamePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(() => getStoredProfile());
  const [difficulty, setDifficulty] = useState<'facil' | 'medio' | 'dificil'>('facil');
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'result'>('intro');
  
  // Game Play States
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [isPublishing, setIsPublishing] = useState(false);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);
  const totalTimeRef = useRef<number>(0);

  useEffect(() => {
    const cached = getStoredProfile();
    if (cached) setProfile(cached);
  }, []);

  // Iniciar partida
  const startGame = (diff: 'facil' | 'medio' | 'dificil' = difficulty) => {
    setDifficulty(diff);
    const generated = getRandomDailyQuestions(5, diff);
    setQuestions(generated);
    setCurrentIndex(0);
    setScore(0);
    setCorrectCount(0);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
    setTimeLeft(diff === 'facil' ? 25 : diff === 'medio' ? 18 : 12);
    setGameState('playing');
    startTimeRef.current = Date.now();
  };

  // Timer loop
  useEffect(() => {
    if (gameState !== 'playing' || isAnswerRevealed) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gameState, isAnswerRevealed, currentIndex]);

  // Tempo esgotado
  const handleTimeOut = () => {
    setIsAnswerRevealed(true);
    toast.error("Tempo esgotado!", { description: "Vamos para a próxima pergunta." });
  };

  // Responder pergunta
  const handleSelectOption = (option: string) => {
    if (isAnswerRevealed) return;
    clearInterval(timerRef.current);
    setSelectedOption(option);
    setIsAnswerRevealed(true);

    const currentQ = questions[currentIndex];
    const isCorrect = option === currentQ.correctAnswer;

    if (isCorrect) {
      // Bônus de agilidade baseado no tempo restante
      const timeBonus = Math.floor(timeLeft * 5);
      const questionScore = currentQ.points + timeBonus;
      setScore(prev => prev + questionScore);
      setCorrectCount(prev => prev + 1);

      // Efeito sonoro suave e confetti
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.8 },
        colors: ['#10b981', '#fbbf24', '#38bdf8']
      });
    }
  };

  // Avançar para próxima pergunta ou finalizar
  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswerRevealed(false);
      setTimeLeft(difficulty === 'facil' ? 25 : difficulty === 'medio' ? 18 : 12);
    } else {
      finishGame();
    }
  };

  // Finalizar jogo
  const finishGame = () => {
    totalTimeRef.current = Math.round((Date.now() - startTimeRef.current) / 1000);
    setGameState('result');

    // Atualizar XP e estatísticas no localStorage
    if (typeof window !== "undefined") {
      const currentXp = parseInt(localStorage.getItem("fc_games_xp") || "0", 10);
      const totalPlayed = parseInt(localStorage.getItem("fc_games_played") || "0", 10);
      localStorage.setItem("fc_games_xp", (currentXp + score).toString());
      localStorage.setItem("fc_games_played", (totalPlayed + 1).toString());
    }

    if (correctCount >= 4) {
      confetti({
        particleCount: 100,
        spread: 100,
        origin: { y: 0.6 }
      });
    }
  };

  // Publicar resultado no feed social
  const handleShareToFeed = async () => {
    if (isPublishing) return;
    setIsPublishing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;

      if (!userId) {
        toast.error("Faça login para compartilhar no feed.");
        setIsPublishing(false);
        return;
      }

      const rankInfo = calculateRank(score, (correctCount / 5) * 100);
      const content = `📖 Testei meus conhecimentos no Quiz da Bíblia!\n\n🎯 Acertei ${correctCount} de 5 perguntas (${score} XP)\n🎖️ Nível: ${difficulty.toUpperCase()} em ${totalTimeRef.current}s\n\nVenha testar o que você lembra das histórias bíblicas! /jogos/quiz`;

      const { error } = await supabase.from('posts').insert({
        author_id: userId,
        user_id: userId,
        profile_id: userId,
        content: content,
        post_type: 'text'
      });

      if (error) throw error;

      toast.success("Resultado publicado no Feed com sucesso!");
      router.push("/");
    } catch (err: any) {
      console.error("Erro ao publicar:", err);
      toast.error("Erro ao publicar no Feed.");
    } finally {
      setIsPublishing(false);
    }
  };

  // Compartilhar nativo (WhatsApp / Stories)
  const handleNativeShare = async () => {
    const rankInfo = calculateRank(score, (correctCount / 5) * 100);
    const text = `🧠 Acertei ${correctCount}/5 no Quiz Bíblico do FéConecta (${rankInfo.rank}) e fiz ${score} XP! Consegue me vencer? Jogue grátis em https://feconecta.com.br/jogos`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: "Desafio Bíblico FéConecta",
          text: text,
          url: "https://feconecta.com.br/jogos"
        });
        return;
      } catch (e) {}
    }

    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(text);
      toast.success("Texto copiado para a área de transferência!");
    }
  };

  const currentQ = questions[currentIndex];
  const rankInfo = calculateRank(score, (correctCount / (questions.length || 1)) * 100);

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 font-sans flex flex-col justify-between p-4 md:p-6">
      {/* Header */}
      <header className="max-w-xl w-full mx-auto flex items-center justify-between py-2">
        <Link href="/jogos" className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <BrainCircuit className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-sm text-white">Quiz Bíblico da Sabedoria</span>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-xs font-black text-amber-300">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{score} XP</span>
        </div>
      </header>

      {/* Conteúdo Central */}
      <main className="max-w-xl w-full mx-auto flex-1 flex flex-col justify-center py-4">
        
        {/* TELA DE INTRODUÇÃO / SELEÇÃO DE DIFICULDADE */}
        {gameState === 'intro' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl bg-gradient-to-br from-slate-900/90 to-[#0d172e] border border-slate-800 p-6 md:p-8 shadow-2xl space-y-6 text-center"
          >
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/10">
              <BrainCircuit className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">Quiz Bíblico do Dia</h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Responda 5 perguntas dinâmicas e teste sua sabedoria nas Escrituras Sagradas.
              </p>
            </div>

            <div className="space-y-3 text-left">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block px-1">
                Selecione a Dificuldade:
              </span>

              <div className="grid gap-2.5">
                {[
                  { id: 'facil', name: 'Iniciante (Fácil)', desc: 'Versículos clássicos & 25s por questão', color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
                  { id: 'medio', name: 'Discípulo (Médio)', desc: 'Histórias, reis e cartas & 18s por questão', color: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
                  { id: 'dificil', name: 'Mestre Teólogo (Difícil)', desc: 'Profecias e detalhes bíblicos & 12s por questão', color: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => startGame(d.id as any)}
                    className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-all hover:scale-[1.02] active:scale-98 ${d.color}`}
                  >
                    <div>
                      <h4 className="font-bold text-sm text-white">{d.name}</h4>
                      <p className="text-[11px] text-slate-400">{d.desc}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 opacity-70" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* TELA DE JOGO EM ANDAMENTO */}
        {gameState === 'playing' && currentQ && (
          <motion.div 
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {/* Barra de Progresso e Timer */}
            <div className="flex items-center justify-between gap-4 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">
                  Pergunta {currentIndex + 1} de {questions.length}
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {currentQ.category}
                </span>
              </div>

              {/* Cronômetro */}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs font-bold border transition-colors ${
                timeLeft <= 5 
                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' 
                  : 'bg-slate-800 text-slate-200 border-slate-700'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{timeLeft}s</span>
              </div>
            </div>

            {/* Barra de progresso visual */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Card da Pergunta */}
            <div className="rounded-3xl bg-[#0e1628] border border-slate-800/90 p-6 md:p-7 shadow-2xl space-y-5">
              <h3 className="text-base md:text-lg font-bold text-white leading-snug">
                {currentQ.question}
              </h3>

              {currentQ.reference && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 text-[11px] font-medium border border-indigo-500/20">
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Ref: {currentQ.reference}</span>
                </div>
              )}

              {/* Alternativas */}
              <div className="grid gap-3 pt-2">
                {currentQ.options.map((option, idx) => {
                  const isSelected = selectedOption === option;
                  const isCorrect = option === currentQ.correctAnswer;
                  
                  let btnStyle = "bg-slate-900/80 border-slate-800 text-slate-200 hover:border-amber-400/50 hover:bg-slate-800/90";
                  
                  if (isAnswerRevealed) {
                    if (isCorrect) {
                      btnStyle = "bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-lg shadow-emerald-500/10";
                    } else if (isSelected) {
                      btnStyle = "bg-rose-500/20 border-rose-500 text-rose-300";
                    } else {
                      btnStyle = "bg-slate-950/40 border-slate-900 text-slate-500 opacity-50";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isAnswerRevealed}
                      onClick={() => handleSelectOption(option)}
                      className={`w-full p-4 rounded-2xl border text-left text-xs md:text-sm font-medium transition-all flex items-center justify-between active:scale-98 ${btnStyle}`}
                    >
                      <span className="flex-1 pr-2">{option}</span>
                      {isAnswerRevealed && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                      {isAnswerRevealed && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Explicação Teológica Pós-Resposta */}
              {isAnswerRevealed && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 mt-4"
                >
                  <span className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5" /> Explicação Bíblica:
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentQ.explanation}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Botão Próxima */}
            {isAnswerRevealed && (
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={handleNextQuestion}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-orange-500/20 active:scale-98 flex items-center justify-center gap-2"
              >
                <span>{currentIndex + 1 === questions.length ? "Ver Meu Resultado" : "Próxima Pergunta"}</span>
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            )}
          </motion.div>
        )}

        {/* TELA DE RESULTADO / VITÓRIA */}
        {gameState === 'result' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl bg-gradient-to-br from-slate-900/90 to-[#0e1628] border border-slate-800 p-6 md:p-8 shadow-2xl space-y-6 text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto text-slate-950 shadow-xl shadow-orange-500/30">
              <Trophy className="w-10 h-10" />
            </div>

            <div className="space-y-1">
              <span className={`text-xs font-black uppercase tracking-wider ${rankInfo.color}`}>
                {rankInfo.medal}
              </span>
              <h2 className="text-2xl font-black text-white">{rankInfo.rank}</h2>
              <p className="text-xs text-slate-400">
                Você acertou {correctCount} de 5 perguntas em {totalTimeRef.current} segundos!
              </p>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
                <span className="text-[10px] text-slate-400 block font-medium">XP Ganho</span>
                <span className="text-lg font-black text-amber-400">+{score}</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
                <span className="text-[10px] text-slate-400 block font-medium">Precisão</span>
                <span className="text-lg font-black text-emerald-400">{Math.round((correctCount / 5) * 100)}%</span>
              </div>
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3">
                <span className="text-[10px] text-slate-400 block font-medium">Tempo</span>
                <span className="text-lg font-black text-indigo-300">{totalTimeRef.current}s</span>
              </div>
            </div>

            {/* Botões de Ação e Compartilhamento */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleShareToFeed}
                disabled={isPublishing}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-emerald-500/20 active:scale-98 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>{isPublishing ? "Publicando no Feed..." : "Publicar Conquista no Feed"}</span>
              </button>

              <button
                onClick={handleNativeShare}
                className="w-full py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all border border-slate-700 flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4 text-amber-400" />
                <span>Compartilhar no WhatsApp / Stories</span>
              </button>

              <button
                onClick={() => startGame(difficulty)}
                className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Jogar Outra Partida</span>
              </button>
            </div>
          </motion.div>
        )}

      </main>
    </div>
  );
}
