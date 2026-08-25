"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Plus, Search, MoreHorizontal, RefreshCw, Clock, Compass, Navigation, Eye, X, Mail, Church, Calendar, AtSign, ShieldCheck, UserCircle2, ChevronLeft, ChevronRight, BadgeCheck, ShieldAlert, UserPlus, UserMinus, Edit2, Bell, BellOff, Globe, Smartphone, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import moment from "moment";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { VerificationBadge } from "@/components/verification-badge";
import { DigitalCredentialModal } from "@/components/admin/DigitalCredentialModal";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { ForceNotificationModal } from "@/components/admin/ForceNotificationModal";


function formatTimeSpent(enteredAt: string | undefined): string {
  if (!enteredAt) return "agora";
  const ms = Date.now() - new Date(enteredAt).getTime();
  if (ms < 0) return "agora";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remSec}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<'feconecta' | 'fenamoro'>('feconecta');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowingSelected, setIsFollowingSelected] = useState(false);
  const [isCredentialOpen, setIsCredentialOpen] = useState(false);
  const [credentialUser, setCredentialUser] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);
  const [isForceNotifOpen, setIsForceNotifOpen] = useState(false);
  const [forceNotifUser, setForceNotifUser] = useState<any | null>(null);
  const PAGE_SIZE = 15;
  const [realtimePresenceMap, setRealtimePresenceMap] = useState<Record<string, any>>({});
  const [tick, setTick] = useState(0);

  // Tique-taque a cada 5 segundos para atualizar os cronômetros de tempo de página
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  // Escutar sincronização de presença em tempo real
  useEffect(() => {
    const handleSync = (e: any) => {
      if (e.detail?.state) {
        const state = e.detail.state;
        const map: Record<string, any> = {};
        Object.entries(state).forEach(([userId, presences]: [string, any]) => {
          if (Array.isArray(presences) && presences.length > 0) {
            map[userId] = presences[presences.length - 1];
          }
        });
        setRealtimePresenceMap(map);
      }
    };

    window.addEventListener('presence-sync', handleSync);
    return () => window.removeEventListener('presence-sync', handleSync);
  }, []);


  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('profiles').select('*').eq('id', user.id).single()
          .then(({ data }) => setCurrentUser(data || user));
      }
    });
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchOnlineUsers();
  }, [page, search, activeTab]);

  const fetchOnlineUsers = async () => {
    const activeCutoff = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    const table = activeTab === 'feconecta' ? 'profiles' : 'dating_profiles';
    const { data } = await supabase
      .from(table)
      .select('id, full_name, avatar_url, updated_at, username, role')
      .gt('updated_at', activeCutoff)
      .order('updated_at', { ascending: false });
    if (data) setOnlineUsers(data);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const table = activeTab === 'feconecta' ? 'profiles' : 'dating_profiles';

      let query = supabase
        .from(table)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (search.trim()) {
        query = query.or(
          `full_name.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      const { data, count, error } = await query;

      if (error) {
        console.error("Error fetching users:", error);
      } else {
        setUsers(data || []);
        setTotal(count || 0);
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const getGenderLabel = (g: string) => {
    const map: Record<string, string> = {
      masculino: "Masculino",
      feminino: "Feminino",
      outro: "Outro",
      prefer_not_to_say: "Não informado",
    };
    return map[g] || g || "—";
  };

  const checkFollowStatus = async (targetId: string) => {
    if (!currentUser) return;
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', targetId)
      .maybeSingle();
    setIsFollowingSelected(!!data);
  };

  const toggleFollow = async () => {
    if (!currentUser || !selectedUser) return;
    const oldState = isFollowingSelected;
    setIsFollowingSelected(!oldState);

    try {
      if (oldState) {
        await supabase.from('follows').delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', selectedUser.id);
      } else {
        await supabase.from('follows').insert({
          follower_id: currentUser.id,
          following_id: selectedUser.id
        });
      }
    } catch (err) {
      setIsFollowingSelected(oldState);
    }
  };

  const handleToggleVerify = async (user: any) => {
    const newState = !user.is_verified;
    
    // Se for para remover, pede confirmação via toast
    if (!newState) {
      toast("Remover Verificação?", {
        description: `Deseja realmente retirar o selo de @${user.username}?`,
        action: {
          label: "Confirmar",
          onClick: () => executeToggle(user, newState)
        }
      });
    } else {
      executeToggle(user, newState);
    }
  };

  const executeToggle = async (user: any, newState: boolean) => {
    const toastId = toast.loading(`${newState ? 'Verificando' : 'Removendo verificação'} de ${user.username}...`);
    try {
      const table = activeTab === 'feconecta' ? 'profiles' : 'dating_profiles';
      const { error } = await supabase
        .from(table)
        .update({ 
          is_verified: newState,
          verification_label: newState ? (user.verification_label || 'Verificado') : null
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === user.id ? { 
        ...u, 
        is_verified: newState,
        verification_label: newState ? (u.verification_label || 'Verificado') : null 
      } : u));
      toast.success(newState ? "Selo concedido!" : "Selo removido com sucesso!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao atualizar: " + err.message, { id: toastId });
    }
  };

  const handleBanUser = async (user: any) => {
    const isBanned = user.verification_label === 'BANIDO';
    const toastId = toast.loading(`${isBanned ? 'Reativando' : 'Banindo'} ${user.username}...`);
    
    try {
      const table = activeTab === 'feconecta' ? 'profiles' : 'dating_profiles';
      const { error } = await supabase
        .from(table)
        .update({ 
          is_verified: false,
          verification_label: isBanned ? null : 'BANIDO'
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === user.id ? { 
        ...u, 
        is_verified: false,
        verification_label: isBanned ? null : 'BANIDO' 
      } : u));
      toast.success(isBanned ? "Usuário reativado!" : "Usuário banido com sucesso!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro na operação: " + err.message, { id: toastId });
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`TEM CERTEZA ABSOLUTA? Esta ação vai deletar todos os dados de perfil de ${user.username} da base de dados ativa (${activeTab}). Não pode ser desfeito.`)) return;
    
    const toastId = toast.loading(`Excluindo ${user.username}...`);
    try {
      const table = activeTab === 'feconecta' ? 'profiles' : 'dating_profiles';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', user.id);
      
      if (error) throw error;
      
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setTotal(prev => prev - 1);
      toast.success("Usuário excluído permanentemente da plataforma!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao excluir usuário: " + err.message, { id: toastId });
    }
  };

  const handleRoleUpdate = async (user: any, newRole: string) => {
    const toastId = toast.loading(`Atualizando privilégios de ${user.username}...`);
    try {
      const table = activeTab === 'feconecta' ? 'profiles' : 'dating_profiles';
      const { error } = await supabase
        .from(table)
        .update({ role: newRole })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      toast.success(`Usuário agora é ${newRole === 'admin' ? 'Administrador' : 'Membro'}!`, { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao mudar cargo: " + err.message, { id: toastId });
    }
  };

  const handleCreateUser = () => {
    toast.info("A funcionalidade de criação direta exige configuração do Provedor de E-mail (SMTP) no Supabase. Por enquanto, utilize o convite via Auth Dash.");
  };

  useEffect(() => {
    if (selectedUser) {
      checkFollowStatus(selectedUser.id);
    }
  }, [selectedUser, currentUser]);

  return (
    <div className="flex flex-col h-full pb-2 md:pb-4">
      <PageHeader 
        title="Gestão de Usuários" 
        description={`${total} usuário${total !== 1 ? "s" : ""} cadastrado${total !== 1 ? "s" : ""} na plataforma.`}
      >
        <button 
          onClick={handleCreateUser}
          className="flex items-center gap-2 bg-whatsapp-teal text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-whatsapp-tealLight transition-all active:scale-95 shadow-lg shadow-whatsapp-teal/20"
        >
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </PageHeader>

      <div className="flex bg-gray-100 dark:bg-whatsapp-darkLighter p-1 rounded-xl w-fit mb-6 shadow-inner">
        <button
          onClick={() => { setActiveTab('feconecta'); setPage(0); }}
          className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'feconecta' ? "bg-white dark:bg-whatsapp-dark shadow-sm text-whatsapp-teal" : "text-gray-500 hover:text-gray-700 dark:text-gray-400")}
        >
          FéConecta
        </button>
        <button
          onClick={() => { setActiveTab('fenamoro'); setPage(0); }}
          className={cn("px-6 py-2 rounded-lg text-sm font-bold transition-all", activeTab === 'fenamoro' ? "bg-white dark:bg-whatsapp-dark shadow-sm text-pink-500" : "text-gray-500 hover:text-gray-700 dark:text-gray-400")}
        >
          FéNamoro
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-whatsapp-darkLighter p-4 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow mb-8 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-whatsapp-green" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Pesquise por nome, email ou username..."
            className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-whatsapp-green/20 dark:text-white outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
           <button onClick={() => { setPage(0); fetchUsers(); }} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 rounded-xl text-xs font-bold dark:text-white">
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Atualizar
          </button>
        </div>
      </div>

            {/* Radar de Navegação & Presença Ao Vivo */}
      {onlineUsers.length > 0 && (
        <div className="mb-8 bg-white dark:bg-whatsapp-darkLighter p-6 rounded-2xl border border-whatsapp-green/20 dark:border-whatsapp-green/10 whatsapp-shadow overflow-hidden">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-whatsapp-green/10 flex items-center justify-center text-whatsapp-green">
                <Compass className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
              </div>
              <div>
                <h3 className="font-black text-sm dark:text-white flex items-center gap-2">
                  Radar de Navegação ao Vivo
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    🟢 {onlineUsers.length} Conectados
                  </span>
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Rastreamento em tempo real de onde os usuários estão navegando e tempo de permanência
                </p>
              </div>
            </div>

            <button 
              onClick={fetchOnlineUsers}
              className="text-xs text-gray-400 hover:text-whatsapp-green flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Atualizar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {onlineUsers.map(u => {
              const liveData = realtimePresenceMap[u.id];
              const pageTitle = liveData?.page_title || "Navegando no App";
              const pageIcon = liveData?.page_icon || "📱";
              const route = liveData?.route || "/";
              const timeSpent = formatTimeSpent(liveData?.entered_at || u.updated_at);

              return (
                <div 
                  key={u.id} 
                  className="bg-gray-50 dark:bg-whatsapp-dark border border-gray-200/80 dark:border-white/5 rounded-2xl p-3.5 flex flex-col justify-between space-y-3 hover:border-whatsapp-green/40 transition-all shadow-sm"
                >
                  {/* Top: Avatar & User info */}
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-whatsapp-darkLighter overflow-hidden border border-gray-100 dark:border-white/10">
                        {u.avatar_url && !u.avatar_url.includes('vercel.sh') ? (
                          <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full bg-whatsapp-teal flex items-center justify-center text-white font-black text-xs uppercase">
                            {u.full_name ? u.full_name[0] : 'U'}
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#111b21] rounded-full animate-pulse shadow-sm" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {u.full_name || u.username}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate">
                        @{u.username}
                      </p>
                    </div>
                  </div>

                  {/* Bottom: Rota & Tempo de Permanência */}
                  <div className="pt-2 border-t border-gray-200/60 dark:border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-sm">{pageIcon}</span>
                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 truncate">
                        {pageTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{timeSpent}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="flex-1 min-h-[300px] flex flex-col bg-white dark:bg-whatsapp-darkLighter rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow overflow-hidden">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left relative">
            <thead className="bg-gray-50 dark:bg-whatsapp-darkLighter sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Localização</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Igreja</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Gênero</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Telefone</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data Cadastro</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Último Acesso</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="p-10 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">Carregando rebanho digital...</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-whatsapp-teal/10 flex items-center justify-center overflow-hidden border border-whatsapp-green/20">
                          {u.avatar_url && !u.avatar_url.includes('vercel.sh') ? (
                            <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                             <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-emerald-600 flex items-center justify-center text-white font-black uppercase text-xs shadow-inner">
                               {(() => {
                                 const name = u.full_name || u.username || "U";
                                 const parts = name.trim().split(/\s+/);
                                 return parts.length >= 2 ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase() : parts[0][0].toUpperCase();
                               })()}
                             </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold dark:text-white">{u.full_name || 'Usuário FéConecta'}</p>
                            {u.is_verified && (
                              <VerificationBadge 
                                role={u.verification_label} 
                                size="xs" 
                                onClick={() => {
                                  setCredentialUser(u);
                                  setIsCredentialOpen(true);
                                }}
                              />
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 font-medium">{u.email || 'n/a'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-whatsapp-teal dark:text-whatsapp-green uppercase tracking-wider">@{u.username || 'n/a'}</span>
                        {u.fcm_token ? (
                          <span title="Push Ativo"><Bell className="w-3 h-3 text-whatsapp-green" /></span>
                        ) : (
                          <span title="Push Inativo"><BellOff className="w-3 h-3 text-gray-300" /></span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-medium hidden md:table-cell">
                      <div className="flex flex-col">
                        <span className="font-bold text-whatsapp-teal dark:text-whatsapp-green">{u.city || '—'}</span>
                        <span className="opacity-60">{u.state}{u.country ? ` - ${u.country}` : ''}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-medium hidden md:table-cell">
                      {u.church || '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-medium hidden lg:table-cell capitalize">
                      {getGenderLabel(u.gender)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-bold hidden md:table-cell">
                      {u.phone || '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-bold">
                      {moment(u.created_at).format('DD MMM YYYY')}
                    </td>
                    <td className="px-6 py-4 text-xs text-whatsapp-teal dark:text-whatsapp-green font-bold whitespace-nowrap">
                      {u.updated_at ? moment(u.updated_at).format('DD/MM/YY HH:mm') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                             setUserToEdit(u);
                             setIsEditModalOpen(true);
                          }}
                          className="p-2 hover:bg-blue-500/10 rounded-lg transition-colors group"
                          title="Editar Perfil"
                        >
                          <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                        </button>
                        <button 
                          onClick={() => setSelectedUser(u)}
                          className="p-2 hover:bg-whatsapp-teal/10 rounded-lg transition-colors group"
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4 text-whatsapp-teal" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                              <MoreHorizontal className="w-4 h-4 text-gray-500" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 py-2">Moderação Profética</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setUserToEdit(u);
                                setIsEditModalOpen(true);
                              }}
                              className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-colors text-blue-500"
                            >
                              <Edit2 className="w-4 h-4" />
                              <span className="font-bold text-xs">Editar Cadastro</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setForceNotifUser(u);
                                setIsForceNotifOpen(true);
                              }}
                              className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                            >
                              <Bell className="w-4 h-4" />
                              <span className="font-bold text-xs">Forçar Notificação</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleToggleVerify(u)}
                              className={cn(
                                "flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-colors",
                                u.is_verified ? "text-orange-500" : "text-whatsapp-green"
                              )}
                            >
                              <BadgeCheck className="w-4 h-4" />
                              <span className="font-bold text-xs">{u.is_verified ? 'Remover Selo' : 'Conferir Selo'}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleRoleUpdate(u, u.role === 'admin' ? 'user' : 'admin')}
                              className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer text-blue-500"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              <span className="font-bold text-xs">{u.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleBanUser(u)}
                              className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors"
                            >
                              <ShieldAlert className="w-4 h-4" />
                              <span className="font-bold text-xs">{u.verification_label === 'BANIDO' ? 'Reativar Conta' : 'Banir Conta'}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(u)}
                              className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="font-bold text-xs">Excluir Definitivamente</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {users.length === 0 && !loading && (
                <tr><td colSpan={6} className="p-10 text-center text-gray-400 text-xs font-bold">Nenhum usuário encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="w-4 h-4 dark:text-white" />
              </button>
              <span className="text-sm font-bold dark:text-white">{page + 1} / {totalPages}</span>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all"
              >
                <ChevronRight className="w-4 h-4 dark:text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal (Radix Dialog) */}
      <DialogPrimitive.Root open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-[#0f0f0f] dark:text-white rounded-[28px] border border-gray-200 dark:border-white/10 shadow-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
            {selectedUser && (
              <>
                {/* Banner */}
                <div className="h-24 bg-gradient-to-br from-whatsapp-teal/30 via-black to-whatsapp-green/20 relative">
                  <DialogPrimitive.Close className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full transition-colors">
                    <X className="w-4 h-4 text-white" />
                  </DialogPrimitive.Close>
                </div>

                {/* Avatar */}
                <div className="px-6 -mt-10 relative z-10">
                  <div className="w-20 h-20 rounded-2xl border-4 border-white dark:border-[#0f0f0f] overflow-hidden bg-gray-200 dark:bg-whatsapp-dark shadow-lg">
                    {selectedUser.avatar_url && !selectedUser.avatar_url.includes('vercel.sh') ? (
                      <img src={selectedUser.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-whatsapp-teal to-emerald-600 flex items-center justify-center text-white font-black text-2xl uppercase shadow-inner">
                        {(() => {
                          const name = selectedUser.full_name || selectedUser.username || "U";
                          const parts = name.trim().split(/\s+/);
                          return parts.length >= 2 ? (parts[0][0] + parts[parts.length-1][0]).toUpperCase() : parts[0][0].toUpperCase();
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* User Info */}
                <div className="px-6 pb-6 pt-3 space-y-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <DialogPrimitive.Title className="text-xl font-bold">{selectedUser.full_name || "Sem nome"}</DialogPrimitive.Title>
                      {selectedUser.is_verified && (
                        <VerificationBadge 
                          role={selectedUser.verification_label} 
                          size="sm" 
                          onClick={() => {
                             setCredentialUser(selectedUser);
                             setIsCredentialOpen(true);
                          }}
                        />
                      )}
                    </div>
                    <p className="text-sm text-whatsapp-teal dark:text-whatsapp-green font-medium">@{selectedUser.username || "—"}</p>
                    {selectedUser.bio && <p className="text-sm text-gray-400 mt-2 whitespace-pre-wrap">{selectedUser.bio}</p>}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/10">
                    <div>
                      <p className="text-lg font-bold">{selectedUser.posts_count || 0}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Posts</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{selectedUser.followers_count || 0}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Seguidores</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{selectedUser.following_count || 0}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Seguindo</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    {currentUser?.id !== selectedUser.id && (
                      <button 
                        onClick={toggleFollow}
                        className={cn(
                          "flex-1 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 uppercase tracking-widest",
                          isFollowingSelected 
                            ? "bg-gray-100 dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-white/10"
                            : "bg-whatsapp-teal text-white shadow-lg shadow-whatsapp-teal/20"
                        )}
                      >
                        {isFollowingSelected ? "Seguindo" : "Seguir Perfil"}
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setForceNotifUser(selectedUser);
                        setIsForceNotifOpen(true);
                      }}
                      className="flex-1 py-3 rounded-2xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Bell className="w-4 h-4" /> Forçar Notificação
                    </button>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Informações do Perfil</h4>
                    <div className="space-y-2">
                      {[
                        { icon: Mail, label: "E-mail", value: selectedUser.email },
                        { icon: Smartphone, label: "WhatsApp", value: selectedUser.phone, isPhone: true },
                        { icon: Globe, label: "Localização", value: selectedUser.city ? `${selectedUser.city}, ${selectedUser.state} - ${selectedUser.country}` : null },
                        { icon: Church, label: "Igreja", value: selectedUser.church },
                        { icon: Calendar, label: "Nascimento", value: selectedUser.birthdate ? moment(selectedUser.birthdate).format('DD/MM/YYYY') : null },
                        { icon: AtSign, label: "Gênero", value: getGenderLabel(selectedUser.gender) },
                        { icon: Calendar, label: "Cadastro", value: moment(selectedUser.created_at).format('DD/MM/YYYY HH:mm') },
                        { icon: ShieldCheck, label: "Termos aceitos", value: selectedUser.accepted_terms ? "✅ Sim" : "❌ Não" },
                      ].filter(item => item.value && item.value !== "—").map((item) => (
                        <div key={item.label} className="flex items-center justify-between bg-gray-50 dark:bg-white/5 rounded-xl p-3 border border-gray-100 dark:border-white/5">
                          <div className="flex items-center gap-3 min-w-0">
                            <item.icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{item.label}</p>
                              <p className="text-sm font-medium truncate">{item.value}</p>
                            </div>
                          </div>
                          {item.isPhone && (
                            <a 
                              href={`https://wa.me/55${String(item.value).replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="ml-2 flex-shrink-0 bg-whatsapp-green text-whatsapp-dark px-3 py-1.5 rounded-lg text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md shadow-whatsapp-green/20"
                            >
                              Chamar
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <DigitalCredentialModal 
        isOpen={isCredentialOpen}
        onClose={() => setIsCredentialOpen(false)}
        user={credentialUser}
      />

      <EditProfileModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setUserToEdit(null);
        }}
        user={userToEdit}
        onUpdate={() => {
           fetchUsers();
        }}
      />

      <ForceNotificationModal 
        isOpen={isForceNotifOpen}
        onClose={() => {
          setIsForceNotifOpen(false);
          setForceNotifUser(null);
        }}
        user={forceNotifUser}
      />
    </div>
  );
}
