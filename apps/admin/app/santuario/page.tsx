"use client";

import React, { useEffect, useState } from "react";
import { Flame, BookOpen, Clock, CheckCircle, Lock, ArrowRight, Play, Info, Feather, Edit3, Plus, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { VerificationModal } from "@/components/profile/VerificationModal";

export default function SantuarioPage() {
  const [journeys, setJourneys] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [journeyProgress, setJourneyProgress] = useState<Record<string, number>>({});
  const [totalFlames, setTotalFlames] = useState(0);
  const [activeTheme, setActiveTheme] = useState("Todos");

  useEffect(() => {
    // Busca perfil para ver se é verificado
    const checkProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) {
          setUserProfile(data);
          setIsVerified(data.is_verified);
        }
      }
    };
    
    // Busca jornadas publicadas e rascunhos
    const fetchJourneys = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data, error } = await supabase
          .from("sanctuary_journeys")
          .select("*, author:profiles(id, full_name, avatar_url, is_verified)")
          .order("created_at", { ascending: false });

        if (data) {
          const published = data.filter((j: any) => j.is_published);
          setJourneys(published);
          if (user) {
            setDrafts(data.filter((j: any) => !j.is_published && j.author_id === user.id));

            const { data: chapters } = await supabase.from("sanctuary_chapters").select("id, journey_id");
            const { data: progress } = await supabase.from("sanctuary_progress").select("chapter_id").eq("user_id", user.id).eq("is_completed", true);
            
            if (chapters && progress) {
              setTotalFlames(progress.length);
              
              const completedChapterIds = new Set(progress.map((p: any) => p.chapter_id));
              const progressMap: Record<string, number> = {};
              
              published.forEach((journey: any) => {
                const journeyChapters = chapters.filter((c: any) => c.journey_id === journey.id);
                const total = journeyChapters.length;
                if (total === 0) {
                   progressMap[journey.id] = 0;
                } else {
                   const completed = journeyChapters.filter((c: any) => completedChapterIds.has(c.id)).length;
                   progressMap[journey.id] = Math.round((completed / total) * 100);
                }
              });
              setJourneyProgress(progressMap);
            }
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    checkProfile();
    fetchJourneys();
  }, []);

  return (
    <div className="pb-32 min-h-screen">
      {/* HEADER / HERO COM BANNER GERADO */}
      <div className="relative pt-20 pb-16 px-6 flex flex-col items-center text-center bg-black overflow-hidden rounded-b-[40px] shadow-2xl mb-8">
        <Image 
          src="/images/santuario-banner.png" 
          alt="Santuário" 
          fill 
          className="object-cover opacity-50 select-none"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 w-16 h-16 rounded-full bg-santuario-gold/20 flex items-center justify-center mb-6 shadow-inner backdrop-blur-md border border-santuario-gold/30"
        >
          <Flame className="w-8 h-8 text-santuario-gold drop-shadow-lg" />
        </motion.div>
        
        <h1 className="relative z-10 text-4xl font-bold mb-3 tracking-tight text-white font-santuario">
          Lugar Secreto
        </h1>
        <p className="relative z-10 text-santuario-goldLight/90 max-w-md text-lg italic leading-relaxed font-santuario drop-shadow-md">
          "Entra no teu quarto, fecha a porta e ora em secreto."
        </p>

        <button 
          onClick={() => setShowOnboarding(true)}
          className="relative z-10 mt-6 flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white/90 text-sm font-medium transition-all border border-white/10"
        >
          <Info className="w-4 h-4" /> Entenda o Lugar Secreto
        </button>
      </div>

      {/* MODAL DE ONBOARDING */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Flame className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-xl font-bold font-santuario text-zinc-900 dark:text-white">Guia do Lugar Secreto</h2>
            </div>
            <div className="space-y-4 text-sm text-zinc-600 dark:text-zinc-400 font-santuario leading-relaxed">
              <p>Bem-vindo ao espaço mais sagrado e profundo da nossa rede.</p>
              <ul className="space-y-3 list-none">
                <li className="flex gap-2">
                  <BookOpen className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Jornadas do Lugar Secreto:</strong> Trilhas de estudo guiadas criadas exclusivamente por líderes e pastores verificados.</span>
                </li>
                <li className="flex gap-2">
                  <Flame className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Altar Digital:</strong> Ao meditar em cada capítulo de uma jornada, você deve "Selar a Leitura". Isso acende uma chama no seu altar pessoal.</span>
                </li>
                <li className="flex gap-2">
                  <CheckCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <span><strong>Criação:</strong> Apenas perfis com selo de verificação têm a honra de forjar novas jornadas. Membros da congregação podem usar o <span className="text-whatsapp-teal font-bold">/notas</span> para seu devocional diário privado.</span>
                </li>
              </ul>
            </div>
            <button 
              onClick={() => setShowOnboarding(false)}
              className="mt-6 w-full py-3 bg-zinc-900 dark:bg-amber-500 text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-colors"
            >
              Compreendi
            </button>
          </motion.div>
        </div>
      )}

      {/* KEEP STYLE CREATOR */}
      <div className="px-4 mb-10 max-w-3xl mx-auto">
        <div 
          onClick={() => {
            if (isVerified) {
              window.location.href = '/santuario/create';
            } else {
              setShowVerificationModal(true);
            }
          }}
          className="group bg-gradient-to-br from-amber-500/10 via-background to-background border-2 border-amber-500/20 dark:border-amber-500/10 rounded-[24px] p-5 shadow-lg shadow-amber-500/5 hover:shadow-amber-500/10 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-all duration-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5 text-amber-600 dark:text-amber-500" />
            </div>
            <span className="text-zinc-700 dark:text-zinc-300 font-medium text-lg">Forjar nova jornada celestial...</span>
          </div>
          <div className="flex gap-3 text-amber-600 dark:text-amber-500 opacity-70 group-hover:opacity-100 transition-opacity">
            <button title="Imagem Temática" className="p-2 hover:bg-amber-500/10 rounded-full transition-colors">
              <ImageIcon className="w-5 h-5" />
            </button>
            <button title="Novo Módulo" className="p-2 hover:bg-amber-500/10 rounded-full transition-colors">
              <Feather className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ALTAR DIGITAL (PROGRESSO DO USUÁRIO) */}
      <div className="px-4 mb-10">
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">Seu Altar Digital</h2>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 rounded-full">
              <Flame className="w-4 h-4 text-amber-500 fill-current" />
              <span className="text-xs font-bold text-zinc-900 dark:text-white">{totalFlames} {totalFlames === 1 ? 'Chama' : 'Chamas'}</span>
            </div>
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5">
            {totalFlames > 0 
              ? `O seu Altar está aceso! Você já selou a leitura de ${totalFlames} ${totalFlames === 1 ? 'capítulo' : 'capítulos'}. Continue a jornada.` 
              : "Você ainda não começou nenhuma jornada. Escolha uma trilha de discipulado abaixo para acender seu altar."}
          </p>
        </div>
      </div>

      {/* FILTRO DE TEMAS */}
      <div className="px-4 mb-8 max-w-3xl mx-auto">
        <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
          {["Todos", ...Array.from(new Set(journeys.map((j) => j.theme).filter(Boolean)))].map((theme) => (
            <button
              key={theme}
              onClick={() => setActiveTheme(theme)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                activeTheme === theme 
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" 
                  : "bg-white dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/10 hover:border-amber-500/30"
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      {/* MEUS RASCUNHOS (SÓ PARA VERIFICADOS) */}
      {isVerified && drafts.length > 0 && (
        <div className="px-4 mb-10 max-w-3xl mx-auto">
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white px-2">Meus Rascunhos</h3>
          <div className="grid gap-4">
            {drafts.map((draft) => (
              <div 
                key={draft.id} 
                onClick={() => window.location.href = `/santuario/${draft.id}`}
                className="bg-card p-4 rounded-2xl shadow-sm border border-border hover:border-amber-500/50 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Edit3 className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-white">{draft.title || 'Jornada sem título'}</h4>
                    <span className="text-xs text-zinc-500">Rascunho não publicado</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JORNADAS DISPONÍVEIS */}
      <div className="px-4 max-w-3xl mx-auto">
        <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white px-2">Jornadas Celestiais</h3>
        
        {loading ? (
          <div className="flex justify-center p-10">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : journeys.length === 0 ? (
          <div className="text-center p-10 bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-white/10">
            <BookOpen className="w-10 h-10 text-amber-500/50 mx-auto mb-3" />
            <p className="text-zinc-500 dark:text-zinc-400 italic">Nenhuma jornada foi publicada ainda pelos líderes verificados.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {(activeTheme === "Todos" ? journeys : journeys.filter((j) => j.theme === activeTheme)).map((journey) => (
              <div 
                key={journey.id} 
                onClick={() => window.location.href = `/santuario/${journey.id}`}
                className="bg-white dark:bg-zinc-900 p-5 rounded-3xl shadow-sm border border-zinc-200 dark:border-white/10 hover:border-amber-500/50 transition-colors cursor-pointer group relative overflow-hidden"
              >
                {/* Imagem de Capa */}
                {journey.cover_url && (
                  <div className="w-full h-32 mb-4 rounded-xl overflow-hidden relative">
                    <img src={journey.cover_url} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                  </div>
                )}
                
                {/* Linha decorativa */}
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50 group-hover:bg-amber-500 transition-colors" />
                
                <div className="flex items-start justify-between mb-3 pl-2">
                  <div className="flex items-center gap-2">
                    {journey.author?.avatar_url ? (
                      <img src={journey.author.avatar_url} alt="Author" className="w-6 h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                    )}
                    <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Por {journey.author?.full_name?.split(' ')[0] || 'Líder'}</span>
                    {journey.author?.is_verified && (
                      <CheckCircle className="w-3 h-3 text-whatsapp-teal" />
                    )}
                  </div>
                  
                  {Number(journey.price) > 0 ? (
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                      <Lock className="w-3 h-3" /> Premium
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold uppercase tracking-wider text-whatsapp-teal bg-whatsapp-teal/10 px-2 py-0.5 rounded-sm">
                      Livre
                    </div>
                  )}
                </div>

                <h4 className="text-xl font-bold text-zinc-900 dark:text-white mb-2 pl-2 leading-tight">{journey.title}</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 mb-4 pl-2 leading-relaxed">
                  {journey.description || 'Nenhuma descrição disponível para esta jornada.'}
                </p>

                <div className="flex items-center justify-between pl-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-1 text-xs text-zinc-500 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Progresso: {journeyProgress[journey.id] || 0}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {userProfile?.id === journey.author_id && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); window.location.href = `/santuario/create?edit=${journey.id}`; }}
                        className="flex items-center gap-1.5 text-sm font-bold text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" /> Editar
                      </button>
                    )}
                    <button className="flex items-center gap-1.5 text-sm font-bold text-amber-500 group-hover:text-amber-600 transition-colors">
                      {journeyProgress[journey.id] > 0 ? (journeyProgress[journey.id] === 100 ? 'Concluído' : 'Continuar') : 'Iniciar'} <Play className="w-4 h-4 fill-current" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showVerificationModal && userProfile && (
        <VerificationModal
          isOpen={showVerificationModal}
          onClose={() => setShowVerificationModal(false)}
          onVerified={() => {
            setShowVerificationModal(false);
            setIsVerified(true);
            window.location.href = '/santuario/create';
          }}
          user={userProfile}
        />
      )}
    </div>
  );
}
