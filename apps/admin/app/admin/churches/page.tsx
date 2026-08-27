"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Church, MapPin, BadgeCheck, Users, Search, Plus, 
  RefreshCw, ArrowUpRight, ShieldCheck, ShieldAlert,
  MoreHorizontal, Trash2, CheckCircle2, Edit2, X,
  ChevronLeft, ChevronRight, Building2, Globe
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import moment from "moment";
import "moment/locale/pt-br";

moment.locale("pt-br");

interface ChurchData {
  id: string;
  name: string;
  slug: string;
  slogan?: string;
  description?: string;
  city?: string;
  state?: string;
  avatar_url?: string;
  banner_url?: string;
  member_count?: number;
  is_verified?: boolean;
  created_at?: string;
}

export default function AdminChurchesPage() {
  const [churches, setChurches] = useState<ChurchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "pending">("all");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  // Métricas
  const [totalCount, setTotalCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [newMonthCount, setNewMonthCount] = useState(0);

  // Modais de Criação e Edição
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingChurch, setEditingChurch] = useState<ChurchData | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    slogan: "",
    city: "",
    state: "",
    description: "",
    is_verified: false,
  });

  useEffect(() => {
    loadDashboardData();
  }, [page, search, statusFilter]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // 1. Consultas agregadas de métricas reais
      const [
        totalRes,
        verifiedRes,
        newMonthRes,
        membersRes
      ] = await Promise.allSettled([
        supabase.from("churches").select("*", { count: "exact", head: true }),
        supabase.from("churches").select("*", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("churches").select("*", { count: "exact", head: true }).gt("created_at", startOfMonth.toISOString()),
        supabase.from("church_members").select("*", { count: "exact", head: true }).eq("approved", true),
      ]);

      const tCount = totalRes.status === "fulfilled" ? (totalRes.value.count || 0) : 0;
      const vCount = verifiedRes.status === "fulfilled" ? (verifiedRes.value.count || 0) : 0;
      const nCount = newMonthRes.status === "fulfilled" ? (newMonthRes.value.count || 0) : 0;
      const mCount = membersRes.status === "fulfilled" ? (membersRes.value.count || 0) : 0;

      setTotalCount(tCount);
      setVerifiedCount(vCount);
      setPendingCount(Math.max(0, tCount - vCount));
      setNewMonthCount(nCount);
      setTotalMembers(mCount);

      // 2. Consulta paginada e filtrada de congregações
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("churches")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (statusFilter === "verified") {
        query = query.eq("is_verified", true);
      } else if (statusFilter === "pending") {
        query = query.eq("is_verified", false);
      }

      if (search.trim()) {
        query = query.or(
          `name.ilike.%${search}%,slug.ilike.%${search}%,slogan.ilike.%${search}%,description.ilike.%${search}%`
        );
      }

      const { data, error } = await query.range(from, to);

      if (error) throw error;

      const formattedList = (data || []).map((c: any) => ({
        ...c,
        member_count: c.member_count || 0,
      }));

      setChurches(formattedList);
    } catch (err: any) {
      console.error("[Admin Churches] Erro ao carregar dados:", err);
      toast.error("Erro ao carregar igrejas: " + (err.message || "Erro de conexão"));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Informe o nome da igreja.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Cadastrando congregação...");
    try {
      const generatedSlug = (formData.slug.trim() || formData.name.trim())
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const { error } = await supabase
        .from("churches")
        .insert({
          name: formData.name.trim(),
          slug: generatedSlug,
          slogan: formData.slogan.trim() || null,
          description: formData.description.trim() || null,
          is_verified: formData.is_verified,
        });

      if (error) throw error;

      toast.success("Igreja cadastrada com sucesso! 🙌", { id: toastId });
      setIsCreateOpen(false);
      setFormData({ name: "", slug: "", slogan: "", city: "", state: "", description: "", is_verified: false });
      setPage(0);
      loadDashboardData();
    } catch (err: any) {
      toast.error("Erro ao criar igreja: " + (err.message || "Verifique os dados"), { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateChurch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChurch) return;

    setSaving(true);
    const toastId = toast.loading(`Atualizando ${formData.name}...`);
    try {
      const generatedSlug = (formData.slug.trim() || formData.name.trim())
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      const { error } = await supabase
        .from("churches")
        .update({
          name: formData.name.trim(),
          slug: generatedSlug,
          slogan: formData.slogan.trim() || null,
          description: formData.description.trim() || null,
          is_verified: formData.is_verified,
        })
        .eq("id", editingChurch.id);

      if (error) throw error;

      toast.success("Igreja atualizada com sucesso!", { id: toastId });
      setIsEditOpen(false);
      setEditingChurch(null);
      loadDashboardData();
    } catch (err: any) {
      toast.error("Erro ao atualizar igreja: " + err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVerification = async (church: ChurchData) => {
    const newState = !church.is_verified;
    const toastId = toast.loading(`${newState ? "Concedendo selo para" : "Removendo selo de"} ${church.name}...`);
    try {
      const { error } = await supabase
        .from("churches")
        .update({ is_verified: newState })
        .eq("id", church.id);

      if (error) throw error;

      setChurches((prev) =>
        prev.map((c) => (c.id === church.id ? { ...c, is_verified: newState } : c))
      );
      setVerifiedCount((prev) => (newState ? prev + 1 : Math.max(0, prev - 1)));
      setPendingCount((prev) => (newState ? Math.max(0, prev - 1) : prev + 1));
      toast.success(newState ? "Selo oficial concedido!" : "Selo removido com sucesso!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao alterar verificação: " + err.message, { id: toastId });
    }
  };

  const handleDeleteChurch = async (church: ChurchData) => {
    if (!confirm(`TEM CERTEZA ABSOLUTA? Deseja excluir permanentemente a congregação "${church.name}"? Esta ação removerá a igreja da plataforma.`)) {
      return;
    }

    const toastId = toast.loading(`Excluindo ${church.name}...`);
    try {
      const { error } = await supabase
        .from("churches")
        .delete()
        .eq("id", church.id);

      if (error) throw error;

      setChurches((prev) => prev.filter((c) => c.id !== church.id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      if (church.is_verified) {
        setVerifiedCount((prev) => Math.max(0, prev - 1));
      } else {
        setPendingCount((prev) => Math.max(0, prev - 1));
      }
      toast.success("Igreja excluída com sucesso!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao excluir igreja: " + err.message, { id: toastId });
    }
  };

  const openEditModal = (church: ChurchData) => {
    setEditingChurch(church);
    setFormData({
      name: church.name || "",
      slug: church.slug || "",
      slogan: church.slogan || "",
      city: church.city || "",
      state: church.state || "",
      description: church.description || "",
      is_verified: !!church.is_verified,
    });
    setIsEditOpen(true);
  };

  const openCreateModal = () => {
    setFormData({
      name: "",
      slug: "",
      slogan: "",
      city: "",
      state: "",
      description: "",
      is_verified: false,
    });
    setIsCreateOpen(true);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const avgMembers = totalCount > 0 ? Math.round(totalMembers / totalCount) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* ─── HEADER PRINCIPAL ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Gestão de Igrejas & Ministérios
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {totalCount.toLocaleString("pt-BR")} congregações cadastradas · {verifiedCount} verificadas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPage(0); loadDashboardData(); }}
            disabled={loading}
            title="Recarregar dados"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-whatsapp-green")} />
            <span>Atualizar</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-whatsapp-teal text-white text-xs font-semibold hover:bg-whatsapp-tealLight transition-colors shadow-sm active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Cadastrar Igreja</span>
          </button>
        </div>
      </div>

      {/* ─── 4 CARDS DE MÉTRICAS (STATS GRID) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de Igrejas */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Igrejas Cadastradas</span>
            <div className="p-2 rounded-lg bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green">
              <Church className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : totalCount.toLocaleString("pt-BR")}
            </span>
            {newMonthCount > 0 && (
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                ▲ {newMonthCount} no mês
              </span>
            )}
          </div>
        </div>

        {/* Verificadas */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Verificadas</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BadgeCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : verifiedCount.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
              {totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0}% do total
            </span>
          </div>
        </div>

        {/* Aguardando Análise */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Aguardando Análise</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : pendingCount}
            </span>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
              {pendingCount > 0 ? "Fila ativa" : "Tudo em dia"}
            </span>
          </div>
        </div>

        {/* Membros Vinculados */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Membros Aprovados</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : totalMembers.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Média ~{avgMembers}/igreja
            </span>
          </div>
        </div>
      </div>

      {/* ─── PAINEL PRINCIPAL COM TABELA DE CONGREGAÇÕES ─── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
        {/* Barra de Filtros e Busca */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div>
            <h2 className="text-sm font-bold text-foreground">Lista de Congregações</h2>
            <p className="text-xs text-muted-foreground">Gerencie selos, moderação e vínculos ministeriais</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Buscar por nome, slug..."
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-muted/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as any); setPage(0); }}
              className="h-8 px-2.5 rounded-lg border border-border bg-card text-xs text-muted-foreground focus:outline-none"
            >
              <option value="all">Todas as Igrejas</option>
              <option value="verified">Apenas Verificadas</option>
              <option value="pending">Apenas Pendentes</option>
            </select>
          </div>
        </div>

        {/* Tabela de Igrejas */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border uppercase tracking-wider text-[10px] text-muted-foreground font-semibold">
              <tr>
                <th className="px-5 py-3">Igreja</th>
                <th className="px-5 py-3 hidden md:table-cell">Slogan / Identidade</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 hidden lg:table-cell">Cadastro</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    Carregando congregações...
                  </td>
                </tr>
              ) : churches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    Nenhuma congregação encontrada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                churches.map((church) => (
                  <tr key={church.id} className="hover:bg-muted/30 transition-colors">
                    {/* Nome, Slug e Avatar */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div className="h-9 w-9 rounded-xl bg-whatsapp-teal/20 text-whatsapp-teal dark:text-whatsapp-green flex items-center justify-center font-bold text-xs overflow-hidden border border-border shrink-0">
                          {church.avatar_url ? (
                            <Image
                              src={church.avatar_url}
                              alt=""
                              width={36}
                              height={36}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            church.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground truncate block">
                            {church.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono truncate block">
                            /{church.slug || church.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Slogan */}
                    <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground truncate max-w-[220px]">
                      {church.slogan || church.description || "Comunidade da Fé"}
                    </td>

                    {/* Status do Selo */}
                    <td className="px-5 py-3.5 text-center">
                      {church.is_verified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <CheckCircle2 className="h-3 w-3" /> Verificada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Pendente
                        </span>
                      )}
                    </td>

                    {/* Data de Criação */}
                    <td className="px-5 py-3.5 hidden lg:table-cell text-muted-foreground whitespace-nowrap">
                      {church.created_at ? moment(church.created_at).format("DD/MM/YYYY") : "—"}
                    </td>

                    {/* Menu e Atalhos */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/igreja/${church.slug || church.id}`}
                          target="_blank"
                          title="Abrir página pública da igreja"
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors inline-flex items-center gap-1"
                        >
                          Ver <ArrowUpRight className="h-3 w-3" />
                        </Link>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Ações da Igreja</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditModal(church)}>
                              <Edit2 className="h-3.5 w-3.5 mr-2 text-blue-500" /> Editar Informações
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleVerification(church)}>
                              <ShieldCheck className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                              {church.is_verified ? "Remover Selo Oficial" : "Conceder Selo Oficial"}
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/igreja/${church.slug || church.id}/admin`} target="_blank">
                                <Globe className="h-3.5 w-3.5 mr-2 text-purple-500" /> Painel de Liderança
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteChurch(church)} className="text-red-600 focus:text-red-600">
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir Igreja
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé e Paginação */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border bg-muted/20 text-xs">
          <span className="text-muted-foreground">
            Mostrando <strong className="text-foreground">{churches.length}</strong> de <strong className="text-foreground">{totalCount.toLocaleString("pt-BR")}</strong> congregações
          </span>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="h-8 px-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs font-semibold text-foreground">
              {page + 1} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= totalPages || loading}
              className="h-8 px-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODAL DE CADASTRO DE IGREJA ─── */}
      <DialogPrimitive.Root open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card p-6 rounded-2xl z-50 border border-border shadow-2xl animate-in zoom-in-95 text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">Cadastrar Nova Igreja</h3>
              </div>
              <DialogPrimitive.Close className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            <form onSubmit={handleCreateChurch} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-muted-foreground font-medium mb-1">Nome da Igreja *</label>
                <input
                  type="text"
                  required
                  name="church_name"
                  id="create_church_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Igreja Batista Central"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Slug (Identificador na URL)</label>
                <input
                  type="text"
                  name="church_slug"
                  id="create_church_slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="ex: batista-central (deixe em branco para automático)"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Slogan ou Lema Ministerial</label>
                <input
                  type="text"
                  name="church_slogan"
                  id="create_church_slogan"
                  value={formData.slogan}
                  onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                  placeholder="Ex: Uma família para pertencer"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Descrição</label>
                <textarea
                  rows={3}
                  name="church_description"
                  id="create_church_description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Breve resumo da congregação, visão e propósitos..."
                  className="w-full p-2.5 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="church_is_verified"
                  id="create_is_verified"
                  checked={formData.is_verified}
                  onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                  className="rounded border-border accent-whatsapp-teal"
                />
                <label htmlFor="create_is_verified" className="text-foreground font-medium cursor-pointer">
                  Conceder Selo Oficial de Igreja Verificada
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                </DialogPrimitive.Close>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-whatsapp-teal text-white hover:bg-whatsapp-tealLight transition-colors font-semibold disabled:opacity-50"
                >
                  {saving ? "Salvando..." : "Salvar Igreja"}
                </button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* ─── MODAL DE EDIÇÃO DE IGREJA ─── */}
      <DialogPrimitive.Root open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card p-6 rounded-2xl z-50 border border-border shadow-2xl animate-in zoom-in-95 text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <Edit2 className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-base text-foreground">Editar Congregação</h3>
              </div>
              <DialogPrimitive.Close className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            <form onSubmit={handleUpdateChurch} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-muted-foreground font-medium mb-1">Nome da Igreja *</label>
                <input
                  type="text"
                  required
                  name="edit_church_name"
                  id="edit_church_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Slug na Plataforma</label>
                <input
                  type="text"
                  name="edit_church_slug"
                  id="edit_church_slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Slogan</label>
                <input
                  type="text"
                  name="edit_church_slogan"
                  id="edit_church_slogan"
                  value={formData.slogan}
                  onChange={(e) => setFormData({ ...formData, slogan: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Descrição</label>
                <textarea
                  rows={3}
                  name="edit_church_description"
                  id="edit_church_description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  name="edit_church_is_verified"
                  id="edit_is_verified"
                  checked={formData.is_verified}
                  onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                  className="rounded border-border accent-whatsapp-teal"
                />
                <label htmlFor="edit_is_verified" className="text-foreground font-medium cursor-pointer">
                  Selo Oficial de Igreja Verificada
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <DialogPrimitive.Close asChild>
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                </DialogPrimitive.Close>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-whatsapp-teal text-white hover:bg-whatsapp-tealLight transition-colors font-semibold disabled:opacity-50"
                >
                  {saving ? "Atualizando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
