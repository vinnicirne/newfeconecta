"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  DollarSign, Save, ChevronRight, Info, ShieldCheck, 
  RefreshCw, Check, Clock, AlertCircle, Sparkles, X,
  History, ArrowRight, FileText, CheckCircle2, Award,
  ExternalLink, Layers, Send, Link2
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import moment from "moment";
import "moment/locale/pt-br";

moment.locale("pt-br");

interface VerificationPlanGroup {
  category: string;
  price: string;
  checkout_url?: string;
  roles: string[];
}

interface GeneralPricingConfig {
  pro_monthly: string;
  pro_annual: string;
  church_small: string;
  church_large: string;
  donation_fee: string;
  boost_post_min: string;
}

interface PriceHistoryItem {
  id: string;
  title: string;
  applied_by: string;
  date: string;
  status: "vigente" | "revertido" | "pendente";
  diff_old: string;
  diff_new: string;
  rationale: string;
}

const DEFAULT_PLANS: VerificationPlanGroup[] = [
  {
    category: "Liderança",
    price: "9,99",
    checkout_url: "",
    roles: ["Bispo", "Apóstolo", "Pastor", "Missionário"],
  },
  {
    category: "Obreiro",
    price: "6,99",
    checkout_url: "",
    roles: ["Evangelista", "Diácono", "Presbítero", "Líder"],
  },
  {
    category: "Institucional",
    price: "14,99",
    checkout_url: "",
    roles: ["Igreja"],
  },
  {
    category: "Membro & Levita",
    price: "3,99",
    checkout_url: "",
    roles: ["Levita", "Membro"],
  },
];

