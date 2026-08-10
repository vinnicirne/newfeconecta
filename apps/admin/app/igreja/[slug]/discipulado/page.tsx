"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { BookOpen, CheckCircle, PlayCircle, Lock, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function DiscipuladoPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [church, setChurch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [trilhas, setTrilhas] = useState<any[]>([]);

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'BookOpen': return <BookOpen className="text-[#25D366]" />;
      case 'Trophy': return <Trophy className="text-orange-400" />;
      case 'Lock': return <Lock className="text-gray-500" />;
      default: return <BookOpen className="text-[#25D366]" />;
    }
  };

  useEffect(() => {
    loadChurch();
  }, [params.slug]);

  async function loadChurch() {
    const { data: churchData } = await supabase
      .from('churches')
      .select('*')
      .eq('slug', params.slug)
      .single();

    setChurch(churchData);
    
    if (churchData) {
      const { data: userResponse } = await supabase.auth.getUser();
      const user = userResponse?.user;

      const { data: tracks } = await supabase
        .from('church_discipleship_tracks')
        .select('*')
        .eq('church_id', churchData.id)
        .order('order_index', { ascending: true });

      if (tracks) {
        if (user) {
          const { data: progress } = await supabase
            .from('user_discipleship_progress')
            .select('*')
            .eq('user_id', user.id);

          const tracksWithProgress = tracks.map(t => {
            const p = progress?.find(p => p.track_id === t.id);
            return { ...t, progress: p?.progress || 0 };
          });
          setTrilhas(tracksWithProgress);
        } else {
          setTrilhas(tracks.map(t => ({ ...t, progress: 0 })));
        }
      }
    }
    setLoading(false);
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Carregando discipulado...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pb-20 pt-24">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-10">
          <div className="w-16 h-16 rounded-3xl bg-[#25D366]/20 flex items-center justify-center border border-[#25D366]/30">
            <BookOpen size={32} className="text-[#25D366]" />
          </div>
          <div>
            <h1 className="text-3xl font-black">Trilhas de Discipulado</h1>
            <p className="text-gray-400">{church?.name} • Crescimento Espiritual</p>
          </div>
        </div>

        <div className="space-y-6">
          {trilhas.map((trilha) => (
            <div 
              key={trilha.id} 
              className={cn(
                "rounded-3xl p-6 border transition-all relative overflow-hidden group",
                trilha.is_locked 
                  ? "bg-[#0A0A0A] border-white/5 opacity-60" 
                  : "bg-[#111B21] border-white/10 hover:border-[#25D366]/40 hover:shadow-xl cursor-pointer"
              )}
              onClick={() => !trilha.is_locked && router.push(`/igreja/${params.slug}/discipulado/${trilha.id}`)}
            >
              <div className="flex items-start gap-5 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-black/40 flex items-center justify-center shadow-inner">
                  {renderIcon(trilha.icon_name)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold">{trilha.title}</h3>
                    {trilha.is_locked ? (
                      <span className="text-xs font-bold text-gray-500 bg-gray-900 px-3 py-1 rounded-full uppercase tracking-widest">Bloqueado</span>
                    ) : trilha.progress === 100 ? (
                      <span className="text-xs font-bold text-[#25D366] bg-[#25D366]/10 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle size={14} /> Concluído
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-orange-400 bg-orange-400/10 px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                        <PlayCircle size={14} /> Em Andamento
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-400 mt-2 text-sm">{trilha.description}</p>
                  
                  {/* Progress Bar */}
                  {!trilha.is_locked && (
                    <div className="mt-6">
                      <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                        <span>{trilha.progress}% Concluído</span>
                        <span>{trilha.lessons_count} Módulos</span>
                      </div>
                      <div className="h-2 w-full bg-black rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#00A884] to-[#25D366] rounded-full transition-all duration-1000"
                          style={{ width: `${trilha.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
