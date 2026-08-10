"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, ChevronLeft, Edit2, ListOrdered, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AdminLessons({ params }: { params: { slug: string, track_id: string } }) {
  const router = useRouter();
  const [track, setTrack] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal para criar Módulo
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");

  // Modal para criar Aula (precisa saber em qual módulo)
  const [showLessonModal, setShowLessonModal] = useState<string | null>(null);
  const [newLessonTitle, setNewLessonTitle] = useState("");

  useEffect(() => {
    loadData();
  }, [params.track_id]);

  async function loadData() {
    const { data: t } = await supabase.from('church_discipleship_tracks').select('*').eq('id', params.track_id).single();
    if (t) setTrack(t);
    
    const { data: m } = await supabase.from('church_discipleship_modules').select('*').eq('track_id', params.track_id).order('order_index');
    if (m) setModules(m);
    
    const { data: l } = await supabase.from('church_discipleship_lessons').select('*').eq('track_id', params.track_id).order('order_index');
    if (l) setLessons(l);
    
    setLoading(false);
  }

  async function handleAddModule() {
    if (!newModuleTitle.trim()) return;
    
    const { data, error } = await supabase.from('church_discipleship_modules').insert({
      track_id: params.track_id,
      title: newModuleTitle,
      order_index: modules.length
    }).select().single();

    if (data) {
      setModules([...modules, data]);
      toast.success("Módulo criado!");
    }
    setShowModuleModal(false);
    setNewModuleTitle("");
  }

  async function handleAddLesson(moduleId: string) {
    if (!newLessonTitle.trim()) return;
    
    const modLessons = lessons.filter(l => l.module_id === moduleId);

    const newLesson = {
      track_id: params.track_id,
      module_id: moduleId,
      title: newLessonTitle,
      content: "",
      video_url: "",
      order_index: modLessons.length
    };
    
    const { data, error } = await supabase.from('church_discipleship_lessons').insert(newLesson).select().single();
    if (data) {
      setLessons([...lessons, data]);
      await supabase.from('church_discipleship_tracks').update({ lessons_count: lessons.length + 1 }).eq('id', params.track_id);
      toast.success("Aula criada!");
      // Opcional: Redirecionar direto para a página de edição:
      // router.push(`/igreja/${params.slug}/admin/discipulado/${params.track_id}/${data.id}`);
    }
    setShowLessonModal(null);
    setNewLessonTitle("");
  }

  if (loading) return <div className="p-10 text-white">Carregando...</div>;

  return (
    <div className="p-6 text-white max-w-4xl mx-auto pb-24">
      <button 
        onClick={() => router.push(`/igreja/${params.slug}/admin/discipulado`)}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-8"
      >
        <ChevronLeft size={20} /> Voltar para Trilhas
      </button>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black">{track?.title}</h1>
          <p className="text-gray-400">Organize os estudos em módulos estruturados.</p>
        </div>
        <button onClick={() => setShowModuleModal(true)} className="bg-[#25D366] text-black px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#20bd5a] shrink-0">
          <Plus size={20} /> Novo Módulo
        </button>
      </div>

      <div className="space-y-8">
        {modules.map((module) => {
          const modLessons = lessons.filter(l => l.module_id === module.id).sort((a,b) => a.order_index - b.order_index);
          return (
            <div key={module.id} className="bg-[#111B21] border border-white/10 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <ListOrdered className="text-[#25D366]" /> {module.title}
                </h2>
                <button 
                  onClick={() => setShowLessonModal(module.id)} 
                  className="bg-white/10 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-white/20 transition-colors text-sm"
                >
                  <Plus size={16} /> Nova Aula
                </button>
              </div>

              <div className="space-y-3">
                {modLessons.map((lesson, index) => (
                  <div key={lesson.id} className="flex items-center justify-between bg-[#1A2429] p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-black/40 text-[#25D366] flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <span className="font-bold">{lesson.title}</span>
                    </div>
                    <button
                      onClick={() => router.push(`/igreja/${params.slug}/admin/discipulado/${params.track_id}/${lesson.id}`)}
                      className="bg-white/5 p-2 rounded-xl hover:bg-[#25D366]/20 hover:text-[#25D366] transition-colors"
                      title="Editar Conteúdo"
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                ))}
                
                {modLessons.length === 0 && (
                  <div className="text-gray-500 text-sm italic py-4 text-center">Nenhuma aula neste módulo.</div>
                )}
              </div>
            </div>
          );
        })}

        {modules.length === 0 && (
          <div className="text-center py-20 bg-[#111B21] rounded-3xl border border-white/5 text-gray-400">
            Nenhum módulo criado. Clique em "Novo Módulo" para começar (Ex: Conhecendo Jesus).
          </div>
        )}
      </div>

      {showModuleModal && (
        <div className="fixed inset-0 z-50 flex items-start pt-4 sm:pt-0 sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleAddModule(); }}
            className="bg-[#111B21] rounded-3xl p-8 max-w-md w-full border border-white/10 shadow-2xl"
          >
            <h3 className="text-xl font-bold mb-4">Novo Módulo</h3>
            <input 
              type="text"
              autoFocus
              value={newModuleTitle}
              onChange={e => setNewModuleTitle(e.target.value)}
              placeholder="Ex: Módulo 1 - Conhecendo a Jesus"
              className="w-full bg-[#1A2429] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#25D366] mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowModuleModal(false)} className="px-6 py-3 font-bold text-gray-400 hover:text-white">
                Cancelar
              </button>
              <button type="submit" className="bg-[#25D366] text-black px-6 py-3 rounded-xl font-bold hover:bg-[#20bd5a]">
                Criar
              </button>
            </div>
          </form>
        </div>
      )}

      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-start pt-4 sm:pt-0 sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleAddLesson(showLessonModal); }}
            className="bg-[#111B21] rounded-3xl p-8 max-w-md w-full border border-white/10 shadow-2xl"
          >
            <h3 className="text-xl font-bold mb-4">Nova Aula</h3>
            <input 
              type="text"
              autoFocus
              value={newLessonTitle}
              onChange={e => setNewLessonTitle(e.target.value)}
              placeholder="Ex: O Batismo nas Águas"
              className="w-full bg-[#1A2429] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#25D366] mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowLessonModal(null)} className="px-6 py-3 font-bold text-gray-400 hover:text-white">
                Cancelar
              </button>
              <button type="submit" className="bg-[#25D366] text-black px-6 py-3 rounded-xl font-bold hover:bg-[#20bd5a]">
                Criar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
