"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, PlayCircle, CheckCircle, Lock, BookOpen, ListOrdered } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function TrackPage({ params }: { params: { slug: string, track_id: string } }) {
  const router = useRouter();
  const [track, setTrack] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [params.slug, params.track_id]);

  async function loadData() {
    // Carrega a trilha
    const { data: trackData } = await supabase
      .from('church_discipleship_tracks')
      .select('*')
      .eq('id', params.track_id)
      .single();

    if (!trackData) {
      router.push(`/igreja/${params.slug}/discipulado`);
      return;
    }
    setTrack(trackData);

    // Carrega os módulos
    const { data: modulesData } = await supabase
      .from('church_discipleship_modules')
      .select('*')
      .eq('track_id', params.track_id)
      .order('order_index', { ascending: true });
      
    if (modulesData) setModules(modulesData);

    // Carrega as aulas
    const { data: lessonsData } = await supabase
      .from('church_discipleship_lessons')
      .select('*')
      .eq('track_id', params.track_id)
      .order('order_index', { ascending: true });
      
    if (lessonsData) setLessons(lessonsData);

    // Verifica aulas concluídas pelo usuário
    const { data: userResponse } = await supabase.auth.getUser();
    if (userResponse?.user) {
      const { data: compData } = await supabase
        .from('user_discipleship_completed_lessons')
        .select('lesson_id')
        .eq('user_id', userResponse.user.id);
        
      if (compData) {
        setCompleted(compData.map(c => c.lesson_id));
      }
    }
    
    setLoading(false);
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Carregando estudos...</div>;
  }

  const progress = lessons.length > 0 ? Math.round((completed.length / lessons.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pb-20 pt-24">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => router.push(`/igreja/${params.slug}/discipulado`)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ChevronLeft size={20} /> Voltar para Trilhas
        </button>

        <div className="bg-[#111B21] rounded-3xl p-8 border border-white/10 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <BookOpen size={120} />
          </div>
          
          <h1 className="text-3xl font-black mb-2 relative z-10">{track.title}</h1>
          <p className="text-gray-400 mb-8 relative z-10">{track.description}</p>
          
          <div className="relative z-10">
            <div className="flex justify-between text-sm font-bold text-gray-400 mb-3">
              <span>Seu Progresso</span>
              <span className="text-[#25D366]">{progress}% Concluído</span>
            </div>
            <div className="h-3 w-full bg-black rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#00A884] to-[#25D366] rounded-full transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-3 text-right">{completed.length} de {lessons.length} estudos concluídos</p>
          </div>
        </div>
        
        {modules.length === 0 ? (
          <div className="text-center py-10 bg-[#111B21] rounded-3xl border border-white/5 text-gray-500">
            Nenhum módulo cadastrado nesta trilha ainda.
          </div>
        ) : (
          <div className="space-y-8">
            {modules.map((module) => {
              const modLessons = lessons.filter(l => l.module_id === module.id).sort((a,b) => a.order_index - b.order_index);
              
              // Calcula progresso do módulo
              const completedInModule = modLessons.filter(l => completed.includes(l.id)).length;
              const isModuleCompleted = modLessons.length > 0 && completedInModule === modLessons.length;

              return (
                <div key={module.id} className="bg-[#111B21] rounded-3xl overflow-hidden border border-white/10">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-3">
                      <ListOrdered className="text-[#25D366]" size={24} /> {module.title}
                    </h2>
                    {isModuleCompleted && (
                      <span className="text-xs bg-[#25D366]/20 text-[#25D366] px-3 py-1 rounded-full font-bold flex items-center gap-1">
                        <CheckCircle size={14} /> Módulo Concluído
                      </span>
                    )}
                  </div>
                  
                  {modLessons.length === 0 ? (
                    <div className="p-6 text-gray-500 text-sm italic">Nenhuma aula disponível neste módulo.</div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {modLessons.map((lesson, index) => {
                        const isCompleted = completed.includes(lesson.id);
                        return (
                          <div 
                            key={lesson.id}
                            onClick={() => router.push(`/igreja/${params.slug}/discipulado/${params.track_id}/${lesson.id}`)}
                            className="bg-black/20 hover:bg-[#1A2429] p-4 rounded-2xl border border-white/5 hover:border-[#25D366]/30 cursor-pointer transition-all flex items-center gap-4 group"
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                              isCompleted ? "bg-[#25D366]/20 text-[#25D366]" : "bg-black/50 text-gray-500 group-hover:text-white"
                            )}>
                              {isCompleted ? <CheckCircle size={18} /> : index + 1}
                            </div>
                            
                            <div className="flex-1">
                              <h3 className={cn("font-bold", isCompleted ? "text-gray-300" : "text-white")}>{lesson.title}</h3>
                              {lesson.video_url && (
                                <span className="text-xs text-[#25D366] mt-1 flex items-center gap-1">
                                  <PlayCircle size={12} /> Contém Vídeo
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
