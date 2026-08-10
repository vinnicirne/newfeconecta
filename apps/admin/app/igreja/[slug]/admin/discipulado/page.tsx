"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, BookOpen, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AdminDiscipulado({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [church, setChurch] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTrackTitle, setNewTrackTitle] = useState("");

  useEffect(() => {
    loadData();
  }, [params.slug]);

  async function loadData() {
    const { data: c } = await supabase.from('churches').select('*').eq('slug', params.slug).single();
    if (c) {
      setChurch(c);
      const { data: t } = await supabase.from('church_discipleship_tracks').select('*').eq('church_id', c.id).order('order_index');
      if (t) setTracks(t);
    }
    setLoading(false);
  }

  async function handleCreateTrack() {
    if (!newTrackTitle.trim() || !church) return;
    
    const { data, error } = await supabase.from('church_discipleship_tracks').insert({
      church_id: church.id,
      title: newTrackTitle,
      description: "Descrição da trilha...",
      icon_name: "BookOpen"
    }).select().single();
    
    if (error) {
      toast.error("Erro ao criar trilha: " + error.message);
    } else if (data) {
      setTracks([...tracks, data]);
      toast.success("Trilha criada com sucesso!");
    }
    setShowModal(false);
    setNewTrackTitle("");
  }

  if (loading) return <div className="p-10 text-white">Carregando...</div>;

  return (
    <div className="p-6 text-white max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black">Gestão de Discipulado</h1>
          <p className="text-gray-400">Gerencie as trilhas e os estudos da sua igreja.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-[#25D366] text-black px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-[#20bd5a]">
          <Plus size={20} /> Nova Trilha
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tracks.map(track => (
          <div key={track.id} className="bg-[#111B21] border border-white/10 p-6 rounded-3xl flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center">
                <BookOpen className="text-[#25D366]" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{track.title}</h3>
                <p className="text-sm text-gray-400 mt-1">{track.description}</p>
                <div className="mt-3 text-xs text-gray-500 font-bold uppercase tracking-wider bg-black/30 inline-block px-3 py-1 rounded-full">
                  {track.lessons_count} Estudos
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => router.push(`/igreja/${params.slug}/admin/discipulado/${track.id}`)}
              className="bg-white/10 p-3 rounded-xl hover:bg-white/20 transition-colors"
            >
              <Settings size={20} />
            </button>
          </div>
        ))}
      </div>
      
      {tracks.length === 0 && (
        <div className="text-center py-20 bg-[#111B21] rounded-3xl border border-white/5">
          <p className="text-gray-400">Nenhuma trilha criada. Clique em "Nova Trilha" para começar.</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start pt-4 sm:pt-0 sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleCreateTrack(); }}
            className="bg-[#111B21] rounded-3xl p-8 max-w-md w-full border border-white/10 shadow-2xl"
          >
            <h3 className="text-xl font-bold mb-4">Nova Trilha</h3>
            <input 
              type="text"
              autoFocus
              value={newTrackTitle}
              onChange={e => setNewTrackTitle(e.target.value)}
              placeholder="Ex: Primeiros Passos"
              className="w-full bg-[#1A2429] border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-[#25D366] mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                className="px-6 py-3 font-bold text-gray-400 hover:text-white"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="bg-[#25D366] text-black px-6 py-3 rounded-xl font-bold hover:bg-[#20bd5a]"
              >
                Criar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
