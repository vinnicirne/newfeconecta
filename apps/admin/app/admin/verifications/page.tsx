"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { 
  ShieldCheck, Check, X, Eye, RefreshCw, Clock, 
  AlertCircle, ExternalLink, Plus, ShieldOff, Settings2, 
  RotateCcw, Trash2, Search, Filter, ChevronLeft, ChevronRight,
  BadgeCheck, Users, FileText, CheckCircle2, ShieldAlert
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
import { toast } from "sonner";
import { VerificationBadge } from "@/components/verification-badge";
import { DigitalCredentialModal } from "@/components/admin/DigitalCredentialModal";
import { ManualVerificationModal } from "@/components/admin/ManualVerificationModal";

moment.locale("pt-br");

interface VerificationRequest {
  id: string;
  user_id: string;
  requested_role: string;
  document_url?: string;
  secondary_document_url?: string;
  payment_receipt_url?: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at?: string;
  profiles?: {
    full_name?: string;
    username?: string;
    avatar_url?: string;
    email?: string;
  };
}

export default function VerificationsPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 10;

  // Modais
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [selectedVerifyUser, setSelectedVerifyUser] = useState<any | null>(null);
  const [isCredentialOpen, setIsCredentialOpen] = useState(false);
  const [credentialUser, setCredentialUser] = useState<any | null>(null);

  // Estatísticas
  const [stats, setStats] = useState({
    pending: 0,
    activeVerified: 0,
    approvedToday: 0,
    totalProcessed: 0
  });

  useEffect(() => {
    fetchRequests();
    fetchStats();
  }, [page, search, statusFilter]);

  const fetchStats = async () => {
    try {
      const todayStart = moment().startOf("day").toISOString();

      const [
        pendingRes,
        activeRes,
        approvedTodayRes,
        totalRes
      ] = await Promise.allSettled([
        supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("verification_requests").select("*", { count: "exact", head: true }).eq("status", "approved").gt("updated_at", todayStart),
        supabase.from("verification_requests").select("*", { count: "exact", head: true }),
      ]);

      setStats({
        pending: pendingRes.status === "fulfilled" ? (pendingRes.value.count || 0) : 0,
        activeVerified: activeRes.status === "fulfilled" ? (activeRes.value.count || 0) : 0,
        approvedToday: approvedTodayRes.status === "fulfilled" ? (approvedTodayRes.value.count || 0) : 0,
        totalProcessed: totalRes.status === "fulfilled" ? (totalRes.value.count || 0) : 0,
      });
    } catch (err) {
      console.error("[Verifications] Erro ao buscar métricas:", err);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("verification_requests")
        .select("*, profiles!user_id(full_name, username, avatar_url, email)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (search.trim()) {
        query = query.or(
          `requested_role.ilike.%${search}%,profiles.username.ilike.%${search}%,profiles.full_name.ilike.%${search}%`
        );
      }

      const { data, count, error } = await query.range(from, to);

      if (error) throw error;
      setRequests(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      console.error("[Verifications] Erro ao buscar solicitações:", err);
      toast.error("Erro ao carregar solicitações: " + (err.message || "Erro de conexão"));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (request: VerificationRequest, status: "approved" | "rejected") => {
    const toastId = toast.loading(`${status === "approved" ? "Aprovando" : "Recusando"} selo de @${request.profiles?.username || "membro"}...`);
    try {
      // 1. Atualizar solicitação
      const { error: requestError } = await supabase
        .from("verification_requests")
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq("id", request.id);

      if (requestError) throw requestError;

      // 2. Se aprovado, sincronizar perfil
      if (status === "approved") {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ 
            is_verified: true, 
            verification_label: request.requested_role || "Verificado"
          })
          .eq("id", request.user_id);

        if (profileError) throw profileError;
        toast.success(`Usuário @${request.profiles?.username || "membro"} verificado com sucesso!`, { id: toastId });
      } else {
        toast.success(`Solicitação de @${request.profiles?.username || "membro"} recusada.`, { id: toastId });
      }

      fetchRequests();
      fetchStats();
    } catch (err: any) {
      toast.error("Erro ao processar ação: " + err.message, { id: toastId });
    }
  };

  const handleRevokeVerification = async (request: VerificationRequest) => {
    if (!confirm(`Deseja realmente revogar o selo oficial de @${request.profiles?.username}?`)) return;

    const toastId = toast.loading(`Revogando selo de @${request.profiles?.username}...`);
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_verified: false, verification_label: null })
        .eq("id", request.user_id);

      if (profileError) throw profileError;

      await supabase
        .from("verification_requests")
        .update({ status: "rejected", updated_at: new Date().toISOString() })
        .eq("id", request.id);

      toast.success("Selo oficial revogado com sucesso!", { id: toastId });
      fetchRequests();
      fetchStats();
    } catch (err: any) {
      toast.error("Erro ao revogar selo: " + err.message, { id: toastId });
    }
  };

  const handleDeleteRequest = async (request: VerificationRequest) => {
    if (!confirm(`Excluir permanentemente este registro de auditoria de @${request.profiles?.username}?`)) return;

    const toastId = toast.loading("Excluindo registro...");
    try {
      const { error } = await supabase
        .from("verification_requests")
        .delete()
        .eq("id", request.id);

      if (error) throw error;
      toast.success("Registro de auditoria excluído!", { id: toastId });
      fetchRequests();
      fetchStats();
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message, { id: toastId });
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* ─── HEADER PRINCIPAL ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Solicitações de Verificação & Selos
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Analise documentos e conceda selos oficiais de autenticidade para ministérios, pastores e líderes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { setPage(0); fetchRequests(); fetchStats(); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-whatsapp-green")} />
            <span>Atualizar</span>
          </button>
          <button
            onClick={() => {
              setSelectedVerifyUser(null);
              setIsManualModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-whatsapp-teal text-white text-xs font-semibold hover:bg-whatsapp-tealLight transition-colors shadow-sm active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Verificar Manualmente</span>
          </button>
        </div>
      </div>

      {/* ─── 4 CARDS DE MÉTRICAS (STATS GRID) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pendentes */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Pendentes de Análise</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.pending}
            </span>
            <span className={cn(
              "text-[11px] font-semibold px-1.5 py-0.5 rounded",
              stats.pending > 0 
                ? "text-amber-600 dark:text-amber-400 bg-amber-500/10" 
                : "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
            )}>
              {stats.pending > 0 ? "Fila ativa" : "Tudo em dia"}
            </span>
          </div>
        </div>

        {/* Verificados Ativos */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Verificados Ativos</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.activeVerified.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Selos oficiais
            </span>
          </div>
        </div>

        {/* Aprovados Hoje */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Aprovados Hoje</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BadgeCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.approvedToday}
            </span>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
              Dia civil
            </span>
          </div>
        </div>

        {/* Total Processado */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Auditoria / Processados</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {loading ? "..." : stats.totalProcessed.toLocaleString("pt-BR")}
            </span>
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
              Registros
            </span>
          </div>
        </div>
      </div>

      {/* ─── PAINEL PRINCIPAL COM TABELA DE SOLICITAÇÕES ─── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
        {/* Barra de Filtros e Busca */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div>
            <h2 className="text-sm font-bold text-foreground">Fila de Solicitações</h2>
            <p className="text-xs text-muted-foreground">Examine a documentação comprobatória e aprove os selos</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                placeholder="Buscar usuário ou cargo..."
                className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-muted/60 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as any); setPage(0); }}
              className="h-8 px-2.5 rounded-lg border border-border bg-card text-xs text-muted-foreground focus:outline-none"
            >
              <option value="pending">Status: Pendentes</option>
              <option value="approved">Status: Aprovados</option>
              <option value="rejected">Status: Recusados</option>
              <option value="all">Status: Todos</option>
            </select>
          </div>
        </div>

        {/* Tabela de Solicitações */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border uppercase tracking-wider text-[10px] text-muted-foreground font-semibold">
              <tr>
                <th className="px-5 py-3">Usuário</th>
                <th className="px-5 py-3">Cargo Solicitado</th>
                <th className="px-5 py-3">Documentos Anexados</th>
                <th className="px-5 py-3 hidden md:table-cell">Solicitado Em</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    Carregando solicitações...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    Nenhuma solicitação encontrada com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                    {/* Usuário */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <div className="h-8 w-8 rounded-full bg-whatsapp-teal/20 text-whatsapp-teal dark:text-whatsapp-green flex items-center justify-center font-bold text-xs overflow-hidden border border-border shrink-0">
                          {req.profiles?.avatar_url ? (
                            <Image
                              src={req.profiles.avatar_url}
                              alt=""
                              width={32}
                              height={32}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            (req.profiles?.full_name || req.profiles?.username || "U")[0]?.toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground truncate">
                            {req.profiles?.full_name || "Sem nome cadastrado"}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            @{req.profiles?.username || "usuario"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cargo / Selo */}
                    <td className="px-5 py-3.5">
                      <div 
                        className="cursor-pointer inline-block"
                        onClick={() => {
                          setCredentialUser({
                            ...req.profiles,
                            verification_label: req.requested_role,
                            created_at: req.created_at,
                          });
                          setIsCredentialOpen(true);
                        }}
                      >
                        <VerificationBadge 
                          role={req.requested_role} 
                          size="sm" 
                          showLabel={true} 
                        />
                      </div>
                    </td>

                    {/* Anexos */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {req.document_url && (
                          <a
                            href={req.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:underline font-semibold text-[11px] border border-blue-500/20"
                          >
                            <Eye className="h-3 w-3" /> Diploma / Doc
                          </a>
                        )}
                        {req.secondary_document_url && (
                          <a
                            href={req.secondary_document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:underline font-semibold text-[11px] border border-amber-500/20"
                          >
                            <Eye className="h-3 w-3" /> RG / CNH
                          </a>
                        )}
                        {req.payment_receipt_url && (
                          <a
                            href={req.payment_receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:underline font-semibold text-[11px] border border-emerald-500/20"
                          >
                            <Eye className="h-3 w-3" /> PIX Pago
                          </a>
                        )}
                        {!req.document_url && !req.secondary_document_url && !req.payment_receipt_url && (
                          <span className="text-muted-foreground text-[11px]">Sem anexos</span>
                        )}
                      </div>
                    </td>

                    {/* Data */}
                    <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground whitespace-nowrap">
                      {req.created_at ? moment(req.created_at).fromNow() : "—"}
                    </td>

                    {/* Ações */}
                    <td className="px-5 py-3.5 text-right">
                      {req.status === "pending" ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleAction(req, "rejected")}
                            title="Recusar Solicitação"
                            className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all active:scale-95"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleAction(req, "approved")}
                            title="Aprovar Verificação"
                            className="p-1.5 rounded-lg bg-whatsapp-teal text-white hover:bg-whatsapp-tealLight transition-all shadow-sm active:scale-95"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-semibold uppercase",
                            req.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                          )}>
                            {req.status === "approved" ? "Aprovado" : "Recusado"}
                          </span>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                <Settings2 className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Opções de Verificação</DropdownMenuLabel>
                              {req.status === "approved" ? (
                                <DropdownMenuItem onClick={() => handleRevokeVerification(req)} className="text-red-500">
                                  <ShieldOff className="h-3.5 w-3.5 mr-2" /> Revogar Selo Oficial
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleAction(req, "approved")} className="text-emerald-500">
                                  <Check className="h-3.5 w-3.5 mr-2" /> Reavaliar & Aprovar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedVerifyUser({
                                    id: req.user_id,
                                    username: req.profiles?.username,
                                    full_name: req.profiles?.full_name,
                                    avatar_url: req.profiles?.avatar_url,
                                    verification_label: req.requested_role,
                                    is_verified: req.status === "approved",
                                  });
                                  setIsManualModalOpen(true);
                                }}
                              >
                                <RotateCcw className="h-3.5 w-3.5 mr-2 text-blue-500" /> Alterar Cargo / Selo
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDeleteRequest(req)} className="text-red-600 focus:text-red-600">
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir Registro
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
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
            Mostrando <strong className="text-foreground">{requests.length}</strong> de <strong className="text-foreground">{totalCount.toLocaleString("pt-BR")}</strong> solicitações
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

      {/* Modais Integrados */}
      <ManualVerificationModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setSelectedVerifyUser(null);
        }}
        onVerified={() => {
          fetchRequests();
          fetchStats();
        }}
        initialUser={selectedVerifyUser}
      />

      <DigitalCredentialModal 
        isOpen={isCredentialOpen}
        onClose={() => setIsCredentialOpen(false)}
        user={credentialUser}
      />
    </div>
  );
}
