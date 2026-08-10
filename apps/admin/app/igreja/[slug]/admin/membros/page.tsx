"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { UserCheck, UserX, Shield, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useChurch } from "@/contexts/ChurchContext";

export default function ChurchMembersApproval({ params }: { params: { slug: string } }) {
  const { refreshChurchData } = useChurch();
  const [pending, setPending] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [church, setChurch] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [params.slug]);

  async function loadData() {
    // Igreja
    const { data: churchData } = await supabase
      .from('churches')
      .select('*')
      .eq('slug', params.slug)
      .single();
    setChurch(churchData);

    if (!churchData) {
      setLoading(false);
      return;
    }

    // Pedidos Pendentes
    const { data: pendingData } = await supabase
      .from('church_join_requests')
      .select('*, user:profiles(id, full_name, avatar_url, username)')
      .eq('church_id', churchData.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    setPending(pendingData || []);

    // Membros Aprovados
    const { data: approvedData } = await supabase
      .from('church_members')
      .select('*, user:profiles(id, full_name, avatar_url, username)')
      .eq('church_id', churchData.id)
      .eq('approved', true);

    setApproved(approvedData || []);
    setLoading(false);
  }

  async function approveMember(requestId: string, userId: string) {
    // Atualiza pedido
    await supabase
      .from('church_join_requests')
      .update({ status: 'approved' })
      .eq('id', requestId);

    // Adiciona como membro
    await supabase
      .from('church_members')
      .insert({
        church_id: church.id,
        user_id: userId,
        role: 'member',
        approved: true
      });

    // Atualiza o perfil para exibir a igreja
    await supabase
      .from('profiles')
      .update({ church: church.name })
      .eq('id', userId);

    toast.success("Membro aprovado com sucesso! 🙌");
    loadData();
  }

  async function updateMemberRole(userId: string, newRole: string) {
    const { error } = await supabase
      .from('church_members')
      .update({ role: newRole })
      .eq('church_id', church.id)
      .eq('user_id', userId);

    if (error) {
      toast.error("Erro ao atualizar função.");
    } else {
      toast.success("Função atualizada!");
      loadData();
    }
  }

  async function rejectMember(requestId: string) {
    await supabase
      .from('church_join_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    toast.info("Pedido rejeitado.");
    loadData();
  }

  async function approveAllMembers() {
    if (pending.length === 0) return;
    setLoading(true);
    for (const req of pending) {
      await supabase.from('church_join_requests').update({ status: 'approved' }).eq('id', req.id);
      await supabase.from('church_members').insert({
        church_id: church.id,
        user_id: req.user.id,
        role: 'member',
        approved: true
      });
      await supabase.from('profiles').update({ church: church.name }).eq('id', req.user.id);
    }
    setLoading(false);
    toast.success("Todos os membros foram aprovados! 🙌");
    loadData();
  }

  async function rejectAllMembers() {
    if (pending.length === 0) return;
    setLoading(true);
    for (const req of pending) {
      await supabase.from('church_join_requests').update({ status: 'rejected' }).eq('id', req.id);
    }
    setLoading(false);
    toast.info("Todos os pedidos foram rejeitados.");
    loadData();
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center text-white">Carregando membros...</div>;
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black mb-2">Gestão de Membros</h1>
        <p className="text-gray-400">{church?.name}</p>

        {/* Pedidos Pendentes */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-3 text-orange-400">
              <Clock /> Pedidos Pendentes ({pending.length})
            </h2>
            {pending.length > 1 && (
              <div className="flex gap-2">
                <button onClick={rejectAllMembers} className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold transition-all">
                  Rejeitar Todos
                </button>
                <button onClick={approveAllMembers} className="px-4 py-2 bg-[#25D366] hover:bg-[#00A884] text-black rounded-xl text-sm font-bold transition-all">
                  Aprovar Todos
                </button>
              </div>
            )}
          </div>

          {pending.length === 0 ? (
            <div className="bg-[#111B21] rounded-3xl p-8 text-center text-gray-400">
              Nenhum pedido de entrada no momento.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pending.map((req) => (
                <div key={req.id} className="bg-[#111B21] rounded-3xl p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <img 
                      src={req.user?.avatar_url || "https://via.placeholder.com/64"} 
                      className="w-14 h-14 rounded-full object-cover border-2 border-white/10" 
                    />
                    <div className="flex-1 truncate">
                      <p className="font-bold text-lg truncate">{req.user?.full_name}</p>
                      <p className="text-gray-400 text-sm truncate">@{req.user?.username}</p>
                    </div>
                  </div>
                  
                  {req.message && (
                    <div className="bg-black/20 p-3 rounded-xl">
                      <p className="text-sm italic text-gray-300">"{req.message}"</p>
                    </div>
                  )}

                  <div className="flex gap-2 w-full mt-2">
                    <button 
                      onClick={() => rejectMember(req.id)}
                      className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-bold transition-all text-sm"
                    >
                      Rejeitar
                    </button>
                    <button 
                      onClick={() => approveMember(req.id, req.user.id)}
                      className="flex-1 py-3 bg-[#25D366] text-black rounded-xl font-bold hover:bg-[#00A884] transition-all text-sm"
                    >
                      Aprovar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Membros Ativos */}
        <div className="mt-16">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
            <Users /> Membros Ativos ({approved.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approved.map((member) => (
              <div key={member.user_id} className="bg-[#111B21] p-6 rounded-3xl flex items-center gap-5">
                <img src={member.user?.avatar_url || "https://via.placeholder.com/64"} className="w-14 h-14 rounded-2xl" />
                <div className="flex-1">
                  <p className="font-bold">{member.user?.full_name}</p>
                  <p className="text-xs text-gray-400">@{member.user?.username}</p>
                </div>
                
                <select
                  value={member.role}
                  onChange={(e) => updateMemberRole(member.user_id, e.target.value)}
                  className="text-xs px-2 py-2 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20 rounded-full font-medium outline-none cursor-pointer"
                >
                  <option value="member">Membro</option>
                  <option value="leader">Líder</option>
                  <option value="admin">Admin</option>
                  <option value="pastor">Pastor(a)</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
