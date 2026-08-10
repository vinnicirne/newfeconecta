import { useState, useEffect } from "react";
import { X, Users, UserPlus, Link2, Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface MembersManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  churchId: string;
  isLeader: boolean;
  churchSlug: string;
  onMemberAdded?: () => void;
}

export function MembersManagerModal({ isOpen, onClose, groupId, churchId, isLeader, churchSlug, onMemberAdded }: MembersManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'add' | 'requests'>('members');
  const [members, setMembers] = useState<any[]>([]);
  const [churchMembers, setChurchMembers] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, groupId]);

  async function loadData() {
    setLoading(true);
    
    // Load group members
    const { data: groupMembersData } = await supabase
      .from('church_group_members')
      .select('user_id, role, profiles:user_id(id, full_name, avatar_url)')
      .eq('group_id', groupId);
      
    const currentMembers = groupMembersData || [];
    setMembers(currentMembers);

    // If leader, load church members that are not in the group
    if (isLeader) {
      const currentMemberIds = currentMembers.map(m => m.user_id);
      
      const { data: churchMembersData } = await supabase
        .from('church_members')
        .select('user_id, profiles:user_id(id, full_name, avatar_url, username)')
        .eq('church_id', churchId)
        .eq('approved', true);
        
      if (churchMembersData) {
        const available = churchMembersData.filter(m => !currentMemberIds.includes(m.user_id));
        setChurchMembers(available);
      }

      // Load pending requests
      const { data: requestsData } = await supabase
        .from('church_group_requests')
        .select('id, user_id, status, profiles:user_id(id, full_name, avatar_url)')
        .eq('group_id', groupId)
        .eq('status', 'pending');
        
      setRequests(requestsData || []);
    }
    
    setLoading(false);
  }

  const handleAddMember = async (userId: string, userName: string) => {
    setAddingId(userId);
    try {
      // 1. Inserir na tabela
      const { error: insertError } = await supabase
        .from('church_group_members')
        .insert({ group_id: groupId, user_id: userId });
        
      if (insertError) throw insertError;
      
      // 2. Disparar notificação pro Feed (Aviso)
      await supabase
        .from('church_events')
        .insert({
          church_id: churchId,
          reference_type: `group_notice`, // Genérico para avisos do grupo
          reference_id: groupId,
          title: `👋 ${userName} acabou de ser adicionado(a) ao ministério! Dêem as boas-vindas!`,
          event_date: new Date().toISOString(),
          metadata: { isSystem: true },
          created_by: userId
        });
        
      toast.success(`${userName} adicionado com sucesso!`);
      loadData();
      if (onMemberAdded) onMemberAdded();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setAddingId(null);
    }
  };

  const handleApproveRequest = async (requestId: string, userId: string, userName: string) => {
    setAddingId(requestId); // Reuse addingId for UI loading state
    try {
      // Update request status
      await supabase
        .from('church_group_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);

      // Add to group
      await supabase
        .from('church_group_members')
        .insert({ group_id: groupId, user_id: userId });

      // Announce in feed
      await supabase
        .from('church_events')
        .insert({
          church_id: churchId,
          reference_type: `group_notice`,
          reference_id: groupId,
          title: `👋 ${userName} teve sua solicitação aprovada e entrou no ministério! Dêem as boas-vindas!`,
          event_date: new Date().toISOString(),
          metadata: { isSystem: true },
          created_by: userId
        });

      toast.success(`Solicitação de ${userName} aprovada!`);
      loadData();
      if (onMemberAdded) onMemberAdded();
    } catch (err: any) {
      toast.error(`Erro ao aprovar: ${err.message}`);
    } finally {
      setAddingId(null);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setAddingId(userId); // usando addingId como loading
    try {
      const { error } = await supabase
        .from('church_group_members')
        .update({ role: newRole })
        .eq('group_id', groupId)
        .eq('user_id', userId);
        
      if (error) throw error;
      toast.success("Nível de acesso atualizado!");
      loadData();
    } catch (err: any) {
      toast.error(`Erro ao atualizar: ${err.message}`);
    } finally {
      setAddingId(null);
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/igreja/${churchSlug}/celula/${groupId}?invite=true`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
    } else {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        textArea.remove();
      } catch (err) {
        toast.error("Erro ao copiar. Tente selecionar o link manualmente.");
        return;
      }
    }
    
    setCopied(true);
    toast.success("Link copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };
  
  const shareLink = async () => {
    const link = `${window.location.origin}/igreja/${churchSlug}/celula/${groupId}?invite=true`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Convite para o Ministério',
          text: 'Você foi convidado para participar do nosso Ministério/Célula. Clique para entrar!',
          url: link,
        });
      } catch (e) {
        copyInviteLink();
      }
    } else {
      copyInviteLink();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className="w-full max-w-md bg-white dark:bg-[#111B21] rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between shrink-0">
          <h3 className="font-black uppercase tracking-widest text-xs text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="text-[#25D366]" size={16} />
            Membros do Grupo
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-all">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {isLeader && (
          <div className="flex border-b border-black/5 dark:border-white/5 shrink-0">
              <button 
                onClick={() => setActiveTab('members')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'members' ? 'border-[#25D366] text-[#25D366]' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                Membros ({members.length})
              </button>
              {isLeader && (
                <>
                  <button 
                    onClick={() => setActiveTab('requests')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors relative ${activeTab === 'requests' ? 'border-[#25D366] text-[#25D366]' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    Solicitações
                    {requests.length > 0 && (
                      <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
                    )}
                  </button>
                  <button 
                    onClick={() => setActiveTab('add')}
                    className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'add' ? 'border-[#25D366] text-[#25D366]' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    Adicionar
                  </button>
                </>
              )}
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 no-scrollbar">
          {loading ? (
            <div className="text-center py-10 text-gray-400 font-bold uppercase tracking-widest text-xs">Carregando...</div>
          ) : (
            <>
              {activeTab === 'members' && (
                <div className="space-y-4">
                  {/* Member Search */}
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Buscar membro..."
                      className="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none text-gray-900 dark:text-white"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
                    </div>
                  </div>

                  {members.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">Nenhum membro encontrado</p>
                    </div>
                  ) : (
                    members.map((member: any) => (
                      <div key={member.user_id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1A2429] rounded-xl border border-black/5 dark:border-white/5">
                        <img 
                          src={member.profiles?.avatar_url || 'https://via.placeholder.com/40'} 
                          className="w-10 h-10 rounded-full object-cover bg-black/5 dark:bg-white/5"
                        />
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 dark:text-white leading-tight">
                            {member.profiles?.full_name || member.profiles?.username || 'Usuário'}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {member.role === 'leader' || member.role === 'admin' ? 'Líder / Admin' : 'Membro'}
                          </p>
                        </div>
                        {isLeader && (
                          <div className="shrink-0">
                            {addingId === member.user_id ? (
                              <div className="w-4 h-4 border-2 border-[#25D366] border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <select 
                                value={member.role || 'member'} 
                                onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                                className="text-xs bg-white dark:bg-black/20 border border-black/10 dark:border-white/10 rounded-lg px-2 py-1 outline-none text-gray-700 dark:text-gray-300 focus:border-[#25D366]"
                              >
                                <option value="member">Membro</option>
                                <option value="admin">Administrador</option>
                                <option value="leader">Líder</option>
                              </select>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'add' && (
                <div className="space-y-6">
                  {/* Convite por link */}
                  <div className="bg-[#25D366]/10 p-4 rounded-2xl border border-[#25D366]/20">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="bg-[#25D366] text-white p-2 rounded-xl shrink-0">
                        <Link2 size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#25D366]">Convite por Link</h4>
                        <p className="text-xs text-[#25D366]/80 leading-relaxed mt-0.5">
                          Qualquer membro da igreja que acessar este link entrará na célula automaticamente.
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={copyInviteLink}
                      className="w-full bg-white dark:bg-black/20 text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366] hover:text-white py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      {copied ? (
                        <><Check size={16} /> Copiado!</>
                      ) : (
                        <><Copy size={16} /> Copiar Link de Convite</>
                      )}
                    </button>
                  </div>

                  {/* Adicionar da Igreja */}
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-3 text-sm flex items-center gap-2">
                      <Users size={16} className="text-[#25D366]" />
                      Membros da Igreja
                    </h4>
                    
                    {churchMembers.length === 0 ? (
                      <p className="text-xs text-gray-500 text-center py-4">Todos os membros da igreja já estão neste grupo.</p>
                    ) : (
                      <div className="space-y-3">
                        {churchMembers.map((m: any) => (
                          <div key={m.user_id} className="flex items-center gap-3 p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors">
                            <img 
                              src={m.profiles?.avatar_url || 'https://via.placeholder.com/32'} 
                              className="w-8 h-8 rounded-full object-cover bg-black/5 dark:bg-white/5"
                            />
                            <div className="flex-1">
                              <p className="font-bold text-gray-900 dark:text-white text-sm">{m.profiles?.full_name || m.profiles?.username || 'Usuário'}</p>
                            </div>
                            <button
                              onClick={() => handleAddMember(m.user_id, m.profiles?.full_name || 'Usuário')}
                              disabled={addingId === m.user_id}
                              className="w-8 h-8 flex items-center justify-center bg-black/5 dark:bg-white/10 hover:bg-[#25D366] hover:text-black text-gray-600 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {addingId === m.user_id ? (
                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <UserPlus size={16} />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'requests' && isLeader && (
                <div className="space-y-4">
                  {requests.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Nenhuma solicitação pendente no momento.
                    </div>
                  ) : (
                    requests.map((req: any) => (
                      <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1A2429] rounded-xl border border-black/5 dark:border-white/5">
                        <div className="flex items-center gap-3">
                          <img 
                            src={req.profiles?.avatar_url || 'https://via.placeholder.com/40'} 
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <div className="font-bold text-gray-900 dark:text-white">{req.profiles?.full_name}</div>
                            <div className="text-xs text-gray-500">Deseja entrar no grupo</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleApproveRequest(req.id, req.user_id, req.profiles?.full_name)}
                          disabled={addingId === req.id}
                          className="bg-[#25D366] hover:bg-[#1DA851] text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                        >
                          {addingId === req.id ? 'Aprovando...' : 'Aprovar'}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
