"use client";

import React, { useEffect, useState } from "react";
import { AlertOctagon, CheckCircle2, RefreshCw, Activity, Users, Flame, X, Zap, ShieldCheck } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import moment from "moment";
import "moment/locale/pt-br";

moment.locale("pt-br");

interface IncidentItem {
  id: string;
  title: string;
  description: string;
  severity: "SEV-1" | "SEV-2" | "SEV-3";
  status: "active" | "contained" | "resolved";
  affected_module?: string;
  metrics_summary?: string;
  created_at: string;
  resolved_at?: string;
  metadata?: Record<string, unknown>;
  isReport?: boolean;
}

export default function WaroomPage() {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeclareOpen, setIsDeclareOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [onlineModsCount, setOnlineModsCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [updatingIncidentId, setUpdatingIncidentId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    severity: "SEV-2" as "SEV-1" | "SEV-2" | "SEV-3",
    affected_module: "Feed & Publicações",
    metrics_summary: "",
  });

  const reportCount = incidents.filter((incident) => incident.isReport).length;
  const activeCount = incidents.filter((incident) => incident.status === "active").length;

  useEffect(() => {
    fetchIncidents();

    // ⚡ Monitor Realtime WebSocket de Incidentes e Presença
    const presenceKey = typeof crypto !== "undefined" ? crypto.randomUUID() : `waroom-${Date.now()}`;
    const channel = supabase.channel("waroom-realtime-monitor", {
      config: { presence: { key: presenceKey } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setOnlineModsCount(count);
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_errors" },
        () => {
          fetchIncidents();
        }
      )
      .subscribe(async (status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      // Buscar erros e incidentes registrados
      const { data, error } = await supabase
        .from("system_errors")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      // Normalizar incidentes e denúncias registrados no banco
      const formatted: IncidentItem[] = (data || []).map((item: any) => {
        const isReport = item.error_message?.startsWith("[DENÚNCIA]");
        const isResolved = item.resolved;
        const severityMatch = item.error_message?.match(/\[(?:WAROOM )?(SEV-[123])\]/i);
        const savedSeverity = item.metadata?.severity;
        const severityCandidate = savedSeverity || severityMatch?.[1];
        const sev: IncidentItem["severity"] = severityCandidate === "SEV-1" || severityCandidate === "SEV-2" || severityCandidate === "SEV-3"
          ? severityCandidate
          : isReport ? "SEV-2" : "SEV-3";
        const rawTitle = String(item.error_message || "Oscilação no serviço").replace(/^\[WAROOM SEV-[123]\]\s*/i, "").replace(/^\[DENÚNCIA\]\s*/i, "");

        return {
          id: item.id,
          title: `${sev} · ${isReport ? item.metadata?.reason || rawTitle : rawTitle}`,
          description: item.metadata?.snippet || item.stack_trace || "Incidente registrado pelo monitor de infraestrutura.",
          severity: sev,
          status: isResolved ? "resolved" : item.metadata?.status === "contained" ? "contained" : "active",
          affected_module: item.module || "Infraestrutura",
          metrics_summary: item.metadata?.post_id ? `Post #${item.metadata.post_id.slice(0, 6)} · ${item.metadata?.author || "membro"}` : `Módulo ${item.module || "Core"}`,
          created_at: item.created_at,
          resolved_at: item.resolved_at,
          metadata: item.metadata || {},
          isReport,
        };
      });

      setIncidents(formatted);
      setLoadError(false);
    } catch (err: any) {
      console.warn("[Waroom] Erro ao carregar incidentes:", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeclareIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Informe o título do incidente.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Declarando incidente na Waroom...");
    try {
      const { data, error } = await supabase
        .from("system_errors")
        .insert({
          error_message: `[WAROOM ${formData.severity}] ${formData.title.trim()}`,
          module: formData.affected_module,
          resolved: false,
          metadata: {
            snippet: formData.description.trim(),
            metrics: formData.metrics_summary.trim() || "Declarado manualmente",
            severity: formData.severity,
            status: "active",
          },
        })
        .select()
        .single();

      if (error) throw error;

      const newInc: IncidentItem = {
        id: data?.id || `inc-${Date.now()}`,
        title: `${formData.severity} · ${formData.title.trim()}`,
        description: formData.description.trim() || "Incidente declarado manualmente.",
        severity: formData.severity,
        status: "active",
        affected_module: formData.affected_module,
        metrics_summary: formData.metrics_summary.trim() || "Monitoramento ativo",
        created_at: new Date().toISOString(),
        metadata: { status: "active", severity: formData.severity },
      };

      setIncidents((prev) => [newInc, ...prev]);
      setIsDeclareOpen(false);
      setFormData({
        title: "",
        description: "",
        severity: "SEV-2",
        affected_module: "Feed & Publicações",
        metrics_summary: "",
      });
      toast.success("Incidente declarado com sucesso! Equipe alertada. 🚨", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao declarar incidente: " + err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (incident: IncidentItem, newStatus: "contained" | "resolved") => {
    setUpdatingIncidentId(incident.id);
    const toastId = toast.loading(`Alterando status do incidente para ${newStatus === "resolved" ? "Encerrado" : "Contido"}...`);
    try {
      const { error } = await supabase
        .from("system_errors")
        .update({
          resolved: newStatus === "resolved",
          metadata: { ...(incident.metadata || {}), status: newStatus },
        })
        .eq("id", incident.id);
      if (error) throw error;

      setIncidents((prev) =>
        prev.map((i) => (i.id === incident.id ? { ...i, status: newStatus } : i))
      );
      if (selectedIncident?.id === incident.id) setSelectedIncident(null);
      toast.success(newStatus === "resolved" ? "Incidente encerrado com sucesso! ✅" : "Incidente marcado como Contido. 🛡️", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao atualizar incidente: " + err.message, { id: toastId });
    } finally {
      setUpdatingIncidentId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* ─── HEADER PRINCIPAL ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Waroom
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
              {isRealtimeConnected ? "Ao Vivo" : "Reconectando"}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Sala de guerra: incidentes ao vivo, picos de denúncias e resposta coordenada da equipe.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchIncidents}
            disabled={loading}
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-whatsapp-green")} />
            <span>Atualizar</span>
          </button>
          <button
            onClick={() => setIsDeclareOpen(true)}
            type="button"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-sm active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <AlertOctagon className="h-3.5 w-3.5" />
            <span>Declarar Incidente</span>
          </button>
        </div>
      </div>

      {/* Métricas calculadas a partir dos incidentes carregados e da presença realtime */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 dark:bg-red-950/10 p-4 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Incidentes ativos</span><Flame className="h-4 w-4 text-red-500" aria-hidden="true" /></div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">{activeCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Denúncias carregadas</span><Activity className="h-4 w-4 text-amber-500" aria-hidden="true" /></div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">{reportCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Sessões na Waroom</span><Users className="h-4 w-4 text-emerald-500" aria-hidden="true" /></div>
          <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">{onlineModsCount}</p>
        </div>
      </div>

      {/* ─── PAINEL PRINCIPAL COM INCIDENTES AO VIVO ─── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
          <div>
            <h2 className="text-sm font-bold text-foreground">Incidentes ao Vivo</h2>
            <p className="text-xs text-muted-foreground">Sincronizado em tempo real via WebSocket</p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {incidents.length} ocorrências
          </span>
        </div>

        {/* Lista de Incidentes */}
        <div className="divide-y divide-border/60">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground" role="status" aria-live="polite">
              Carregando incidentes da Waroom…
            </div>
          ) : loadError ? (
            <div className="py-12 text-center space-y-3" role="alert">
              <p className="text-sm font-semibold text-foreground">Não foi possível carregar os incidentes.</p>
              <p className="text-xs text-muted-foreground">Confira sua conexão e tente novamente.</p>
              <button type="button" onClick={() => void fetchIncidents()} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal">Tentar novamente</button>
            </div>
          ) : incidents.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto opacity-80" />
              <h3 className="text-sm font-semibold text-foreground">Nenhum incidente ativo</h3>
              <p className="text-xs text-muted-foreground">Infraestrutura e moderação operando normalmente.</p>
            </div>
          ) : (
            incidents.map((incident) => (
              <div
                key={incident.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-muted/30 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {incident.title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {incident.metrics_summary} · {moment(incident.created_at).fromNow()}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {incident.status === "active" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" /> Ativo
                    </span>
                  ) : incident.status === "contained" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Contido
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Encerrado
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedIncident(incident)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold bg-whatsapp-teal text-white hover:bg-whatsapp-tealLight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal focus-visible:ring-offset-2"
                  >
                    {incident.status === "resolved" ? "Ver detalhes" : "Gerenciar"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── MODAL DE DECLARAR INCIDENTE ─── */}
      <DialogPrimitive.Root open={isDeclareOpen} onOpenChange={setIsDeclareOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto overscroll-contain bg-card p-4 sm:p-6 rounded-2xl z-50 border border-border shadow-2xl animate-in zoom-in-95 text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                  <AlertOctagon className="h-5 w-5" />
                </div>
                <div>
                  <DialogPrimitive.Title className="font-bold text-sm text-foreground">Declarar Novo Incidente</DialogPrimitive.Title>
                  <DialogPrimitive.Description className="text-[11px] text-muted-foreground">Emita um alerta para resposta coordenada da equipe</DialogPrimitive.Description>
                </div>
              </div>
              <DialogPrimitive.Close aria-label="Fechar formulário" className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal">
                <X className="h-4 w-4" aria-hidden="true" />
              </DialogPrimitive.Close>
            </div>

            <form onSubmit={handleDeclareIncident} className="space-y-4 pt-4 text-xs">
              <div>
                <label htmlFor="incident-title" className="block text-muted-foreground font-medium mb-1">Título do Incidente *</label>
                <input
                  id="incident-title"
                  name="title"
                  type="text"
                  required
                  maxLength={160}
                  autoComplete="off"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Ataque de spam no feed / Instabilidade no WebSocket"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="incident-severity" className="block text-muted-foreground font-medium mb-1">Severidade</label>
                  <select
                    id="incident-severity"
                    name="severity"
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as IncidentItem["severity"] })}
                    className="w-full h-9 px-2.5 rounded-lg border border-border bg-card text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <option value="SEV-1">SEV-1 (Crítico / Parada Total)</option>
                    <option value="SEV-2">SEV-2 (Alto / Degradação)</option>
                    <option value="SEV-3">SEV-3 (Médio / Incidente Local)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="incident-module" className="block text-muted-foreground font-medium mb-1">Módulo Afetado</label>
                  <select
                    id="incident-module"
                    name="affected_module"
                    value={formData.affected_module}
                    onChange={(e) => setFormData({ ...formData, affected_module: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-lg border border-border bg-card text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <option value="Feed & Publicações">Feed & Publicações</option>
                    <option value="Autenticação">Autenticação (Login/Cadastro)</option>
                    <option value="Push Notifications">Push Notifications</option>
                    <option value="Salas de Oração">Salas de Oração / Áudio</option>
                    <option value="Banco de Dados">Banco de Dados</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="incident-metrics" className="block text-muted-foreground font-medium mb-1">Impacto & Resumo Numérico</label>
                <input
                  id="incident-metrics"
                  name="metrics_summary"
                  type="text"
                  maxLength={250}
                  autoComplete="off"
                  value={formData.metrics_summary}
                  onChange={(e) => setFormData({ ...formData, metrics_summary: e.target.value })}
                  placeholder="Ex: 140 posts em 5 min · 8 contas sob suspeita"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label htmlFor="incident-description" className="block text-muted-foreground font-medium mb-1">Descrição & Procedimento</label>
                <textarea
                  id="incident-description"
                  name="description"
                  rows={3}
                  maxLength={2000}
                  autoComplete="off"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Instruções para os moderadores em plantão..."
                  className="w-full p-2.5 rounded-lg border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
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
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? "Declarando..." : "Emitir Alerta"}
                </button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* ─── MODAL DE AÇÃO / ASSUMIR INCIDENTE ─── */}
      <DialogPrimitive.Root open={!!selectedIncident} onOpenChange={(open) => !open && setSelectedIncident(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto overscroll-contain bg-card p-4 sm:p-6 rounded-2xl z-50 border border-border shadow-2xl animate-in zoom-in-95 text-foreground">
            {selectedIncident && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <DialogPrimitive.Title className="font-bold text-sm text-foreground">Ação de Resposta em Waroom</DialogPrimitive.Title>
                      <DialogPrimitive.Description className="text-[11px] text-muted-foreground font-mono">
                        {selectedIncident.severity} · {selectedIncident.affected_module}
                      </DialogPrimitive.Description>
                    </div>
                  </div>
                  <DialogPrimitive.Close aria-label="Fechar detalhes do incidente" className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-whatsapp-teal">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </DialogPrimitive.Close>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
                    <h4 className="font-bold text-foreground text-sm">{selectedIncident.title}</h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {selectedIncident.description}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-muted/30 rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Métricas:</span>
                      <span className="font-medium text-foreground block truncate">{selectedIncident.metrics_summary || "Sem métricas"}</span>
                    </div>
                    <div className="p-2.5 bg-muted/30 rounded-lg border border-border">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold">Início:</span>
                      <span className="font-medium text-foreground block truncate">{moment(selectedIncident.created_at).format("DD/MM/YYYY HH:mm")}</span>
                    </div>
                  </div>
                </div>

                {selectedIncident.status !== "resolved" && <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    disabled={updatingIncidentId === selectedIncident.id}
                    onClick={() => handleUpdateStatus(selectedIncident, "contained")}
                    className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Marcar como Contido
                  </button>
                  <button
                    type="button"
                    disabled={updatingIncidentId === selectedIncident.id}
                    onClick={() => handleUpdateStatus(selectedIncident, "resolved")}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Encerrar Incidente
                  </button>
                </div>}
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
