"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Flame, BookOpen, Clock, CheckCircle, Lock, ArrowRight, 
  Play, Info, Feather, Edit3, Plus, Image as ImageIcon,
  Sparkles, ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { VerificationModal } from "@/components/profile/VerificationModal";
import BottomNav from "@/components/feed/BottomNav";
import { getStoredProfile, setStoredProfile } from "@/lib/profile-cache";

export default function SantuarioPage() {
  const router = useRouter();
  const [journeys, setJourneys] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(() => getStoredProfile());
  
  const [journeyProgress, setJourneyProgress] = useState<Record<string, number>>({});
  const [totalFlames, setTotalFlames] = useState(0);
  const [activeTheme, setActiveTheme] = useState("Todos");

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        // 1. Hidratação Instantânea do Perfil
        const cached = getStoredProfile();
        let activeUser = cached;

        if (!activeUser) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
            if (p) {
              activeUser = setStoredProfile(p);
            }
          }
        }

        if (isMounted && activeUser) {
          setUserProfile(activeUser);
          setIsVerified(Boolean(activeUser.is_verified || activeUser.role === 'admin'));
        }

        const activeUserId = activeUser?.id;

        // 2. Busca Concorrente de Jornadas, Capítulos e Progresso
        const [journeysRes, chaptersRes, progressRes] = await Promise.all([
          supabase
            .from("sanctuary_journeys")
            .select("*, author:profiles(id, full_name, avatar_url, is_verified)")
            .order("created_at", { ascending: false }),
          supabase
            .from("sanctuary_chapters")
            .select("id, journey_id"),
          activeUserId
            ? supabase
                .from("sanctuary_progress")
                .select("chapter_id")
                .eq("user_id", activeUserId)
                .eq("is_completed", true)
            : Promise.resolve({ data: [] } as any)
        ]);

        if (!isMounted) return;

        if (journeysRes.data) {
          const published = journeysRes.data.filter((j: any) => j.is_published);
          setJourneys(published);

          if (activeUserId) {
            setDrafts(journeysRes.data.filter((j: any) => !j.is_published && j.author_id === activeUserId));
          }

          const chapters = chaptersRes.data || [];
          const progress = progressRes.data || [];
          
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
      } catch (err) {
        console.error("[Santuario] Erro ao carregar dados:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="pb-36 min-h-screen bg-background text-foreground transition-colors duration-300">
      
      {/* BOTÃO VOLTAR TOPO MOBILE/DESKTOP */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/5 dark:bg-white/5 text-gray-500 hover:text-amber-500 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Início
        </Link>
      </div>

      {/* HEADER / HERO COM BANNER */}
      <div className="relative pt-16 pb-14 px-6 flex flex-col items-center text-center bg-black overflow-hidden rounded-b-[40px] shadow-2xl mb-8 mt-3 max-w-5xl mx-auto">
        <Image 
          src="/images/santuario-banner.png" 
          alt="Santuário" 
          fill 
          className="object-cover opacity-40 select-none pointer-events-none"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-5 shadow-inner backdrop-blur-md border border-amber-500/30"
        >
          <Flame className="w-8 h-8 text-amber-400 drop-shadow-lg fill-amber-400/20" />
        </motion.div>
        
        <h1 className="relative z-10 text-3xl sm:text-4xl font-black mb-2.5 tracking-tight text-white font-santuario">
          Lugar Secreto
        </h1>
        <p className="relative z-10 text-amber-200/90 max-w-md text-base sm:text-lg italic leading-relaxed font-santuario drop-shadow-md px-2">
          "Entra no teu quarto, fecha a porta e ora ao teu Pai que está em secreto."
        </p>

        <button 
          onClick={() => setShowOnboarding(true)}
          className="relative z-10 mt-5 flex items-center gap-2 px-5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white text-xs sm:text-sm font-bold transition-all border border-white/15 active:scale-95"
        >
          <Info className="w-4 h-4 text-amber-400" /> Entenda o Lugar Secreto
        </button>
      </div>

      {/* MODAL DE ONBOARDING */}
      <AnimatePresence>
        {showOnboarding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Flame className="w-5 h-5 text-amber-500 fill-amber-500/30" />
                </div>
                <h2 className="text-xl font-bold font-santuario text-foreground">Guia do Lugar Secreto</h2>
              </div>
              <div className="space-y-4 text-sm text-muted-foreground font-santuario leading-relaxed">
                <p>Bem-vindo ao espaço sagrado de edificação espiritual profunda da nossa comunidade.</p>
                <ul className="space-y-3 list-none">
                  <li className="flex gap-3">
                    <BookOpen className="w-4 h-4 text-amber-500 shrink-0 mt-1" />
                    <span><strong className="text-foreground">Jornadas Devocionais:</strong> Trilhas de estudo guiadas forjadas por pastores e líderes ministeriais verificados.</span>
                  </li>
                  <li className="flex gap-3">
                    <Flame className="w-4 h-4 text-amber-500 shrink-0 mt-1" />
                    <span><strong className="text-foreground">Altar Digital:</strong> A cada capítulo meditado, você sela a leitura e acende uma chama no seu altar pessoal.</span>
                  </li>
                  <li className="flex gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />
                    <span><strong className="text-foreground">Devocional Individual:</strong> Membros da congregação podem usar o <Link href="/notes" className="text-whatsapp-teal font-bold underline">/notas</Link> para registros diários pessoais.</span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={() => setShowOnboarding(false)}
                className="mt-6 w-full py-3 bg-amber-500 text-black font-bold rounded-2xl hover:bg-amber-400 transition-colors shadow-lg active:scale-95"
              >
                Compreendi
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BOTÃO FORJAR NOVA JORNADA */}
      <div className="px-4 mb-8 max-w-3xl mx-auto">
        <div 
          onClick={() => {
            if (isVerified) {
              router.push('/santuario/create');
            } else {
              setShowVerificationModal(true);
            }
          }}
          className="group bg-gradient-to-br from-amber-500/10 via-card to-card border-2 border-amber-500/20 dark:border-amber-500/15 rounded-3xl p-5 shadow-lg shadow-amber-500/5 hover:shadow-amber-500/10 flex items-center justify-between cursor-pointer hover:border-amber-500/40 transition-all duration-300 active:scale-[0.99]"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner border border-amber-500/30">
              <Plus className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex flex-col">
              <span className="text-foreground font-bold text-base sm:text-lg">Forjar nova jornada celestial...</span>
              <span className="text-xs text-muted-foreground">Compartilhe trilhas de estudo e sabedoria bíblica</span>
            </div>
          </div>
          <div className="flex gap-2 text-amber-500 opacity-80 group-hover:opacity-100 transition-opacity">
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Feather className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* ALTAR DIGITAL (PROGRESSO DO USUÁRIO) */}
      <div className="px-4 mb-8 max-w-3xl mx-auto">
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Seu Altar Digital</h2>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold text-amber-500">{totalFlames} {totalFlames === 1 ? 'Chama' : 'Chamas'}</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {totalFlames > 0 
              ? `O seu Altar está aceso! Você já selou a leitura de ${totalFlames} ${totalFlames === 1 ? 'capítulo' : 'capítulos'}. Continue aprofundando sua comunhão.` 
              : "Você ainda não iniciou nenhuma jornada. Escolha uma trilha celestial abaixo para acender sua primeira chama no altar."}
          </p>
        </div>
      </div>

      {/* FILTRO DE TEMAS */}
      <div className="px-4 mb-8 max-w-3xl mx-auto">
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1">
          {["Todos", ...Array.from(new Set(journeys.map((j) => j.theme).filter(Boolean)))].map((theme) => (
            <button
              key={theme}
              onClick={() => setActiveTheme(theme)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                activeTheme === theme 
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/20" 
                  : "bg-card text-muted-foreground border border-border hover:border-amber-500/40 hover:text-foreground"
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </div>

      {/* MEUS RASCUNHOS (SÓ PARA VERIFICADOS) */}
      {isVerified && drafts.length > 0 && (
        <div className="px-4 mb-8 max-w-3xl mx-auto">
          <h3 className="text-base sm:text-lg font-bold mb-3 text-foreground px-1 flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-amber-500" /> Meus Rascunhos
          </h3>
          <div className="grid gap-3">
            {drafts.map((draft) => (
              <div 
                key={draft.id} 
                onClick={() => router.push(`/santuario/${draft.id}`)}
                className="bg-card p-4 rounded-2xl shadow-sm border border-border hover:border-amber-500/50 transition-colors cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                    <Edit3 className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground text-sm sm:text-base group-hover:text-amber-500 transition-colors">
                      {draft.title || 'Jornada sem título'}
                    </h4>
                    <span className="text-xs text-muted-foreground">Rascunho não publicado</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-amber-500 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* JORNADAS DISPONÍVEIS */}
      <div className="px-4 max-w-3xl mx-auto">
        <h3 className="text-base sm:text-lg font-bold mb-4 text-foreground px-1 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-500" /> Jornadas Celestiais
        </h3>
        
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
          </div>
        ) : journeys.length === 0 ? (
          <div className="text-center p-12 bg-card rounded-3xl border border-border shadow-sm">
            <BookOpen className="w-12 h-12 text-amber-500/40 mx-auto mb-3" />
            <p className="text-muted-foreground italic font-medium">Nenhuma jornada foi publicada ainda pelos líderes verificados.</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {(activeTheme === "Todos" ? journeys : journeys.filter((j) => j.theme === activeTheme)).map((journey) => (
              <div 
                key={journey.id} 
                onClick={() => router.push(`/santuario/${journey.id}`)}
                className="bg-card p-5 rounded-3xl shadow-sm border border-border hover:border-amber-500/50 transition-all cursor-pointer group relative overflow-hidden active:scale-[0.99]"
              >
                {/* Imagem de Capa */}
                {journey.cover_url && (
                  <div className="w-full h-36 sm:h-44 mb-4 rounded-2xl overflow-hidden relative shadow-inner">
                    <img src={journey.cover_url} alt="Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  </div>
                )}
                
                {/* Linha decorativa */}
                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500/40 group-hover:bg-amber-500 transition-colors" />
                
                <div className="flex items-start justify-between mb-3 pl-2">
                  <div className="flex items-center gap-2.5">
                    {journey.author?.avatar_url ? (
                      <img src={journey.author.avatar_url} alt="Author" className="w-7 h-7 rounded-full object-cover border border-border" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                        {journey.author?.full_name?.[0] || 'L'}
                      </div>
                    )}
                    <span className="text-xs font-semibold text-muted-foreground">Por {journey.author?.full_name?.split(' ')[0] || 'Líder'}</span>
                    {journey.author?.is_verified && (
                      <CheckCircle className="w-3.5 h-3.5 text-whatsapp-teal fill-whatsapp-teal/20" />
                    )}
                  </div>
                  
                  {Number(journey.price) > 0 ? (
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      <Lock className="w-3 h-3" /> Premium
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold uppercase tracking-wider text-whatsapp-teal bg-whatsapp-teal/10 px-2.5 py-0.5 rounded-full border border-whatsapp-teal/20">
                      Livre
                    </div>
                  )}
                </div>

                <h4 className="text-lg sm:text-xl font-bold text-foreground mb-2 pl-2 leading-tight group-hover:text-amber-500 transition-colors font-santuario">
                  {journey.title}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 pl-2 leading-relaxed">
                  {journey.description || 'Nenhuma descrição disponível para esta jornada.'}
                </p>

                <div className="flex items-center justify-between pl-2 pt-3 border-t border-border">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>Progresso: <strong>{journeyProgress[journey.id] || 0}%</strong></span>
                  </div>
                  <div className="flex items-center gap-3">
                    {userProfile?.id === journey.author_id && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          router.push(`/santuario/create?edit=${journey.id}`); 
                        }}
                        className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-muted-foreground hover:text-foreground transition-colors p-1"
                      >
                        <Edit3 className="w-4 h-4" /> Editar
                      </button>
                    )}
                    <button className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-500 group-hover:text-amber-400 transition-colors bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                      {journeyProgress[journey.id] > 0 ? (journeyProgress[journey.id] === 100 ? 'Concluído' : 'Continuar') : 'Iniciar'} <Play className="w-3.5 h-3.5 fill-current" />
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
            router.push('/santuario/create');
          }}
          user={userProfile}
        />
      )}

      {/* Menu de Navegação no Rodapé (Mobile) */}
      <BottomNav />
    </div>
  );
}
