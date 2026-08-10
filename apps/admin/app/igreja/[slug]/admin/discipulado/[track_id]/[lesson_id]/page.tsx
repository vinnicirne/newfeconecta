"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, Video, AlignLeft, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function EditLesson({ params }: { params: { slug: string, track_id: string, lesson_id: string } }) {
  const router = useRouter();
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLesson();
  }, [params.lesson_id]);

  async function loadLesson() {
    const { data } = await supabase.from('church_discipleship_lessons').select('*').eq('id', params.lesson_id).single();
    if (data) {
      setLesson(data);
    } else {
      toast.error("Aula não encontrada.");
      router.push(`/igreja/${params.slug}/admin/discipulado/${params.track_id}`);
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    const { error } = await supabase.from('church_discipleship_lessons').update({
      title: lesson.title,
      video_url: lesson.video_url,
      content: lesson.content
    }).eq('id', lesson.id);

    if (error) {
      toast.error("Erro ao salvar.");
    } else {
      toast.success("Aula salva com sucesso!");
      router.push(`/igreja/${params.slug}/admin/discipulado/${params.track_id}`);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir esta aula?")) return;
    
    const { error } = await supabase.from('church_discipleship_lessons').delete().eq('id', lesson.id);
    if (!error) {
      toast.success("Aula excluída.");
      router.push(`/igreja/${params.slug}/admin/discipulado/${params.track_id}`);
    } else {
      toast.error("Erro ao excluir.");
    }
  }

  if (loading) return <div className="p-10 text-white">Carregando...</div>;
  if (!lesson) return null;

  return (
    <div className="p-6 text-white max-w-4xl mx-auto pb-24">
      <button 
        onClick={() => router.push(`/igreja/${params.slug}/admin/discipulado/${params.track_id}`)}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
      >
        <ChevronLeft size={20} /> Voltar para o Módulo
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black">Editar Aula</h1>
          <p className="text-gray-400">Preencha o conteúdo do estudo abaixo.</p>
        </div>
        <button onClick={handleDelete} className="text-red-400 hover:text-red-300 flex items-center gap-2 px-4 py-2 bg-red-500/10 rounded-xl transition-colors font-bold">
          <Trash2 size={20} /> Excluir Aula
        </button>
      </div>

      <form onSubmit={handleSave} className="bg-[#111B21] border border-white/10 rounded-3xl p-8 space-y-6">
        
        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-400">Título da Aula</label>
          <input 
            type="text" 
            required
            value={lesson.title} 
            onChange={(e) => setLesson({...lesson, title: e.target.value})}
            className="w-full bg-[#1A2429] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#25D366] text-xl font-bold"
            placeholder="Ex: A Importância da Oração"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
            <Video size={16} /> Link do YouTube (Opcional)
          </label>
          <input 
            type="text" 
            value={lesson.video_url || ""}
            onChange={(e) => setLesson({...lesson, video_url: e.target.value})}
            className="w-full bg-[#1A2429] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#25D366]"
            placeholder="https://youtube.com/watch?v=..."
          />
          {lesson.video_url && (
            <p className="text-xs text-[#25D366]">O vídeo será exibido automaticamente no topo do estudo.</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-400 flex items-center gap-2">
            <AlignLeft size={16} /> Conteúdo em Texto
          </label>
          <textarea 
            value={lesson.content || ""}
            onChange={(e) => setLesson({...lesson, content: e.target.value})}
            className="w-full bg-[#1A2429] border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-[#25D366] min-h-[300px] leading-relaxed resize-y"
            placeholder="Escreva todo o conteúdo do estudo aqui... (Você pode pular linhas e usar formatação básica)"
          />
        </div>

        <div className="pt-6 border-t border-white/10 flex flex-col-reverse sm:flex-row justify-end gap-4">
          <button 
            type="button"
            onClick={() => router.push(`/igreja/${params.slug}/admin/discipulado/${params.track_id}`)}
            className="px-6 sm:px-8 py-4 font-bold text-gray-400 hover:text-white text-center w-full sm:w-auto"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={saving}
            className="bg-[#25D366] text-black px-6 sm:px-10 py-4 rounded-xl font-black flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-all disabled:opacity-50 w-full sm:w-auto"
          >
            {saving ? "Salvando..." : <><Save size={20} /> Salvar</>}
          </button>
        </div>
      </form>
    </div>
  );
}
