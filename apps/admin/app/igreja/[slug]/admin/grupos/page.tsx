"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function GruposAdminPage({ params }: { params: { slug: string } }) {
  const [church, setChurch] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState("");
  const [type, setType] = useState("Célula");

  useEffect(() => {
    loadData();
  }, [params.slug]);

  async function loadData() {
    const { data: churchData } = await supabase
      .from('churches')
      .select('*')
      .eq('slug', params.slug)
      .single();

    if (churchData) {
      setChurch(churchData);
      const { data: groupsData } = await supabase
        .from('church_groups')
        .select('*')
        .eq('church_id', churchData.id);

      setGroups(groupsData || []);
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;

    const { error } = await supabase.from('church_groups').insert({
      church_id: church.id,
      name,
      type
    });

    if (error) {
      toast.error("Erro ao criar grupo.");
    } else {
      toast.success(`${type} criada com sucesso!`);
      setName("");
      loadData();
    }
  }

  async function handleDelete(id: string) {
    if(!confirm("Tem certeza que deseja excluir?")) return;
    await supabase.from('church_groups').delete().eq('id', id);
    toast.success("Excluído com sucesso.");
    loadData();
  }

  if (loading) return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Carregando painel de grupos...</div>;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6 pt-24 pb-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black mb-2 flex items-center gap-3">
          <Shield className="text-[#25D366]" /> Gestão de Grupos
        </h1>
        <p className="text-gray-400 mb-8">{church?.name}</p>

        {/* Form Criar */}
        <div className="bg-[#111B21] border border-white/5 p-6 rounded-3xl mb-8">
          <h2 className="text-xl font-bold mb-4">Adicionar Novo Grupo</h2>
          <form onSubmit={handleCreate} className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Nome (ex: Célula Betel, Min. de Louvor)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="flex-1 bg-[#1A2429] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366]"
              required
            />
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="bg-[#1A2429] border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-[#25D366]"
            >
              <option value="Célula">Célula</option>
              <option value="Ministério">Ministério</option>
              <option value="Departamento">Departamento</option>
            </select>
            <button type="submit" className="bg-[#25D366] text-black px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#00A884] transition-all">
              <Plus size={20} /> Criar
            </button>
          </form>
        </div>

        {/* Lista de Grupos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <div key={group.id} className="bg-[#1A2429] border border-white/5 p-5 rounded-2xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{group.name}</h3>
                <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-300 mt-1 inline-block">{group.type}</span>
              </div>
              <button onClick={() => handleDelete(group.id)} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {groups.length === 0 && (
            <p className="text-gray-500 col-span-2 text-center py-10">Nenhum grupo cadastrado ainda.</p>
          )}
        </div>
      </div>
    </div>
  );
}
