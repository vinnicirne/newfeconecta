"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, CheckCircle, Circle } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function LessonPage({ params }: { params: { slug: string, track_id: string, lesson_id: string } }) {
  const router = useRouter();
  const [lesson, setLesson] = useState<any>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.lesson_id]);

  async function loadData() {
    const { data: lessonData } = await supabase
      .from('church_discipleship_lessons')
      .select('*')
      .eq('id', params.lesson_id)
      .single();

    if (!lessonData) {
      router.push(`/igreja/${params.slug}/discipulado/${params.track_id}`);
      return;
    }
    setLesson(lessonData);

    const { data: userResponse } = await supabase.auth.getUser();
    if (userResponse?.user) {
      const { data: compData } = await supabase
        .from('user_discipleship_completed_lessons')
        .select('id')
        .eq('user_id', userResponse.user.id)
        .eq('lesson_id', params.lesson_id)
        .single();
        
      if (compData) {
        setIsCompleted(true);
      }
    }
    
    setLoading(false);
  }

  function getYouTubeId(url: string) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  async function toggleComplete() {
    if (marking) return;
    setMarking(true);
    const { data: userResponse } = await supabase.auth.getUser();
    if (!userResponse?.user) {
      toast.error("Faça login para salvar seu progresso.");
      setMarking(false);
      return;
    }

    if (isCompleted) {
      // Unmark
      await supabase
        .from('user_discipleship_completed_lessons')
        .delete()
        .eq('user_id', userResponse.user.id)
        .eq('lesson_id', params.lesson_id);
      setIsCompleted(false);
      toast.success("Estudo desmarcado.");
    } else {
      // Mark as done
      await supabase
        .from('user_discipleship_completed_lessons')
        .insert({
          user_id: userResponse.user.id,
          lesson_id: params.lesson_id
        });
      setIsCompleted(true);
      toast.success("Parabéns! Estudo concluído.");
    }
    setMarking(false);
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Carregando estudo...</div>;
  }

  const vId = getYouTubeId(lesson.video_url);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pb-24 pt-24">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => router.push(`/igreja/${params.slug}/discipulado/${params.track_id}`)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ChevronLeft size={20} /> Voltar para Aulas
        </button>

        <h1 className="text-3xl font-black mb-6">{lesson.title}</h1>

        {vId && (
          <div className="aspect-video bg-black rounded-3xl overflow-hidden mb-8 border border-white/10">
            <iframe
              src={`https://www.youtube.com/embed/${vId}`}
              title={lesson.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {lesson.content && (
          <div 
            className="prose prose-invert prose-green max-w-none mb-12 text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: lesson.content.replace(/\n/g, '<br/>') }}
          />
        )}

        <div className="border-t border-white/10 pt-8 flex justify-center">
          <button
            onClick={toggleComplete}
            disabled={marking}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all text-lg",
              isCompleted 
                ? "bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/50 hover:bg-[#25D366]/30"
                : "bg-white text-black hover:bg-gray-200"
            )}
          >
            {isCompleted ? <CheckCircle size={24} /> : <Circle size={24} className="opacity-50" />}
            {isCompleted ? "Estudo Concluído" : "Marcar como Concluído"}
          </button>
        </div>
      </div>
    </div>
  );
}
