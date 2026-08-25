"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { 
  Plus, Search, MoreHorizontal, RefreshCw, Eye, X, Mail, 
  Church, Calendar, AtSign, ShieldCheck, UserCircle2, 
  ChevronLeft, ChevronRight, BadgeCheck, ShieldAlert, 
  UserPlus, UserMinus, Edit2, Bell, BellOff, Globe, 
  Smartphone, Trash2, Clock, Compass, Radio
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import moment from "moment";
import "moment/locale/pt-br";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { VerificationBadge } from "@/components/verification-badge";
import { DigitalCredentialModal } from "@/components/admin/DigitalCredentialModal";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { ForceNotificationModal } from "@/components/admin/ForceNotificationModal";

moment.locale('pt-br');

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | string>('all');
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
  const [, setTick] = useState(0);

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
  }, [page, search, activeTab, statusFilter]);

  const fetchOnlineUsers = async () => {
    const activeCutoff = new Date(Date.now() - 4 * 60 * 1000).toISOString();
    const table = activeTab === 'feconecta' ? 'profiles' : 'dating_profiles';
    const { data } = await supabase
      .from(table)
      .select('id, full_name, avatar_url, updated_at, last_seen, username, role, current_page, page_title, page_entered_at')
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
        .order('created_at', { ascending: false });

      if (statusFilter === 'online') {
        const activeCutoff = new Date(Date.now() - 4 * 60 * 1000).toISOString();
        query = query.gt('updated_at', activeCutoff);
      } else if (statusFilter !== 'all') {
        // Filtrar por página específica
        const activeCutoff = new Date(Date.now() - 4 * 60 * 1000).toISOString();
        query = query.gt('updated_at', activeCutoff).eq('page_title', statusFilter);
      }

      if (search.trim()) {
        query = query.or(
          `full_name.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      const { data, count, error } = await query.range(from, to);

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

  const handleToggleFollow = async (targetUser: any) => {
    if (!currentUser) return;
    const toastId = toast.loading(isFollowingSelected ? "Deixando de seguir..." : "Seguindo...");

    try {
      if (isFollowingSelected) {
        await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', targetUser.id);
        setIsFollowingSelected(false);
        toast.success(`Você deixou de seguir ${targetUser.username}`, { id: toastId });
      } else {
        await supabase
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: targetUser.id
          });
        setIsFollowingSelected(true);
        toast.success(`Você agora segue ${targetUser.username}!`, { id: toastId });
      }
    } catch (err: any) {
      toast.error("Erro na ação: " + err.message, { id: toastId });
    }
  };

  const handleToggleVerification = async (user: any) => {
    const newState = !user.is_verified;
    if (newState && !user.verification_label) {
      setCredentialUser({
        ...user,
        is_verified: true,
        verification_label: 'Verificado'
      });
      setIsCredentialOpen(true);
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
      setTotal(prev => Math.max(0, prev - 1));
      toast.success("Usuário excluído permanentemente!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message, { id: toastId });
    }
  };

  const handleToggleRole = async (user: any) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    const toastId = toast.loading(`Alterando cargo de ${user.username} para ${newRole}...`);
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

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Agrupamento por página para a Barra Analítica
  const pageCounts: Record<string, number> = {};
  onlineUsers.forEach(u => {
    const live = realtimePresenceMap[u.id];
    const pTitle = live?.page_title || u.page_title || "Feed Principal";
    pageCounts[pTitle] = (pageCounts[pTitle] || 0) + 1;
  });

  return (
    <div className="flex flex-col h-full pb-2 md:pb-4 space-y-6">
      {/* Header Principal */}
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

      {/* Seletor de Base (FéConecta / FéNamoro) */}
      <div className="flex bg-gray-100 dark:bg-whatsapp-darkLighter p-1 rounded-xl w-fit shadow-inner">
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

      {/* BARRA ANALÍTICA COMPACTA: Radar de Presença em Tempo Real (Não quebra layout com milhares de usuários) */}
      <div className="bg-white dark:bg-whatsapp-darkLighter p-4 rounded-2xl border border-gray-200/80 dark:border-white/5 whatsapp-shadow flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm dark:text-white">Radar de Presença</span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                🟢 {onlineUsers.length} Online
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Distribuição dos membros ativos no momento
            </p>
          </div>
        </div>

        {/* Filtros em Pílulas Compactas */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
          <button
            onClick={() => { setStatusFilter('all'); setPage(0); }}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
              statusFilter === 'all'
                ? "bg-whatsapp-green text-slate-950 shadow-sm"
                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
            )}
          >
            Todos ({total})
          </button>
          <button
            onClick={() => { setStatusFilter(statusFilter === 'online' ? 'all' : 'online'); setPage(0); }}
            className={cn(
              "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5",
              statusFilter === 'online'
                ? "bg-emerald-500 text-white shadow-sm"
                : "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Online Agora ({onlineUsers.length})</span>
          </button>
          {Object.entries(pageCounts).map(([title, count]) => (
            <button
              key={title}
              onClick={() => { setStatusFilter(statusFilter === title ? 'all' : title); setPage(0); }}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5",
                statusFilter === title
                  ? "bg-whatsapp-green text-slate-950 shadow-sm"
                  : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
              )}
            >
              <span>{title}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-black/10 dark:bg-white/10 text-[10px]">
                {count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Busca & Ações */}
      <div className="bg-white dark:bg-whatsapp-darkLighter p-4 rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-whatsapp-green" />
          <input 
            type="text" 
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Pesquise por nome, email ou username..."
            className="w-full bg-whatsapp-light dark:bg-whatsapp-dark border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-whatsapp-green/20 dark:text-white outline-none"
          />
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button 
            onClick={() => { setPage(0); fetchUsers(); fetchOnlineUsers(); }} 
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl text-xs font-bold dark:text-white transition-colors"
          >
            <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} /> Atualizar
          </button>
        </div>
      </div>

      {/* TABELA PRINCIPAL DE USUÁRIOS COM RASTREAMENTO AO VIVO INTEGRADO */}
      <div className="flex-1 min-h-[300px] flex flex-col bg-white dark:bg-whatsapp-darkLighter rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow overflow-hidden">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left relative">
            <thead className="bg-gray-50 dark:bg-whatsapp-darkLighter sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Localização Atual & Rota</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Igreja</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Gênero</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Telefone</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cadastro</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="p-10 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px]">Carregando rebanho digital...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-gray-400 font-bold text-xs">Nenhum usuário encontrado.</td></tr>
              ) : (
                users.map((u) => {
                  const live = realtimePresenceMap[u.id];
                  const isOnline = onlineUsers.some(o => o.id === u.id) || !!live;
                  const pageTitle = live?.page_title || u.page_title || "Feed Principal";
                  const pageIcon = live?.page_icon || "📱";
                  const route = live?.route || u.current_page || "/";
                  const enteredAt = live?.entered_at || u.page_entered_at || u.updated_at;
                  const timeSpent = formatTimeSpent(enteredAt);

                  return (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      {/* Coluna 1: Usuário (Avatar + Nome + Online Dot) */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <div className="w-10 h-10 rounded-xl bg-whatsapp-teal/10 flex items-center justify-center overflow-hidden border border-whatsapp-green/20">
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
                            {isOnline && (
                              <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-[#111b21] rounded-full animate-pulse shadow-sm" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-bold dark:text-white truncate">{u.full_name || 'Usuário FéConecta'}</p>
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
                            <p className="text-xs text-gray-400 font-mono truncate">@{u.username}</p>
                          </div>
                        </div>
                      </td>

                      {/* Coluna 2: Rota Atual / Status Online com Cronômetro */}
                      <td className="px-6 py-4">
                        {isOnline ? (
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">{pageIcon}</span>
                              <span className="text-xs font-black text-gray-900 dark:text-gray-100">
                                {pageTitle}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-md">
                                {timeSpent}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono truncate block">
                              {route}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-400 font-medium">Offline</span>
                            <span className="text-[10px] text-gray-500">
                              {(() => {
                                const t = u.last_seen || u.updated_at || u.created_at;
                                return t ? `Visto ${moment(t).fromNow()}` : '—';
                              })()}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Coluna 3: Igreja */}
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-medium hidden md:table-cell truncate max-w-[150px]">
                        {u.church || '—'}
                      </td>

                      {/* Coluna 4: Gênero */}
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-bold hidden lg:table-cell">
                        {u.gender === 'male' ? 'Homem' : u.gender === 'female' ? 'Mulher' : u.gender || '—'}
                      </td>

                      {/* Coluna 5: Telefone */}
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-bold hidden md:table-cell">
                        {u.phone || '—'}
                      </td>

                      {/* Coluna 6: Cadastro */}
                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-bold whitespace-nowrap">
                        {moment(u.created_at).format('DD MMM YYYY')}
                      </td>

                      {/* Coluna 7: Ações */}
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
                                className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-colors text-amber-500"
                              >
                                <Bell className="w-4 h-4" />
                                <span className="font-bold text-xs">Disparar Push</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => handleToggleVerification(u)}
                                className={cn("flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-colors", u.is_verified ? "text-amber-600" : "text-whatsapp-teal")}
                              >
                                <BadgeCheck className="w-4 h-4" />
                                <span className="font-bold text-xs">{u.is_verified ? "Remover Selo" : "Conceder Selo"}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleToggleRole(u)}
                                className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-colors"
                              >
                                <ShieldCheck className="w-4 h-4" />
                                <span className="font-bold text-xs">{u.role === 'admin' ? "Rebaixar para Membro" : "Tornar Administrador"}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleBanUser(u)}
                                className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-colors text-red-500"
                              >
                                <ShieldAlert className="w-4 h-4" />
                                <span className="font-bold text-xs">{u.verification_label === 'BANIDO' ? "Desbanir Usuário" : "Banir Usuário"}</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeleteUser(u)}
                                className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-colors text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="font-bold text-xs">Excluir Conta</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        <div className="p-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Mostrando <span className="font-bold">{users.length}</span> de <span className="font-bold">{total}</span> membros
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="p-2 border border-gray-200 dark:border-white/10 rounded-xl disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 dark:text-white" />
            </button>
            <span className="text-xs font-bold dark:text-white px-2">
              Página {page + 1} de {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) >= totalPages || loading}
              className="p-2 border border-gray-200 dark:border-white/10 rounded-xl disabled:opacity-30 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              <ChevronRight className="w-4 h-4 dark:text-white" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Detalhes do Usuário */}
      <DialogPrimitive.Root open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-whatsapp-darkLighter p-6 rounded-3xl z-50 border border-gray-100 dark:border-white/5 shadow-2xl animate-in zoom-in-95">
            {selectedUser && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-whatsapp-teal/10 flex items-center justify-center overflow-hidden border border-whatsapp-green/20">
                      {selectedUser.avatar_url && !selectedUser.avatar_url.includes('vercel.sh') ? (
                        <img src={selectedUser.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <UserCircle2 className="w-6 h-6 text-whatsapp-teal" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold dark:text-white">{selectedUser.full_name || 'Sem nome'}</h4>
                        {selectedUser.is_verified && <VerificationBadge role={selectedUser.verification_label} size="xs" />}
                      </div>
                      <p className="text-xs text-gray-400 font-mono">@{selectedUser.username}</p>
                    </div>
                  </div>
                  <DialogPrimitive.Close className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                    <X className="w-4 h-4 text-gray-500" />
                  </DialogPrimitive.Close>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-50 dark:bg-whatsapp-dark rounded-xl border border-gray-100 dark:border-white/5">
                    <span className="text-gray-400 block mb-1">Localização</span>
                    <span className="font-bold dark:text-white truncate block">{selectedUser.city ? `${selectedUser.city}, ${selectedUser.state}` : 'Não informada'}</span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-whatsapp-dark rounded-xl border border-gray-100 dark:border-white/5">
                    <span className="text-gray-400 block mb-1">Igreja</span>
                    <span className="font-bold dark:text-white truncate block">{selectedUser.church || 'Não informada'}</span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-whatsapp-dark rounded-xl border border-gray-100 dark:border-white/5">
                    <span className="text-gray-400 block mb-1">Telefone</span>
                    <span className="font-bold dark:text-white truncate block">{selectedUser.phone || 'Não informado'}</span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-whatsapp-dark rounded-xl border border-gray-100 dark:border-white/5">
                    <span className="text-gray-400 block mb-1">Email</span>
                    <span className="font-bold dark:text-white truncate block">{selectedUser.email || 'Não informado'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggleFollow(selectedUser)}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all",
                      isFollowingSelected 
                        ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" 
                        : "bg-whatsapp-green text-slate-950 hover:bg-whatsapp-greenLight"
                    )}
                  >
                    {isFollowingSelected ? <><UserMinus className="w-4 h-4" /> Deixar de Seguir</> : <><UserPlus className="w-4 h-4" /> Seguir Membro</>}
                  </button>
                  <button
                    onClick={() => {
                      setCredentialUser(selectedUser);
                      setIsCredentialOpen(true);
                    }}
                    className="py-3 px-4 rounded-xl text-xs font-bold bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 dark:text-white transition-colors"
                  >
                    Credencial
                  </button>
                </div>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Modais de Credencial, Edição e Notificação */}
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
          fetchOnlineUsers();
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
