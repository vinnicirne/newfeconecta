"use client";

import React, { useState } from "react";
import {
  X,
  Code2,
  Copy,
  Check,
  Zap,
  Globe,
  ShoppingCart,
  UserCheck,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Terminal
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface PixelIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  partnerId: string;
  destinationUrl?: string;
}

export function PixelIntegrationModal({
  isOpen,
  onClose,
  campaignId,
  partnerId,
  destinationUrl,
}: PixelIntegrationModalProps) {
  const [activeTab, setActiveTab] = useState<"install" | "events" | "utms" | "capi">("install");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [capiToken, setCapiToken] = useState<string | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  if (!isOpen) return null;

  const pixelId = `FC-${(partnerId || "PARTNER").replace(/-/g, "").substring(0, 8).toUpperCase()}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://feconecta.com.br";

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedKey(null), 2500);
  }

  async function generateCapiToken() {
    setIsGeneratingToken(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Entre novamente na sua conta para gerar a chave.');
      const response = await fetch(`/api/campaigns/${campaignId}/pixel-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || typeof result.token !== 'string') {
        throw new Error(result.error || 'Não foi possível gerar a chave CAPI.');
      }
      setCapiToken(result.token);
      toast.success('Chave gerada. Copie e guarde em segredo no servidor do checkout.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível gerar a chave CAPI.');
    } finally {
      setIsGeneratingToken(false);
    }
  }

  // Snippets
  const scriptSnippet = `<script
  src="${origin}/pixel.js"
  data-pixel-id="${pixelId}">
</script>`;

  const purchaseSnippet = `// Disparar na página de obrigado / confirmação de compra
feconectaPixel.track("Purchase", {
  value: 149.90,       // Valor em reais
  currency: "BRL",     // Moeda
  order_id: "PED-12345" // ID do pedido no seu sistema
});`;

  const leadSnippet = `// Disparar no envio de formulário / captura de contato
feconectaPixel.track("Lead", {
  form_name: "Inscrição Conferência 2026"
});`;

  const cleanUrl = destinationUrl ? destinationUrl.split("?")[0] : "https://seusite.com.br";
  const trackedUrl = `${cleanUrl}?fc_cid=${campaignId}&fc_pid=${pixelId}&utm_source=feconecta&utm_medium=feads&utm_campaign=${campaignId}`;

  const capiCurlSnippet = `curl -X POST "${origin}/api/events" \\
  -H "Authorization: Bearer ${capiToken || '<CHAVE_CAPI_DO_SERVIDOR>'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "pixel_id": "${pixelId}",
    "campaign_id": "${campaignId}",
    "event_name": "Purchase",
    "value": 149.90,
    "currency": "BRL",
    "order_id": "PED-12345"
  }'`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-zinc-900 p-6 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  FéConecta Pixel & Conversions API
                </h3>
                <p className="text-xs text-zinc-400">
                  Eventos do pixel e conversões server-to-server vinculadas à campanha.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => { setCapiToken(null); onClose(); }}
            className="p-2 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pixel ID Badge */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold block">
              Seu Pixel ID Exclusivo
            </span>
            <span className="text-xl font-black text-white font-mono">{pixelId}</span>
          </div>

          <button
            onClick={() => copyToClipboard(pixelId, "pixel_id")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all self-start sm:self-auto"
          >
            {copiedKey === "pixel_id" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copiar Pixel ID</span>
          </button>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-white/10 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("install")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
              activeTab === "install"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>1. Instalar no Site</span>
          </button>

          <button
            onClick={() => setActiveTab("events")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
              activeTab === "events"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>2. Eventos (Compras/Leads)</span>
          </button>

          <button
            onClick={() => setActiveTab("utms")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
              activeTab === "utms"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>3. Link com UTMs</span>
          </button>

          <button
            onClick={() => setActiveTab("capi")}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all",
              activeTab === "capi"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>4. Conversions API (Webhook)</span>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="space-y-4 text-xs text-zinc-300">
          {activeTab === "install" && (
            <div className="space-y-3">
              <p className="text-zinc-300">
                Cole este código dentro da tag <code className="text-emerald-400">&lt;head&gt;</code> de todas as páginas do seu site ou e-commerce:
              </p>

              <div className="relative rounded-xl border border-white/10 bg-zinc-950 p-4 font-mono text-xs text-zinc-200">
                <pre className="overflow-x-auto whitespace-pre-wrap">{scriptSnippet}</pre>
                <button
                  onClick={() => copyToClipboard(scriptSnippet, "script_code")}
                  className="absolute right-3 top-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold"
                >
                  {copiedKey === "script_code" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar</span>
                </button>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/5 p-3 space-y-1 text-zinc-400">
                <strong className="text-white block font-semibold">✨ Como funciona a atribuição moderna:</strong>
                <span>
                  O script registra atividade e o identificador de campanha por até 30 dias. Conversões que entram no cálculo de receita e ROAS precisam ser confirmadas pelo CAPI server-to-server.
                </span>
              </div>
            </div>
          )}

          {activeTab === "events" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <ShoppingCart className="w-4 h-4 text-emerald-400" />
                    Evento de Compra (Purchase) — Atividade do navegador, sem validar receita
                  </span>
                  <button
                    onClick={() => copyToClipboard(purchaseSnippet, "purchase_code")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold"
                  >
                    {copiedKey === "purchase_code" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <div className="rounded-xl border border-white/10 bg-zinc-950 p-3.5 font-mono text-xs text-zinc-200">
                  <pre className="overflow-x-auto whitespace-pre-wrap">{purchaseSnippet}</pre>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-teal-400" />
                    Evento de Lead / Cadastro (Lead)
                  </span>
                  <button
                    onClick={() => copyToClipboard(leadSnippet, "lead_code")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold"
                  >
                    {copiedKey === "lead_code" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copiar</span>
                  </button>
                </div>
                <div className="rounded-xl border border-white/10 bg-zinc-950 p-3.5 font-mono text-xs text-zinc-200">
                  <pre className="overflow-x-auto whitespace-pre-wrap">{leadSnippet}</pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === "utms" && (
            <div className="space-y-3">
              <p className="text-zinc-300">
                Se você usa ferramentas como Google Analytics, Hotmart ou Shopify, utilize este link rastreado com parâmetros UTM oficiais do FéAds:
              </p>

              <div className="relative rounded-xl border border-white/10 bg-zinc-950 p-4 font-mono text-xs text-emerald-400 break-all">
                <span>{trackedUrl}</span>
                <button
                  onClick={() => copyToClipboard(trackedUrl, "utm_link")}
                  className="mt-3 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30"
                >
                  {copiedKey === "utm_link" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>Copiar Link Rastreado Completo</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === "capi" && (
            <div className="space-y-3">
              <p className="text-zinc-300">
                Gere uma chave exclusiva desta campanha e guarde-a como segredo no servidor do checkout. Não coloque essa chave no JavaScript do navegador.
              </p>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
                <button
                  type="button"
                  onClick={generateCapiToken}
                  disabled={isGeneratingToken}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-black disabled:opacity-60"
                >
                  {isGeneratingToken ? 'Gerando chave...' : capiToken ? 'Rotacionar chave CAPI' : 'Gerar chave CAPI'}
                </button>
                {capiToken && (
                  <div>
                    <p className="mb-1 text-[11px] font-bold text-amber-200">Copie agora. A chave não poderá ser recuperada depois.</p>
                    <code className="block break-all rounded-lg bg-black/50 p-3 text-xs text-emerald-300">{capiToken}</code>
                  </div>
                )}
                <p className="text-[11px] text-zinc-400">Rotacionar invalida imediatamente a chave anterior. O pixel do navegador registra atividade, mas não confirma receita.</p>
              </div>

              <div className="relative rounded-xl border border-white/10 bg-zinc-950 p-4 font-mono text-xs text-zinc-200">
                <pre className="overflow-x-auto whitespace-pre-wrap">{capiCurlSnippet}</pre>
                <button
                  onClick={() => copyToClipboard(capiCurlSnippet, "capi_curl")}
                  className="absolute right-3 top-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold"
                >
                  {copiedKey === "capi_curl" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copiar cURL</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={() => { setCapiToken(null); onClose(); }}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
