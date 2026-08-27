"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { 
  Plus, Search, MoreHorizontal, RefreshCw, Eye, X, Mail, 
  Church, Calendar, AtSign, ShieldCheck, UserCircle2, 
  ChevronLeft, ChevronRight, BadgeCheck, ShieldAlert, 
  UserPlus, UserMinus, Edit2, Bell, BellOff, Globe, 
  Smartphone, Trash2, Clock, Compass, Radio, Users, Download,
  CheckCircle2, AlertCircle, Copy, Link as LinkIcon, Send
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
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

moment.locale("pt-br");

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"feconecta" | "fenamoro">("feconecta");
  const [statusFilter, setStatusFilter] = useState<"all" | "online" | "verified" | "banned" | string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [bannedCount, setBannedCount] = useState(0);
  const [newMonthCount, setNewMonthCount] = useState(0);

  // Modais
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isFollowingSelected, setIsFollowingSelected] = useState(false);
  const [isCredentialOpen, setIsCredentialOpen] = useState(false);
  const [credentialUser, setCredentialUser] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);
  const [isForceNotifOpen, setIsForceNotifOpen] = useState(false);
  const [forceNotifUser, setForceNotifUser] = useState<any | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const PAGE_SIZE = 12;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()
          .then(({ data }) => setCurrentUser(data || user));
      }
    });
  }, []);

  // ⚡ Sincronização e Presença Realtime
  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchOnlineUsers();

    const presenceChannel = supabase.channel("admin-users-presence", {
      config: { presence: { key: "admin-users-monitor" } }
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        fetchOnlineUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [page, search, activeTab, statusFilter, roleFilter]);

  const fetchStats = async () => {
    try {
      const table = activeTab === "feconecta" ? "profiles" : "dating_profiles";
      const startOfMonth = moment().startOf("month").toISOString();

      const [vRes, bRes, mRes] = await Promise.allSettled([
        supabase.from(table).select("*", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from(table).select("*", { count: "exact", head: true }).eq("verification_label", "BANIDO"),
        supabase.from(table).select("*", { count: "exact", head: true }).gt("created_at", startOfMonth),
      ]);

      setVerifiedCount(vRes.status === "fulfilled" ? (vRes.value.count || 0) : 0);
      setBannedCount(bRes.status === "fulfilled" ? (bRes.value.count || 0) : 0);
      setNewMonthCount(mRes.status === "fulfilled" ? (mRes.value.count || 0) : 0);
    } catch (err) {
      console.error("[Users] Erro ao buscar stats de usuários:", err);
    }
  };

  const fetchOnlineUsers = async () => {
    try {
      const activeCutoff = moment().subtract(5, "minutes").toISOString();
      const table = activeTab === "feconecta" ? "profiles" : "dating_profiles";
      const { data } = await supabase
        .from(table)
        .select("id, full_name, avatar_url, updated_at, last_seen, username, role, current_page, page_title, page_entered_at")
        .gt("updated_at", activeCutoff)
        .order("updated_at", { ascending: false });
      if (data) setOnlineUsers(data);
    } catch (err) {
      console.warn("[Users] Erro ao buscar online users:", err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const table = activeTab === "feconecta" ? "profiles" : "dating_profiles";

      let query = supabase
        .from(table)
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (statusFilter === "online") {
        const activeCutoff = moment().subtract(5, "minutes").toISOString();
        query = query.gt("updated_at", activeCutoff);
      } else if (statusFilter === "verified") {
        query = query.eq("is_verified", true);
      } else if (statusFilter === "banned") {
        query = query.eq("verification_label", "BANIDO");
      }

      if (roleFilter !== "all") {
        query = query.eq("role", roleFilter);
      }

      if (search.trim()) {
        query = query.or(
          `full_name.ilike.%${search}%,username.ilike.%${search}%,email.ilike.%${search}%`
        );
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;

      setUsers(data || []);
      setTotal(count || 0);
    } catch (err: any) {
      console.error("[Users] Erro ao buscar usuários:", err);
      toast.error("Erro ao carregar usuários: " + (err.message || "Erro de conexão"));
    } finally {
      setLoading(false);
    }
  };

  const checkFollowStatus = async (targetId: string) => {
    if (!currentUser) return;
    try {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUser.id)
        .eq("following_id", targetId)
        .maybeSingle();
      setIsFollowingSelected(!!data);
    } catch {
      setIsFollowingSelected(false);
    }
  };

  const handleToggleFollow = async (targetUser: any) => {
    if (!currentUser) return;
    const toastId = toast.loading(isFollowingSelected ? "Deixando de seguir..." : "Seguindo...");

    try {
      if (isFollowingSelected) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", targetUser.id);
        setIsFollowingSelected(false);
        toast.success(`Você deixou de seguir @${targetUser.username}`, { id: toastId });
      } else {
        await supabase
          .from("follows")
          .insert({
            follower_id: currentUser.id,
            following_id: targetUser.id,
          });
        setIsFollowingSelected(true);
        toast.success(`Você agora segue @${targetUser.username}!`, { id: toastId });
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
        verification_label: "Verificado",
      });
      setIsCredentialOpen(true);
    } else {
      executeToggle(user, newState);
    }
  };

  const executeToggle = async (user: any, newState: boolean) => {
    const toastId = toast.loading(`${newState ? "Verificando" : "Removendo verificação"} de @${user.username}...`);
    try {
      const table = activeTab === "feconecta" ? "profiles" : "dating_profiles";
      const { error } = await supabase
        .from(table)
        .update({ 
          is_verified: newState,
          verification_label: newState ? (user.verification_label || "Verificado") : null,
        })
        .eq("id", user.id);
      
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === user.id ? { 
        ...u, 
        is_verified: newState,
        verification_label: newState ? (u.verification_label || "Verificado") : null,
      } : u));
      toast.success(newState ? "Selo concedido com sucesso!" : "Selo removido com sucesso!", { id: toastId });
      fetchStats();
    } catch (err: any) {
      toast.error("Erro ao atualizar: " + err.message, { id: toastId });
    }
  };

  const handleBanUser = async (user: any) => {
    const isBanned = user.verification_label === "BANIDO";
    const toastId = toast.loading(`${isBanned ? "Reativando" : "Suspendendo"} @${user.username}...`);
    
    try {
      const table = activeTab === "feconecta" ? "profiles" : "dating_profiles";
      const { error } = await supabase
        .from(table)
        .update({ 
          is_verified: false,
          verification_label: isBanned ? null : "BANIDO",
        })
        .eq("id", user.id);
      
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === user.id ? { 
        ...u, 
        is_verified: false,
        verification_label: isBanned ? null : "BANIDO",
      } : u));
      toast.success(isBanned ? "Usuário reativado com sucesso!" : "Usuário suspenso com sucesso!", { id: toastId });
      fetchStats();
    } catch (err: any) {
      toast.error("Erro na operação: " + err.message, { id: toastId });
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`TEM CERTEZA ABSOLUTA? Esta ação vai deletar todos os dados de perfil de "${user.full_name || user.username}" permanentemente.`)) {
      return;
    }
    
    const toastId = toast.loading(`Excluindo @${user.username}...`);
    try {
      const table = activeTab === "feconecta" ? "profiles" : "dating_profiles";
      const { error } = await supabase
        .from(table)
        .delete()
        .eq("id", user.id);
      
      if (error) throw error;
      
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setTotal(prev => Math.max(0, prev - 1));
      toast.success("Usuário excluído permanentemente!", { id: toastId });
      fetchStats();
    } catch (err: any) {
      toast.error("Erro ao excluir usuário: " + err.message, { id: toastId });
    }
  };

  const handleToggleRole = async (user: any) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    const toastId = toast.loading(`Alterando cargo de @${user.username} para ${newRole}...`);
    try {
      const table = activeTab === "feconecta" ? "profiles" : "dating_profiles";
      const { error } = await supabase
        .from(table)
        .update({ role: newRole })
        .eq("id", user.id);
      
      if (error) throw error;
      
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      toast.success(`Usuário agora é ${newRole === "admin" ? "Administrador" : "Membro"}!`, { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao mudar cargo: " + err.message, { id: toastId });
    }
  };

  const exportToCSV = () => {
    if (users.length === 0) {
      toast.error("Nenhum usuário para exportar.");
      return;
    }
    const headers = ["ID", "Nome", "Username", "Email", "Igreja", "Cargo", "Status", "Criado Em"];
    const csvRows = users.map(u => [
      u.id,
      `"${(u.full_name || "").replace(/"/g, '""')}"`,
      `"${(u.username || "").replace(/"/g, '""')}"`,
      `"${(u.email || "").replace(/"/g, '""')}"`,
      `"${(u.church || "").replace(/"/g, '""')}"`,
      u.role || "user",
      u.verification_label === "BANIDO" ? "Suspenso" : u.is_verified ? "Verificado" : "Normal",
      u.created_at || "",
    ]);
    
    // Inclusão do BOM UTF-8 para Excel e caracteres especiais em português
    const csvContent = "\uFEFF" + [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `usuarios_${activeTab}_${moment().format("YYYY-MM-DD")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  };

  const copyInviteLink = () => {
    const inviteUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/register`;
    navigator.clipboard.writeText(inviteUrl);
    toast.success("Link de cadastro copiado para a área de transferência! 📋");
  };

  useEffect(() => {
    if (selectedUser) {
      checkFollowStatus(selectedUser.id);
    }
  }, [selectedUser, currentUser]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* ─── HEADER PRINCIPAL ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Gestão de Usuários
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {total.toLocaleString("pt-BR")} contas registradas · {onlineUsers.length} ativas agora
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-whatsapp-teal text-white text-xs font-semibold hover:bg-whatsapp-tealLight transition-colors shadow-sm active:scale-95"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Convidar Membro</span>
          </button>
        </div>
      </div>

      {/* ─── 4 CARDS DE MÉTRICAS (STATS) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Contas */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total de Contas</span>
            <div className="p-2 rounded-lg bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : total.toLocaleString("pt-BR")}
            </span>
            {newMonthCount > 0 && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                ▲ {newMonthCount} no mês
              </span>
            )}
          </div>
        </div>

        {/* Verificados */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Verificados</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : verifiedCount.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
              {total > 0 ? Math.round((verifiedCount / total) * 100) : 0}% da base
            </span>
          </div>
        </div>

        {/* Online Agora */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Online Agora</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Radio className="h-4 w-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {onlineUsers.length}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              Tempo real
            </span>
          </div>
        </div>

        {/* Suspensos */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Suspensos & Bloqueados</span>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400">
              <UserMinus className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : bannedCount}
            </span>
            <span className="text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
              {bannedCount === 0 ? "Nenhum" : "Ação requerida"}
            </span>
          </div>
        </div>
      </div>

      {/* ─── TABELA PRINCIPAL DE USUÁRIOS ─── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden space-y-0">
        {/* Barra Superior com Abas e Filtros */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/20">
          <div className="flex items-center p-1 rounded-lg bg-muted border border-border w-fit">
            <button
              onClick={() => { setActiveTab("feconecta"); setPage(0); }}
              className={cn(
                "px-3.5 py-1 rounded-md text-xs font-semibold transition-all",
                activeTab === "feconecta"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              FéConecta
            </button>
            <button
              onClick={() => { setActiveTab("fenamoro"); setPage(0); }}
              className={cn(
                "px-3.5 py-1 rounded-md text-xs font-semibold transition-all",
                activeTab === "fenamoro"
                  ? "bg-card text-pink-500 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              FéNamoro
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-1 md:justify-end">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Buscar por nome, @user ou e-mail..."
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-muted/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="h-8 px-2.5 rounded-lg border border-border bg-card text-xs text-muted-foreground focus:outline-none"
            >
              <option value="all">Status: Todos</option>
              <option value="online">Status: Online</option>
              <option value="verified">Status: Verificados</option>
              <option value="banned">Status: Suspensos</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}
              className="h-8 px-2.5 rounded-lg border border-border bg-card text-xs text-muted-foreground focus:outline-none"
            >
              <option value="all">Papel: Todos</option>
              <option value="user">Membro</option>
              <option value="admin">Administrador</option>
            </select>

            <button
              onClick={() => { setPage(0); fetchUsers(); fetchOnlineUsers(); }}
              title="Recarregar tabela"
              className="h-8 w-8 grid place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted transition-colors"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-whatsapp-green")} />
            </button>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border uppercase tracking-wider text-[10px] text-muted-foreground font-semibold">
              <tr>
                <th className="px-5 py-3">Usuário</th>
                <th className="px-5 py-3 hidden md:table-cell">Igreja</th>
                <th className="px-5 py-3">Papel</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 hidden lg:table-cell">Cadastro</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    Carregando usuários...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    Nenhum usuário encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isOnline = onlineUsers.some(ou => ou.id === user.id);
                  const isBanned = user.verification_label === "BANIDO";

                  return (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <div className="relative shrink-0">
                            <div className="h-8 w-8 rounded-full bg-whatsapp-teal/20 text-whatsapp-teal dark:text-whatsapp-green flex items-center justify-center font-bold text-xs overflow-hidden border border-border">
                              {user.avatar_url ? (
                                <Image
                                  src={user.avatar_url}
                                  alt=""
                                  width={32}
                                  height={32}
                                  unoptimized
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                (user.full_name || user.username || "U")[0]?.toUpperCase()
                              )}
                            </div>
                            {isOnline && (
                              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                              <span>{user.full_name || "Sem nome"}</span>
                              {user.is_verified && <VerificationBadge role={user.verification_label} size="xs" />}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              @{user.username || "usuario"} · {user.email || "sem email"}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground truncate max-w-[180px]">
                        {user.church || "Não informada"}
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-semibold uppercase",
                          user.role === "admin"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                        )}>
                          {user.role === "admin" ? "Administrador" : "Membro"}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        {isBanned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                            Suspenso
                          </span>
                        ) : isOnline ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                            Ativo
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 hidden lg:table-cell text-muted-foreground whitespace-nowrap">
                        {user.created_at ? moment(user.created_at).format("DD/MM/YYYY") : "—"}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            title="Inspecionar perfil"
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Ações de Usuário</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => { setUserToEdit(user); setIsEditModalOpen(true); }}>
                                <Edit2 className="h-3.5 w-3.5 mr-2 text-blue-500" /> Editar Perfil
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setCredentialUser(user); setIsCredentialOpen(true); }}>
                                <BadgeCheck className="h-3.5 w-3.5 mr-2 text-whatsapp-teal" /> Credencial Digital
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setForceNotifUser(user); setIsForceNotifOpen(true); }}>
                                <Bell className="h-3.5 w-3.5 mr-2 text-amber-500" /> Disparar Push Direto
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleVerification(user)}>
                                <ShieldCheck className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                                {user.is_verified ? "Remover Selo" : "Conceder Selo"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleRole(user)}>
                                <Users className="h-3.5 w-3.5 mr-2 text-purple-500" />
                                {user.role === "admin" ? "Rebaixar p/ Membro" : "Promover a Admin"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleBanUser(user)} className={isBanned ? "text-emerald-500" : "text-red-500"}>
                                <UserMinus className="h-3.5 w-3.5 mr-2" />
                                {isBanned ? "Reativar Conta" : "Suspender Usuário"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteUser(user)} className="text-red-600 focus:text-red-600">
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir Permanente
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

        {/* Rodapé e Paginação */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-muted/20 text-xs">
          <span className="text-muted-foreground">
            Mostrando <strong className="text-foreground">{users.length}</strong> de <strong className="text-foreground">{total.toLocaleString("pt-BR")}</strong> usuários
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="h-8 px-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-foreground">
              {page + 1} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) >= totalPages || loading}
              className="h-8 px-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL DE INSPEÇÃO DE PERFIL ─── */}
      <DialogPrimitive.Root open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card p-6 rounded-2xl z-50 border border-border shadow-2xl animate-in zoom-in-95 text-foreground">
            {selectedUser && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-whatsapp-teal/20 text-whatsapp-teal dark:text-whatsapp-green flex items-center justify-center overflow-hidden border border-border text-base font-bold">
                      {selectedUser.avatar_url ? (
                        <Image src={selectedUser.avatar_url} alt="" width={48} height={48} unoptimized className="h-full w-full object-cover" />
                      ) : (
                        (selectedUser.full_name || selectedUser.username || "U")[0]?.toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-foreground text-sm">{selectedUser.full_name || "Sem nome"}</h4>
                        {selectedUser.is_verified && <VerificationBadge role={selectedUser.verification_label} size="xs" />}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">@{selectedUser.username}</p>
                    </div>
                  </div>
                  <DialogPrimitive.Close className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </DialogPrimitive.Close>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-2.5 bg-muted/40 rounded-lg border border-border">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Localização</span>
                    <span className="font-medium text-foreground truncate block mt-0.5">{selectedUser.city ? `${selectedUser.city}, ${selectedUser.state}` : "Não informada"}</span>
                  </div>
                  <div className="p-2.5 bg-muted/40 rounded-lg border border-border">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Igreja</span>
                    <span className="font-medium text-foreground truncate block mt-0.5">{selectedUser.church || "Não informada"}</span>
                  </div>
                  <div className="p-2.5 bg-muted/40 rounded-lg border border-border">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Telefone</span>
                    <span className="font-medium text-foreground truncate block mt-0.5">{selectedUser.phone || "Não informado"}</span>
                  </div>
                  <div className="p-2.5 bg-muted/40 rounded-lg border border-border">
                    <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Email</span>
                    <span className="font-medium text-foreground truncate block mt-0.5">{selectedUser.email || "Não informado"}</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleToggleFollow(selectedUser)}
                    className={cn(
                      "flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all",
                      isFollowingSelected 
                        ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" 
                        : "bg-whatsapp-teal text-white hover:bg-whatsapp-tealLight"
                    )}
                  >
                    {isFollowingSelected ? <><UserMinus className="h-4 w-4" /> Deixar de Seguir</> : <><UserPlus className="h-4 w-4" /> Seguir Membro</>}
                  </button>
                  <button
                    onClick={() => {
                      setCredentialUser(selectedUser);
                      setIsCredentialOpen(true);
                    }}
                    className="py-2.5 px-4 rounded-lg text-xs font-semibold border border-border bg-card hover:bg-muted text-foreground transition-colors"
                  >
                    Credencial
                  </button>
                </div>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* ─── MODAL DE CONVIDAR / LINK DE CADASTRO ─── */}
      <DialogPrimitive.Root open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card p-6 rounded-2xl z-50 border border-border shadow-2xl animate-in zoom-in-95 text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green">
                  <UserPlus className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">Convidar Novo Membro</h3>
              </div>
              <DialogPrimitive.Close className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            <div className="space-y-4 pt-4 text-xs">
              <p className="text-muted-foreground leading-relaxed">
                Envie o link oficial de registro para novos membros, pastores e líderes se conectarem à comunidade FéConecta.
              </p>

              <div className="p-3 bg-muted/50 rounded-xl border border-border flex items-center justify-between gap-2">
                <span className="font-mono text-foreground truncate text-[11px]">
                  {typeof window !== "undefined" ? `${window.location.origin}/register` : "/register"}
                </span>
                <button
                  onClick={copyInviteLink}
                  className="px-3 py-1.5 bg-whatsapp-teal text-white rounded-lg font-semibold text-xs hover:bg-whatsapp-tealLight transition-colors shrink-0 flex items-center gap-1"
                >
                  <Copy className="h-3.5 w-3.5" /> Copiar
                </button>
              </div>

              <div className="flex justify-end pt-3">
                <DialogPrimitive.Close asChild>
                  <button className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors font-medium">
                    Fechar
                  </button>
                </DialogPrimitive.Close>
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Modais Integrados */}
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
