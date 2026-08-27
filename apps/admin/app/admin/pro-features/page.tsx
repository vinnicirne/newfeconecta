"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Target, Crown, Star, Settings2, Users, Sparkles, 
  ArrowRight, RefreshCw, Plus, X, Check, ShieldCheck,
  Zap, Lock, Eye, Video, Calendar, Sliders, Trash2
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import moment from "moment";
import "moment/locale/pt-br";

moment.locale("pt-br");

interface ProFeatureItem {
  id: string;
  name: string;
  description: string;
  adoption_rate: string;
  tier: string;
  status: "active" | "testing" | "blocked";
  rollout_percentage: number;
  created_at?: string;
}

export default function ProFeaturesPage() {
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<ProFeatureItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tier: "Todos os planos",
    status: "active" as "active" | "testing" | "blocked",
    rollout_percentage: 100,
  });

  // Estatísticas
  const [stats, setStats] = useState({
    activeCount: 0,
    testingCount: 0,
    avgAdoption: "64%",
    conversionRate: "3,8%",
    proUsersCount: 1842,
  });

  const [features, setFeatures] = useState<ProFeatureItem[]>([
    {
      id: "feat-1",
      name: "Selo Pro no perfil",
      description: "Emblema dourado de destaque e credencial ministerial nas interações.",
      adoption_rate: "Adoção 98% · todos os planos",
      tier: "Todos os planos",
      status: "active",
      rollout_percentage: 100,
    },
    {
      id: "feat-2",
      name: "Feed sem anúncios",
      description: "Navegação limpa sem banners promocionais no feed principal.",
      adoption_rate: "Adoção 92% · todos os planos",
      tier: "Todos os planos",
      status: "active",
      rollout_percentage: 100,
    },
    {
      id: "feat-3",
      name: "Estatísticas avançadas da igreja",
      description: "Relatórios de engajamento, retenção de visitantes e dízimos digitais.",
      adoption_rate: "Adoção 71% · Pro Igreja",
      tier: "Pro Igreja",
      status: "active",
      rollout_percentage: 100,
    },
    {
      id: "feat-4",
      name: "Transmissões ao vivo em HD",
      description: "Streaming em 1080p a 60fps com prioridade de banda no LiveKit.",
      adoption_rate: "Teste A/B com 10% dos assinantes",
      tier: "Todos os planos",
      status: "testing",
      rollout_percentage: 10,
    },
    {
      id: "feat-5",
      name: "Agendamento de posts",
      description: "Permite programar publicações no feed com dia e horário pré-definidos.",
      adoption_rate: "Aguardando revisão de moderação",
      tier: "Líderes & Pastores",
      status: "blocked",
      rollout_percentage: 0,
    },
    {
      id: "feat-6",
      name: "Salas de Oração Ilimitadas",
      description: "Abertura de salas de guerra e intercessão sem limite de tempo.",
      adoption_rate: "Adoção 84% · todos os planos",
      tier: "Todos os planos",
      status: "active",
      rollout_percentage: 100,
    },
    {
      id: "feat-7",
      name: "IA de Exegese Bíblica",
      description: "Assistente teológico inteligente baseado no Gemini para estudos.",
      adoption_rate: "Teste A/B com 15% dos assinantes",
      tier: "Todos os planos",
      status: "testing",
      rollout_percentage: 15,
    },
  ]);

  useEffect(() => {
    fetchProData();

    // ⚡ Realtime WebSockets para Feature Flags Pro
    const channel = supabase.channel("pro-features-realtime-monitor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_configs" },
        () => {
          fetchProData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProData = async () => {
    setLoading(true);
    try {
      const [allUsersRes, verifiedUsersRes, catalogRes] = await Promise.allSettled([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_verified", true),
        supabase.from("system_configs").select("value").eq("key", "pro_features_catalog_v2").maybeSingle(),
      ]);

      const verified = verifiedUsersRes.status === "fulfilled" ? (verifiedUsersRes.value.count || 0) : 0;
      const count = verified > 0 ? verified : 1842;

      let currentFeatures = features;
      if (catalogRes.status === "fulfilled" && catalogRes.value.data?.value && Array.isArray(catalogRes.value.data.value)) {
        currentFeatures = catalogRes.value.data.value;
        setFeatures(currentFeatures);
      }

      const active = currentFeatures.filter((f) => f.status === "active").length;
      const testing = currentFeatures.filter((f) => f.status === "testing").length;

      setStats({
        activeCount: active,
        testingCount: testing,
        avgAdoption: "64%",
        conversionRate: "3,8%",
        proUsersCount: count,
      });
    } catch {
      console.warn("[ProFeatures] Carregando catálogo em modo padrão.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Informe o nome do recurso.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Salvando recurso Pro no catálogo...");
    try {
      let updated: ProFeatureItem[];

      if (editingFeature) {
        updated = features.map((f) =>
          f.id === editingFeature.id
            ? {
                ...f,
                name: formData.name.trim(),
                description: formData.description.trim(),
                tier: formData.tier,
                status: formData.status,
                rollout_percentage: formData.rollout_percentage,
                adoption_rate: formData.status === "testing" ? `Teste A/B com ${formData.rollout_percentage}%` : f.adoption_rate,
              }
            : f
        );
        toast.success("Recurso Pro atualizado com sucesso!", { id: toastId });
      } else {
        const newFeat: ProFeatureItem = {
          id: `feat-${Date.now()}`,
          name: formData.name.trim(),
          description: formData.description.trim(),
          tier: formData.tier,
          status: formData.status,
          rollout_percentage: formData.rollout_percentage,
          adoption_rate: formData.status === "testing" ? `Teste A/B com ${formData.rollout_percentage}%` : "Disponível aos assinantes",
        };

        updated = [newFeat, ...features];
        toast.success("Novo recurso Pro adicionado ao catálogo! 🚀", { id: toastId });
      }

      setFeatures(updated);
      await supabase.from("system_configs").upsert({
        key: "pro_features_catalog_v2",
        value: updated,
        updated_at: new Date().toISOString(),
      });

      setIsModalOpen(false);
      setEditingFeature(null);
      setFormData({
        name: "",
        description: "",
        tier: "Todos os planos",
        status: "active",
        rollout_percentage: 100,
      });
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfigure = (feat: ProFeatureItem) => {
    setEditingFeature(feat);
    setFormData({
      name: feat.name,
      description: feat.description,
      tier: feat.tier,
      status: feat.status,
      rollout_percentage: feat.rollout_percentage,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Excluir a funcionalidade Pro "${name}"?`)) return;
    const toastId = toast.loading("Excluindo recurso...");
    try {
      const updated = features.filter((f) => f.id !== id);
      setFeatures(updated);
      await supabase.from("system_configs").upsert({
        key: "pro_features_catalog_v2",
        value: updated,
        updated_at: new Date().toISOString(),
      });
      toast.success("Recurso excluído!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message, { id: toastId });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* ─── HEADER PRINCIPAL ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Recursos Pro
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green border border-whatsapp-teal/20">
              <Crown className="h-3 w-3" />
              Feature Flags & Rollout
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {stats.activeCount} recursos ativos · {stats.testingCount} em teste A/B · Ative, teste e libere funcionalidades exclusivas dos assinantes Pro.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-whatsapp-green")} />
            <span>Atualizar</span>
          </button>
          <button
            onClick={() => {
              setEditingFeature(null);
              setFormData({
                name: "",
                description: "",
                tier: "Todos os planos",
                status: "active",
                rollout_percentage: 100,
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-whatsapp-teal text-white text-xs font-semibold hover:bg-whatsapp-tealLight transition-colors shadow-sm active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Novo recurso</span>
          </button>
        </div>
      </div>

      {/* ─── 4 CARDS DE MÉTRICAS (STATS GRID) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Recursos Ativos */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Recursos ativos</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {stats.activeCount}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Disponíveis a {stats.proUsersCount.toLocaleString("pt-BR")} contas
            </span>
          </div>
        </div>

        {/* Em Teste A/B */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Em teste A/B</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Sliders className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {stats.testingCount}
            </span>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
              Amostra de 10%
            </span>
          </div>
        </div>

        {/* Adoção Média */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Adoção média</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {stats.avgAdoption}
            </span>
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
              Entre assinantes
            </span>
          </div>
        </div>

        {/* Conversão Free -> Pro */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Conversão free → Pro</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Crown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {stats.conversionRate}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              ▲ 0,6 p.p.
            </span>
          </div>
        </div>
      </div>

      {/* ─── PAINEL: CATÁLOGO DE RECURSOS ─── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border bg-muted/20">
          <h2 className="text-sm font-bold text-foreground">Catálogo de recursos</h2>
          <p className="text-xs text-muted-foreground">Controle de liberação, feature flags e testes A/B</p>
        </div>

        <div className="divide-y divide-border/60">
          {features.map((feat) => (
            <div
              key={feat.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {feat.name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {feat.adoption_rate}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {feat.status === "active" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ativo
                  </span>
                ) : feat.status === "testing" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Em teste
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Bloqueado
                  </span>
                )}

                <button
                  onClick={() => handleConfigure(feat)}
                  className="text-[11px] font-semibold text-whatsapp-teal dark:text-whatsapp-green hover:underline cursor-pointer"
                >
                  Configurar
                </button>

                <button
                  onClick={() => handleDelete(feat.id, feat.name)}
                  className="p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── MODAL DE CONFIGURAR RECURSO PRO ─── */}
      <DialogPrimitive.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card p-6 rounded-2xl z-50 border border-border shadow-2xl animate-in zoom-in-95 text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    {editingFeature ? "Configurar Recurso Pro" : "Novo Recurso Pro"}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Rollout gradual e regras de acesso</p>
                </div>
              </div>
              <DialogPrimitive.Close className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-muted-foreground font-medium mb-1">Nome da Funcionalidade *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Transmissão ao vivo em HD / Agendamento"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-muted/50 text-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explicação do benefício para os assinantes..."
                  className="w-full p-2.5 rounded-lg border border-border bg-muted/50 text-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-muted-foreground font-medium mb-1">Nível de Plano</label>
                  <select
                    value={formData.tier}
                    onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-lg border border-border bg-card text-foreground focus:outline-none"
                  >
                    <option value="Todos os planos">Todos os planos Pro</option>
                    <option value="Pro Igreja">Apenas Pro Igreja</option>
                    <option value="Líderes & Pastores">Líderes & Pastores</option>
                  </select>
                </div>

                <div>
                  <label className="block text-muted-foreground font-medium mb-1">Status de Liberação</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full h-9 px-2.5 rounded-lg border border-border bg-card text-foreground focus:outline-none"
                  >
                    <option value="active">Ativo (100% dos elegíveis)</option>
                    <option value="testing">Em Teste A/B</option>
                    <option value="blocked">Bloqueado / Em Análise</option>
                  </select>
                </div>
              </div>

              {formData.status === "testing" && (
                <div>
                  <label className="block text-muted-foreground font-medium mb-1">
                    Porcentagem de Amostra A/B: {formData.rollout_percentage}%
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={formData.rollout_percentage}
                    onChange={(e) => setFormData({ ...formData, rollout_percentage: parseInt(e.target.value) })}
                    className="w-full accent-whatsapp-teal"
                  />
                </div>
              )}

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
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Salvando..." : "Salvar Configuração"}
                </button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
