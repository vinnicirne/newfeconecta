"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Settings, Key, Bell, Globe, Copy, RefreshCw, 
  ShieldCheck, Zap, Lock, Save, Check, AlertCircle,
  Sliders, Server, Database, AlertTriangle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import moment from "moment";
import "moment/locale/pt-br";

moment.locale("pt-br");

interface GlobalConfig {
  platform_name: string;
  support_email: string;
  default_language: string;
  timezone: string;
  posts_per_hour_limit: string;
  max_media_size: string;
  open_registration: boolean;
  two_factor_auth: boolean;
  maintenance_mode: boolean;
}

export default function ApiSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [config, setConfig] = useState<GlobalConfig>({
    platform_name: "FéConecta",
    support_email: "suporte@feconecta.app",
    default_language: "Português (Brasil)",
    timezone: "America/Sao_Paulo",
    posts_per_hour_limit: "12",
    max_media_size: "25 MB",
    open_registration: true,
    two_factor_auth: true,
    maintenance_mode: false,
  });

  useEffect(() => {
    fetchConfigs();

    // ⚡ Realtime WebSockets para Configurações Globais
    const channel = supabase.channel("api-settings-realtime-monitor")
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
      const { data, error } = await supabase
        .from("system_configs")
        .select("value")
        .eq("key", "global_system_params")
        .maybeSingle();

      if (data?.value) {
        setConfig(data.value);
      }
    } catch {
      console.warn("[Settings] Usando parâmetros padrão do sistema.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading("Salvando parâmetros globais do sistema...");
    try {
      await Promise.all([
        supabase.from("system_configs").upsert({
          key: "global_system_params",
          value: config,
          updated_at: new Date().toISOString(),
        }),
        supabase.from("system_errors").insert({
          module: "global_settings",
          error_message: `[SETTINGS] Parâmetros globais atualizados`,
          metadata: config,
        }),
      ]);

      toast.success("Configuração global salva e aplicada à rede! ⚙️✨", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao salvar configurações: " + err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* ─── HEADER PRINCIPAL ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Configuração global do sistema
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green border border-whatsapp-teal/20">
              <Settings className="h-3 w-3" />
              Parâmetros & Segurança
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Alterações são registradas na auditoria · Parâmetros globais da plataforma: cadastro, limites, segurança e integrações.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            <span>{saving ? "Salvando..." : "Salvar tudo"}</span>
          </button>
        </div>
      </div>

      {/* ─── PAINEL: PARÂMETROS GERAIS ─── */}
      <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
        <div className="border-b border-border pb-3">
          <h2 className="text-sm font-bold text-foreground">Parâmetros gerais</h2>
          <p className="text-xs text-muted-foreground">Aplicados a toda a rede, aplicativo móvel e portal web</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Nome da plataforma
              <span className="text-[11px] text-muted-foreground font-normal ml-1.5">(Exibido no app e nos e-mails)</span>
            </label>
            <input
              type="text"
              value={config.platform_name}
              onChange={(e) => setConfig({ ...config, platform_name: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              E-mail de suporte
              <span className="text-[11px] text-muted-foreground font-normal ml-1.5">(Remetente padrão)</span>
            </label>
            <input
              type="email"
              value={config.support_email}
              onChange={(e) => setConfig({ ...config, support_email: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Idioma padrão
              <span className="text-[11px] text-muted-foreground font-normal ml-1.5">(Novos usuários)</span>
            </label>
            <input
              type="text"
              value={config.default_language}
              onChange={(e) => setConfig({ ...config, default_language: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Fuso horário
              <span className="text-[11px] text-muted-foreground font-normal ml-1.5">(Base para agendamentos)</span>
            </label>
            <input
              type="text"
              value={config.timezone}
              onChange={(e) => setConfig({ ...config, timezone: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Limite de posts por hora
              <span className="text-[11px] text-muted-foreground font-normal ml-1.5">(Antiflood por usuário)</span>
            </label>
            <input
              type="number"
              value={config.posts_per_hour_limit}
              onChange={(e) => setConfig({ ...config, posts_per_hour_limit: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Tamanho máximo de mídia
              <span className="text-[11px] text-muted-foreground font-normal ml-1.5">(Upload por arquivo)</span>
            </label>
            <input
              type="text"
              value={config.max_media_size}
              onChange={(e) => setConfig({ ...config, max_media_size: e.target.value })}
              className="h-9 w-full rounded-lg border border-border bg-muted/40 px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-whatsapp-green font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Cadastro aberto
              <span className="text-[11px] text-muted-foreground font-normal ml-1.5">(Permitir novos registros sem convite)</span>
            </label>
            <div 
              onClick={() => setConfig({ ...config, open_registration: !config.open_registration })}
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 cursor-pointer select-none hover:bg-muted/60 transition-colors"
            >
              <span className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                config.open_registration ? "bg-whatsapp-teal" : "bg-muted-foreground/30"
              )}>
                <span className={cn(
                  "inline-block size-3.5 rounded-full bg-white transition-transform",
                  config.open_registration ? "translate-x-4" : "translate-x-1"
                )} />
              </span>
              <span className="text-xs font-medium text-foreground">
                {config.open_registration ? "Cadastro aberto ativado" : "Apenas com convite"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Autenticação em duas etapas
              <span className="text-[11px] text-muted-foreground font-normal ml-1.5">(Obrigatória para administradores)</span>
            </label>
            <div 
              onClick={() => setConfig({ ...config, two_factor_auth: !config.two_factor_auth })}
              className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 cursor-pointer select-none hover:bg-muted/60 transition-colors"
            >
              <span className={cn(
                "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                config.two_factor_auth ? "bg-whatsapp-teal" : "bg-muted-foreground/30"
              )}>
                <span className={cn(
                  "inline-block size-3.5 rounded-full bg-white transition-transform",
                  config.two_factor_auth ? "translate-x-4" : "translate-x-1"
                )} />
              </span>
              <span className="text-xs font-medium text-foreground">
                {config.two_factor_auth ? "2FA obrigatória ativada" : "2FA opcional"}
              </span>
            </div>
          </div>
        </div>

        {/* Modo de Manutenção */}
        <div className="pt-2">
          <div 
            onClick={() => setConfig({ ...config, maintenance_mode: !config.maintenance_mode })}
            className={cn(
              "flex items-center justify-between p-3.5 rounded-xl border transition-colors cursor-pointer",
              config.maintenance_mode ? "bg-amber-500/10 border-amber-500/30" : "bg-muted/30 border-border"
            )}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className={cn("h-4 w-4", config.maintenance_mode ? "text-amber-500" : "text-muted-foreground")} />
              <div>
                <p className="text-xs font-bold text-foreground">Modo de Manutenção</p>
                <p className="text-[11px] text-muted-foreground">Deixa o app em somente leitura e exibe banner global de manutenção no feed.</p>
              </div>
            </div>
            <span className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
              config.maintenance_mode ? "bg-amber-500" : "bg-muted-foreground/30"
            )}>
              <span className={cn(
                "inline-block size-3.5 rounded-full bg-white transition-transform",
                config.maintenance_mode ? "translate-x-4" : "translate-x-1"
              )} />
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-border flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 rounded-lg bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white px-4 text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            <Check className="h-3.5 w-3.5" />
            <span>Salvar alterações</span>
          </button>
          <button
            onClick={fetchConfigs}
            className="h-9 rounded-lg border border-border px-4 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}
