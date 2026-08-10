"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Users, Plus, Flame } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { GroupService, ChurchGroup } from "../../../../features/church/services/group.service";
import { GroupCard } from "../../../../features/church/components/GroupCard";
import { GroupFormModal } from "../../../../features/church/components/GroupFormModal";
import { useChurch } from "@/contexts/ChurchContext";

export default function ChurchGroups({ params }: { params: { slug: string } }) {
  const router = useRouter();

  // ✅ Dados compartilhados do layout — sem re-fetch de church/user/member
  const { church, currentUser, isMember, role } = useChurch();

  const [groups, setGroups] = useState<ChurchGroup[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userGroups, setUserGroups] = useState<string[]>([]);
  const [userRequests, setUserRequests] = useState<string[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'cell' | 'ministry'>('cell');
  const [editingGroup, setEditingGroup] = useState<ChurchGroup | undefined>(undefined);

  useEffect(() => {
    if (church?.id && currentUser?.id) {
      loadData();
    }
  }, [church?.id, currentUser?.id]);

  async function loadData() {
    setLoading(true);
    try {
      const isAdmin = role === 'admin' || role === 'leader' || role === 'pastor';

      // ✅ Rodada única: grupos + grupos do user + pedidos + membros admin — todos em paralelo
      const [groupData, { data: myGroups }, { data: myRequests }, membersResult] = await Promise.all([
        GroupService.getGroups(church.id),
        supabase.from('church_group_members').select('group_id').eq('user_id', currentUser.id),
        supabase.from('church_group_requests').select('group_id').eq('user_id', currentUser.id).eq('status', 'pending'),
        isAdmin
          ? supabase.from('church_members').select('user_id, profiles(full_name, username)').eq('church_id', church.id).eq('approved', true)
          : Promise.resolve({ data: null })
      ]);

      setGroups((groupData as ChurchGroup[]) || []);
      if (myGroups) setUserGroups(myGroups.map(g => g.group_id));
      if (myRequests) setUserRequests(myRequests.map(r => r.group_id));
      if (membersResult.data) setMembers(membersResult.data);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar grupos.");
    } finally {
      setLoading(false);
    }
  }

  // Permissões
  const isChurchAdmin = isMember && members.length > 0;
  const canManageGroup = (groupLeaderId: string) => isChurchAdmin || (currentUser?.id === groupLeaderId);

  // Filtrar grupos invisíveis para quem não tem permissão
  const visibleGroups = groups.filter(g =>
    g.privacy !== 'invisible' || isChurchAdmin || g.leader_id === currentUser?.id
  );

  // Handlers CRUD
  const handleOpenCreate = (type: 'cell' | 'ministry') => {
    setModalType(type);
    setEditingGroup(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group: ChurchGroup) => {
    setModalType(group.type);
    setEditingGroup(group);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Omit<ChurchGroup, 'id' | 'church_id' | 'created_at'>) => {
    try {
      if (editingGroup) {
        const updated = await GroupService.updateGroup(editingGroup.id, data);
        setGroups(prev => prev.map(g => g.id === editingGroup.id ? updated : g));
        toast.success(`${modalType === 'cell' ? 'Célula' : 'Ministério'} atualizado(a)!`);
      } else {
        const created = await GroupService.createGroup({
          ...data,
          church_id: church.id
        });
        setGroups(prev => [...prev, created]);
        toast.success(`${modalType === 'cell' ? 'Célula' : 'Ministério'} criado(a)!`);
      }
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "desconhecido"));
      throw err;
    }
  };

  const handleDelete = async (group: ChurchGroup) => {
    if (!window.confirm(`Tem certeza que deseja excluir ${group.type === 'cell' ? 'a Célula' : 'o Ministério'} "${group.name}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await GroupService.deleteGroup(group.id);
      setGroups(prev => prev.filter(g => g.id !== group.id));
      toast.success("Excluído com sucesso!");
    } catch (err) {
      toast.error("Erro ao excluir.");
    }
  };

  const handleEnterGroup = (groupId: string) => {
    router.push(`/igreja/${params.slug}/celula/${groupId}`);
  };

  const handleJoinRequest = async (groupId: string, privacy: string) => {
    if (!isMember || !currentUser) {
      toast.error("Você precisa ser membro desta igreja para participar dos grupos.");
      return;
    }

    try {
      if (privacy === 'public') {
        const { error } = await supabase
          .from('church_group_members')
          .insert({ group_id: groupId, user_id: currentUser.id });

        if (error) throw error;

        await supabase.from('church_events').insert({
          church_id: church.id,
          reference_type: 'group_notice',
          reference_id: groupId,
          title: `👋 ${currentUser.user_metadata?.full_name || 'Um novo membro'} entrou no grupo! Dêem as boas-vindas!`,
          event_date: new Date().toISOString(),
          metadata: { isSystem: true },
          created_by: currentUser.id
        });

        setUserGroups(prev => [...prev, groupId]);
        toast.success("Você entrou no grupo!");
      } else {
        const { error } = await supabase
          .from('church_group_requests')
          .upsert(
            { group_id: groupId, user_id: currentUser.id, status: 'pending' },
            { onConflict: 'group_id,user_id' }
          );

        if (error) {
          console.error("Upsert error:", error);
          if (error.code === '23505') {
            toast.error("Você já tem uma solicitação pendente para este grupo.");
            setUserRequests(prev => [...prev, groupId]);
          } else if (error.code === '42501') {
            toast.error("Você não tem permissão para enviar uma nova solicitação no momento.");
          } else {
            throw error;
          }
        } else {
          setUserRequests(prev => [...prev, groupId]);
          toast.success("Solicitação enviada ao líder do grupo!");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar solicitação.");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A] text-gray-900 dark:text-white pb-20">
      <div className="sticky top-0 bg-white/90 dark:bg-[#111B21]/95 backdrop-blur-md border-b border-black/5 dark:border-[#25D366]/20 z-50 p-5">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-black">Células &amp; Ministérios</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{church?.name}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-5 pt-8">
        {loading ? (
          <div className="text-center py-20 text-gray-400 font-bold uppercase tracking-widest text-xs">Carregando...</div>
        ) : (
          <div className="space-y-12">
            {/* Células */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Flame className="text-orange-400" /> Células
                </h2>
                {isChurchAdmin && (
                  <button
                    onClick={() => handleOpenCreate('cell')}
                    className="text-[#25D366] flex items-center gap-1 text-sm font-bold bg-[#25D366]/10 px-4 py-2 rounded-xl hover:bg-[#25D366]/20 transition-colors"
                  >
                    <Plus size={18} /> Nova Célula
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleGroups.filter(g => g.type === 'cell').map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isAdminOrLeader={canManageGroup(group.leader_id)}
                    isMember={userGroups.includes(group.id)}
                    hasPendingRequest={userRequests.includes(group.id)}
                    isChurchMember={isMember}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                    onEnter={handleEnterGroup}
                    onJoinRequest={handleJoinRequest}
                  />
                ))}
                {visibleGroups.filter(g => g.type === 'cell').length === 0 && (
                  <p className="text-gray-500 text-sm">Nenhuma célula encontrada.</p>
                )}
              </div>
            </div>

            {/* Ministérios */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="text-[#25D366]" /> Ministérios
                </h2>
                {isChurchAdmin && (
                  <button
                    onClick={() => handleOpenCreate('ministry')}
                    className="text-gray-900 dark:text-white flex items-center gap-1 text-sm font-bold bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-4 py-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    <Plus size={18} /> Novo Ministério
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visibleGroups.filter(g => g.type !== 'cell').map((group) => (
                  <GroupCard
                    key={group.id}
                    group={group}
                    isAdminOrLeader={canManageGroup(group.leader_id)}
                    isMember={userGroups.includes(group.id)}
                    hasPendingRequest={userRequests.includes(group.id)}
                    isChurchMember={isMember}
                    onEdit={handleOpenEdit}
                    onDelete={handleDelete}
                    onEnter={handleEnterGroup}
                    onJoinRequest={handleJoinRequest}
                  />
                ))}
                {visibleGroups.filter(g => g.type !== 'cell').length === 0 && (
                  <p className="text-gray-500 text-sm">Nenhum ministério encontrado.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <GroupFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingGroup}
        type={modalType}
        churchMembers={members}
      />
    </div>
  );
}