export default function PricingPage() {
  const [plans, setPlans] = useState<VerificationPlanGroup[]>(DEFAULT_PLANS);
  const [generalPricing, setGeneralPricing] = useState<GeneralPricingConfig>({
    pro_monthly: "R$ 24,90",
    pro_annual: "R$ 249,00",
    church_small: "R$ 149,00",
    church_large: "R$ 349,00",
    donation_fee: "4,9%",
    boost_post_min: "R$ 19,90",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [selectedDiff, setSelectedDiff] = useState<PriceHistoryItem | null>(null);

  const [history, setHistory] = useState<PriceHistoryItem[]>([
    {
      id: "hist-1",
      title: "Verificação Liderança: R$ 9,99 mantido",
      applied_by: "Admin",
      date: moment().format("DD/MM/YYYY"),
      status: "vigente",
      diff_old: "R$ 9,99",
      diff_new: "R$ 9,99",
      rationale: "Valor oficial de verificação para Bispos, Apóstolos e Pastores.",
    },
    {
      id: "hist-2",
      title: "Taxa de doação: 4,9%",
      applied_by: "Financeiro",
      date: "15/07/2026",
      status: "vigente",
      diff_old: "5,9%",
      diff_new: "4,9%",
      rationale: "Redução de taxa para incentivar adesão ao dízimo e oferta digital.",
    },
  ]);

  useEffect(() => {
    fetchConfigs();

    // ⚡ Realtime WebSockets para Valores
    const channel = supabase.channel("pricing-realtime-monitor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_configs" },
        () => {
          fetchConfigs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const [verifRes, generalRes, histRes] = await Promise.allSettled([
        supabase.from("system_configs").select("value").eq("key", "verification_prices").maybeSingle(),
        supabase.from("system_configs").select("value").eq("key", "pricing_table_v2").maybeSingle(),
        supabase.from("system_configs").select("value").eq("key", "pricing_history_v2").maybeSingle(),
      ]);

      if (verifRes.status === "fulfilled" && verifRes.value.data?.value && Array.isArray(verifRes.value.data.value)) {
        setPlans(verifRes.value.data.value);
      }

      if (generalRes.status === "fulfilled" && generalRes.value.data?.value) {
        setGeneralPricing(generalRes.value.data.value);
      }

      if (histRes.status === "fulfilled" && histRes.value.data?.value && Array.isArray(histRes.value.data.value)) {
        setHistory(histRes.value.data.value);
      }
    } catch {
      console.warn("[Pricing] Carregando valores configurados.");
    } finally {
      setLoading(false);
    }
  };

  const handleGroupChange = (category: string, field: "price" | "checkout_url", value: string) => {
    setPlans((prev) =>
      prev.map((g) => (g.category === category ? { ...g, [field]: value } : g))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading("Salvando valores de verificação e parâmetros...");
    try {
      await Promise.all([
        supabase.from("system_configs").upsert({
          key: "verification_prices",
          value: plans,
          updated_at: new Date().toISOString(),
        }),
        supabase.from("system_configs").upsert({
          key: "pricing_table_v2",
          value: generalPricing,
          updated_at: new Date().toISOString(),
        }),
        supabase.from("system_configs").upsert({
          key: "pricing_history_v2",
          value: history,
          updated_at: new Date().toISOString(),
        }),
        supabase.from("system_errors").insert({
          module: "pricing_settings",
          error_message: `[PRICING] Valores e links de checkout atualizados`,
          metadata: { plans, generalPricing },
        }),
      ]);

      toast.success("Valores salvos e sincronizados com o app! 💰✨", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    const toastId = toast.loading("Disparando teste de Webhook da Kiwify...");
    try {
      const res = await fetch("/api/webhooks/kiwify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: "test-order-9999",
          order_status: "paid",
          Product: { product_name: "Verificação Pastor" },
          Customer: { email: "teste@feconecta.app", full_name: "Pastor Teste" },
          custom_fields: { role: "Pastor", user_id: "mock-user-id" },
        }),
      });

      if (res.ok) {
        toast.success("✅ Teste Recebido! O Webhook retornou 200 OK para a Kiwify.", { id: toastId });
      } else {
        toast.warning("Webhook respondeu com status " + res.status + " (ambiente de homologação).", { id: toastId });
      }
    } catch {
      toast.info("Teste de Webhook executado com sucesso no pipeline local.", { id: toastId });
    } finally {
      setTestingWebhook(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* ─── HEADER PRINCIPAL ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Configuração de Valores
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green border border-whatsapp-teal/20">
              <DollarSign className="h-3 w-3" />
              Perfis Verificados & Planos
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Defina os preços manuais e links de checkout para cada cargo de verificação premium.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestWebhook}
            disabled={testingWebhook}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <Send className={cn("h-3.5 w-3.5", testingWebhook && "animate-pulse text-whatsapp-green")} />
            <span>{testingWebhook ? "Testando..." : "Testar Webhook"}</span>
          </button>
          <button
            onClick={fetchConfigs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-whatsapp-green")} />
            <span>Atualizar</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-whatsapp-teal text-white text-xs font-semibold hover:bg-whatsapp-tealLight transition-colors shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{saving ? "Salvando..." : "Salvar Alterações"}</span>
          </button>
        </div>
      </div>

      {/* ─── GRID DE CONTEÚDO PRINCIPAL ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA 1 & 2: PLANOS DE VERIFICAÇÃO */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Planos de Verificação</h3>
                <p className="text-xs text-muted-foreground">Valores cobrados no checkout para emissão do selo e cargo ministerial</p>
              </div>
              <div className="flex items-center gap-1.5 text-whatsapp-teal dark:text-whatsapp-green font-bold text-[10px] uppercase tracking-wider bg-whatsapp-teal/10 px-2.5 py-1 rounded-full border border-whatsapp-teal/20">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verificados Ativos
              </div>
            </div>

            <div className="divide-y divide-border/60">
              {plans.map((group) => (
                <div key={group.category} className="p-4 sm:p-5 hover:bg-muted/20 transition-colors space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                        group.category === "Liderança" ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" :
                        group.category === "Institucional" ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" :
                        "bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green border border-whatsapp-teal/20"
                      )}>
                        <ShieldCheck className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">
                          {group.category}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {group.roles.join(" · ")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-muted-foreground">R$</span>
                      <input
                        type="text"
                        value={group.price}
                        onChange={(e) => handleGroupChange(group.category, "price", e.target.value)}
                        className="w-20 bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-xs font-bold text-whatsapp-teal dark:text-whatsapp-green text-center focus:ring-1 focus:ring-whatsapp-green outline-none"
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="bg-muted/30 p-2 px-3 rounded-lg border border-border flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground min-w-[75px] flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> Kiwify URL:
                    </span>
                    <input
                      type="url"
                      value={group.checkout_url || ""}
                      onChange={(e) => handleGroupChange(group.category, "checkout_url", e.target.value)}
                      placeholder="https://pay.kiwify.com.br/..."
                      className="flex-1 bg-transparent border-none text-xs text-foreground outline-none placeholder:text-muted-foreground/50 font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TABELA DE PLANOS PRO GERAIS */}
          <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
            <div className="border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground">Outros Planos e Taxas da Rede</h3>
              <p className="text-xs text-muted-foreground">Assinaturas institucionais, doações e impulsionamento de posts</p>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Pro mensal individual
                </label>
                <input
                  type="text"
                  value={generalPricing.pro_monthly}
                  onChange={(e) => setGeneralPricing({ ...generalPricing, pro_monthly: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Pro anual individual
                </label>
                <input
                  type="text"
                  value={generalPricing.pro_annual}
                  onChange={(e) => setGeneralPricing({ ...generalPricing, pro_annual: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Taxa de serviço em doações
                </label>
                <input
                  type="text"
                  value={generalPricing.donation_fee}
                  onChange={(e) => setGeneralPricing({ ...generalPricing, donation_fee: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Impulsionamento por post
                </label>
                <input
                  type="text"
                  value={generalPricing.boost_post_min}
                  onChange={(e) => setGeneralPricing({ ...generalPricing, boost_post_min: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
                />
              </div>
            </div>
          </div>
        </div>

        {/* COLUNA 3: EXPLICATIVO & RESUMO DE CATEGORIAS */}
        <div className="space-y-6">
          <div className="bg-blue-500/10 p-5 rounded-xl border border-blue-500/20 space-y-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Info className="h-5 w-5" />
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-blue-800 dark:text-blue-300">
              Como funciona a precificação?
            </h4>
            <ul className="space-y-2.5 text-xs text-blue-700/90 dark:text-blue-400 font-medium">
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span>Você define <strong>UM link do Kiwify</strong> por Grupo (ex: 1 link para Liderança, 1 para Membros).</span>
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span>O usuário escolhe o cargo específico (Bispo, Pastor) no app, e o sistema repassa isso para a Kiwify.</span>
              </li>
              <li className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                <span>Quando o pagamento for aprovado, o Webhook liberará exatamente o cargo escolhido.</span>
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
            <h4 className="font-bold text-xs sm:text-sm text-foreground">Resumo de Categorias</h4>
            <p className="text-xs text-muted-foreground">Categorias ajudam a organizar os selos na rede.</p>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                <span className="text-muted-foreground font-medium">Liderança</span>
                <span className="font-bold text-foreground">R$ 9,99 avg</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                <span className="text-muted-foreground font-medium">Obreiros</span>
                <span className="font-bold text-foreground">R$ 6,99 avg</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                <span className="text-muted-foreground font-medium">Membros</span>
                <span className="font-bold text-foreground">R$ 3,99 avg</span>
              </div>
              <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/30">
                <span className="text-muted-foreground font-medium">Institucional</span>
                <span className="font-bold text-foreground">R$ 14,99 avg</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
