"use client";

import React, { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Plus, Search, MoreHorizontal, RefreshCw, Eye, X, Mail, Church, Calendar, AtSign, ShieldCheck, UserCircle2, ChevronLeft, ChevronRight, BadgeCheck, ShieldAlert, UserPlus, UserMinus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import moment from "moment";
import * as DialogPrimitive from "@radix-ui/react-dialog";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const { toast } = require("sonner");
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowingSelected, setIsFollowingSelected] = useState(false);
  const PAGE_SIZE = 15;

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
  }, [page, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('profiles')
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
    const toastId = toast.loading(`${newState ? 'Verificando' : 'Removendo verificação'} de ${user.username}...`);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_verified: newState })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_verified: newState } : u));
      toast.success(`Status de verificação atualizado!`, { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao atualizar: " + err.message, { id: toastId });
    }
  };

  const handleRoleUpdate = async (user: any, role: string) => {
    const toastId = toast.loading(`Alterando nível de ${user.username}...`);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: role })
        .eq('id', user.id);
      
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: role } : u));
      toast.success(`Nível de acesso alterado para ${role}!`, { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao alterar nível: " + err.message, { id: toastId });
    }
  };

  useEffect(() => {
    if (selectedUser) {
      checkFollowStatus(selectedUser.id);
    }
  }, [selectedUser, currentUser]);

  return (
    <div className="pb-12">
      <PageHeader 
        title="Gestão de Usuários" 
        description={`${total} usuário${total !== 1 ? "s" : ""} cadastrado${total !== 1 ? "s" : ""} na plataforma.`}
      >
        <button className="flex items-center gap-2 bg-whatsapp-teal text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-whatsapp-tealLight transition-all">
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </PageHeader>

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

      {/* Users Table */}
      <div className="bg-white dark:bg-whatsapp-darkLighter rounded-2xl border border-gray-100 dark:border-white/5 whatsapp-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuário</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Igreja</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Gênero</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Data Cadastro</th>
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
                          {u.avatar_url ? (
                            <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                             <span className="text-whatsapp-teal font-black uppercase text-xs">{(u.full_name || 'U').charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold dark:text-white">{u.full_name || 'Usuário FéConecta'}</p>
                          <p className="text-[10px] text-gray-500 font-medium">{u.email || 'n/a'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-whatsapp-teal dark:text-whatsapp-green uppercase tracking-wider">@{u.username || 'n/a'}</span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-medium hidden md:table-cell">
                      {u.church || '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-medium hidden lg:table-cell capitalize">
                      {getGenderLabel(u.gender)}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400 font-bold">
                      {moment(u.created_at).format('DD MMM YYYY')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setSelectedUser(u)}
                          className="p-2 hover:bg-whatsapp-teal/10 rounded-lg transition-colors"
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => toast.warning("Funcionalidade de banimento em auditoria.")}
                              className="flex items-center gap-2 rounded-xl px-3 py-2 cursor-pointer text-red-500 focus:bg-red-500/10"
                            >
                              <ShieldAlert className="w-4 h-4" />
                              <span className="font-bold text-xs">Banir Usuário</span>
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
                    {selectedUser.avatar_url ? (
                      <img src={selectedUser.avatar_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserCircle2 className="w-10 h-10 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* User Info */}
                <div className="px-6 pb-6 pt-3 space-y-5">
                  <div>
                    <DialogPrimitive.Title className="text-xl font-bold">{selectedUser.full_name || "Sem nome"}</DialogPrimitive.Title>
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

                  {currentUser?.id !== selectedUser.id && (
                    <button 
                      onClick={toggleFollow}
                      className={cn(
                        "w-full py-3 rounded-2xl text-sm font-bold transition-all active:scale-95 uppercase tracking-widest",
                        isFollowingSelected 
                          ? "bg-gray-100 dark:bg-white/5 text-gray-500 border border-gray-200 dark:border-white/10"
                          : "bg-whatsapp-teal text-white shadow-lg shadow-whatsapp-teal/20"
                      )}
                    >
                      {isFollowingSelected ? "Seguindo" : "Seguir Perfil"}
                    </button>
                  )}

                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-widest text-gray-500">Informações do Perfil</h4>
                    <div className="space-y-2">
                      {[
                        { icon: Mail, label: "E-mail", value: selectedUser.email },
                        { icon: Church, label: "Igreja", value: selectedUser.church },
                        { icon: Calendar, label: "Nascimento", value: selectedUser.birthdate ? moment(selectedUser.birthdate).format('DD/MM/YYYY') : null },
                        { icon: AtSign, label: "Gênero", value: getGenderLabel(selectedUser.gender) },
                        { icon: Calendar, label: "Cadastro", value: moment(selectedUser.created_at).format('DD/MM/YYYY HH:mm') },
                        { icon: ShieldCheck, label: "Termos aceitos", value: selectedUser.accepted_terms ? "✅ Sim" : "❌ Não" },
                      ].filter(item => item.value && item.value !== "—").map((item) => (
                        <div key={item.label} className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 rounded-xl p-3 border border-gray-100 dark:border-white/5">
                          <item.icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{item.label}</p>
                            <p className="text-sm font-medium truncate">{item.value}</p>
                          </div>
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
    </div>
  );
}
