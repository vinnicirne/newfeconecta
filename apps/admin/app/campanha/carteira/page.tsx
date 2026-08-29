"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  PlusCircle,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  AlertCircle,
  Loader2,
  QrCode,
  Copy,
  CheckCircle2,
  Check,
  RefreshCw
} from "lucide-react";
import { PartnerNavbar } from "@/components/ads/PartnerNavbar";
import { KpiCard } from "@/components/ads/KpiCard";
import { StatusBadge } from "@/components/ads/StatusBadge";
import { DataTable, Column } from "@/components/ads/DataTable";
import { SparklineChart } from "@/components/ads/SparklineChart";
import { adsApiFetch, formatCurrency, formatDate, formatDateTime } from "@/lib/ads-utils";
import { WalletBalanceDto, WalletTransactionDto } from "@/domain/ads/types";
import { toast } from "sonner";

export default function PartnerWalletPage() {
  const [wallet, setWallet] = useState<WalletBalanceDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal de Recarga & Pix Transparente
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [topupAmountReais, setTopupAmountReais] = useState<number>(100);
  const [isTopupLoading, setIsTopupLoading] = useState(false);
  const [pixData, setPixData] = useState<{
    qr_code: string;
    qr_code_base64: string;
    payment_id: string;
  } | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [pixExpired, setPixExpired] = useState(false);
  const pixPollingRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const pixTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal de Reembolso
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundAmountReais, setRefundAmountReais] = useState<number>(50);
  const [refundObservacao, setRefundObservacao] = useState("");
  const [isRefundLoading, setIsRefundLoading] = useState(false);

  async function loadWallet() {
    try {
      setIsLoading(true);
      const res = await adsApiFetch<WalletBalanceDto>("/api/wallet");
      setWallet(res);
      return res;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error("Erro ao carregar dados da carteira", { description: msg });
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    async function init() {
      await loadWallet();

      // Verifica se o usuário retornou de um checkout do Mercado Pago com sucesso
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const topupStatus = params.get("topup");
        const paymentId = params.get("payment_id") || params.get("collection_id");
        const status = params.get("status") || params.get("collection_status");

        if ((topupStatus === "success" || status === "approved") && paymentId) {
          try {
            const res = await adsApiFetch<{
              success: boolean;
              credited_amount?: number;
              balances: WalletBalanceDto;
            }>("/api/wallet/topup/confirm", {
              method: "POST",
              body: JSON.stringify({ payment_id: paymentId }),
            });

            if (res.success && res.balances) {
              setWallet(res.balances);
              toast.success("✅ Pagamento confirmado no Mercado Pago!", {
                description: res.credited_amount
                  ? `Recarga de ${formatCurrency(res.credited_amount)} creditada na carteira.`
                  : "Seu saldo foi atualizado.",
              });
            }
          } catch (e: unknown) {
            console.error("Erro ao sincronizar pagamento:", e);
          } finally {
            // Limpa query params da URL de forma limpa
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        }
      }
    }

    init();

    // Carrega SDK do Mercado Pago v2 para modal integrado
    if (!document.getElementById("mercadopago-sdk")) {
      const script = document.createElement("script");
      script.id = "mercadopago-sdk";
      script.src = "https://sdk.mercadopago.com/js/v2";
      script.async = true;
      document.body.appendChild(script);
    }

    return () => stopPixPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Polling de confirmação do Pix ───────────────────────────────────────

  function stopPixPolling() {
    if (pixPollingRef.current) clearInterval(pixPollingRef.current);
    if (pixTimeoutRef.current) clearTimeout(pixTimeoutRef.current);
    pixPollingRef.current = null;
    pixTimeoutRef.current = null;
  }

  function startPixPolling(saldoAnterior: number) {
    stopPixPolling();
    setPixExpired(false);

    // Verifica saldo a cada 5 segundos
    pixPollingRef.current = setInterval(async () => {
      try {
        const res = await adsApiFetch<WalletBalanceDto>("/api/wallet");
        if (res.saldo_disponivel > saldoAnterior) {
          stopPixPolling();
          setWallet(res);
          setPixData(null);
          setIsTopupModalOpen(false);
          toast.success("✅ Pagamento Pix confirmado!", {
            description: `Novo saldo: ${formatCurrency(res.saldo_disponivel)}`,
          });
        }
      } catch {
        // silencia erros de polling para não atrapalhar o usuário
      }
    }, 5000);

    // Expira após 10 minutos (tempo máximo do QR Code do MP)
    pixTimeoutRef.current = setTimeout(() => {
      stopPixPolling();
      setPixExpired(true);
    }, 10 * 60 * 1000);
  }

  // ─── Pix Transparente ────────────────────────────────────────────────────

  async function handlePixSubmit() {
    const centavos = Math.round(Number(topupAmountReais || 0) * 100);
    if (centavos < 5000) {
      toast.error("O valor mínimo de recarga é R$ 50,00.");
      return;
    }

    try {
      setIsTopupLoading(true);
      const res = await adsApiFetch<{
        success: boolean;
        payment_id: string;
        qr_code: string;
        qr_code_base64: string;
        ticket_url?: string;
      }>("/api/wallet/topup", {
        method: "POST",
        body: JSON.stringify({ valor: centavos, method: "pix" }),
      });

      const saldoAtual = wallet?.saldo_disponivel ?? 0;
      setPixData({
        qr_code: res.qr_code,
        qr_code_base64: res.qr_code_base64,
        payment_id: res.payment_id,
      });
      startPixPolling(saldoAtual);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar Pix";
      toast.error("Erro ao gerar Pix", { description: msg });
    } finally {
      setIsTopupLoading(false);
    }
  }

  // ─── Checkout Pro (Mercado Pago externo) ─────────────────────────────────

  async function handleCheckoutPro() {
    const centavos = Math.round(Number(topupAmountReais || 0) * 100);
    if (centavos < 5000) {
      toast.error("O valor mínimo de recarga é R$ 50,00.");
      return;
    }

    try {
      setIsTopupLoading(true);
      const res = await adsApiFetch<{
        preference_id: string;
        init_point: string;
        sandbox_init_point: string;
      }>("/api/wallet/topup", {
        method: "POST",
        body: JSON.stringify({ valor: centavos, method: "preference" }),
      });

      if (res.preference_id) {
        // Se for preferência de mock/teste local, simula aprovação imediata do cartão
        if (res.preference_id.startsWith("mock-") || res.init_point?.includes("checkout/mock")) {
          await adsApiFetch<{ new_balance: number }>("/api/wallet/topup", {
            method: "POST",
            body: JSON.stringify({ valor: centavos, method: "sandbox_simulate" }),
          });
          toast.success("💳 Pagamento com Cartão simulado com sucesso!", {
            description: `Recarga de ${formatCurrency(centavos)} creditada na carteira.`,
          });
          setIsTopupModalOpen(false);
          await loadWallet();
          return;
        }

        const publicKey =
          process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ||
          "";

        if (publicKey && typeof (window as unknown as { MercadoPago?: unknown }).MercadoPago !== "undefined") {
          const MPConstructor = (window as unknown as { MercadoPago: new (k: string, o: object) => { checkout: (o: object) => void } }).MercadoPago;
          const mp = new MPConstructor(publicKey, { locale: "pt-BR" });
          mp.checkout({ preference: { id: res.preference_id }, autoOpen: true });
          setIsTopupModalOpen(false);
        } else {
          const targetUrl = res.init_point || res.sandbox_init_point;
          if (targetUrl) {
            window.open(targetUrl, "_blank", "width=600,height=750");
            setIsTopupModalOpen(false);
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao iniciar pagamento";
      toast.error("Erro ao iniciar pagamento", { description: msg });
    } finally {
      setIsTopupLoading(false);
    }
  }

  // ─── Sandbox Simulate ────────────────────────────────────────────────────

  async function handleSandboxSimulate() {
    const centavos = Math.round(Number(topupAmountReais || 0) * 100);
    if (centavos < 5000) {
      toast.error("O valor mínimo é R$ 50,00.");
      return;
    }

    try {
      setIsTopupLoading(true);
      const res = await adsApiFetch<{ new_balance: number }>("/api/wallet/topup", {
        method: "POST",
        body: JSON.stringify({ valor: centavos, method: "sandbox_simulate" }),
      });

      toast.success("Recarga de Teste creditada!", {
        description: `Saldo atualizado: ${formatCurrency(res.new_balance)}`,
      });
      setIsTopupModalOpen(false);
      const updatedWallet = await loadWallet();
      if (updatedWallet) {
        setWallet(updatedWallet);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao simular recarga";
      toast.error("Erro ao simular recarga", { description: msg });
    } finally {
      setIsTopupLoading(false);
    }
  }

  function handleCopyPix() {
    if (!pixData?.qr_code) return;
    navigator.clipboard.writeText(pixData.qr_code);
    setCopiedPix(true);
    toast.success("Código Pix Copia e Cola copiado!");
    setTimeout(() => setCopiedPix(false), 3000);
  }

  // Lógica de Solicitação de Reembolso
  async function handleRefundSubmit(e: React.FormEvent) {
    e.preventDefault();
    const centavos = Math.round(Number(refundAmountReais || 0) * 100);
    const saldoDisponivel = wallet?.saldo_disponivel ?? 0;

    if (centavos <= 0) {
      toast.error("Informe um valor válido para reembolso.");
      return;
    }

    if (centavos > saldoDisponivel) {
      toast.error("O valor solicitado excede o saldo disponível.");
      return;
    }

    try {
      setIsRefundLoading(true);
      await adsApiFetch("/api/wallet/refund-request", {
        method: "POST",
        body: JSON.stringify({
          valor: centavos,
          observacao: refundObservacao.trim() || undefined,
        }),
      });

      toast.success("Solicitação de reembolso enviada!", {
        description: "Nossa equipe administrativa analisará e processará o estorno.",
      });

      setIsRefundModalOpen(false);
      setRefundObservacao("");
      loadWallet();
    } catch (err: any) {
      toast.error("Erro ao solicitar reembolso", { description: err.message });
    } finally {
      setIsRefundLoading(false);
    }
  }

  const columns: Column<WalletTransactionDto>[] = [
    {
      header: "Data / Hora",
      cell: (tx) => (
        <span className="text-xs text-zinc-300">
          {formatDateTime(tx.created_at)}
        </span>
      ),
    },
    {
      header: "Tipo",
      cell: (tx) => <StatusBadge status={tx.tipo} showDetails={false} />,
    },
    {
      header: "Descrição / Vínculo",
      cell: (tx) => (
        <div className="text-xs">
          {tx.campaign_nome ? (
            <Link
              href={`/campanha/${tx.campaign_id}`}
              className="text-emerald-400 hover:underline font-medium"
            >
              {tx.campaign_nome}
            </Link>
          ) : tx.tipo === "recarga" ? (
            <span className="text-zinc-400">Recarga Mercado Pago</span>
          ) : (
            <span className="text-zinc-500">-</span>
          )}
        </div>
      ),
    },
    {
      header: "Valor",
      className: "text-right font-bold",
      cell: (tx) => {
        const isCredit = tx.tipo === "recarga" || tx.tipo === "estorno_reprovacao";
        return (
          <span className={isCredit ? "text-emerald-400" : "text-zinc-300"}>
            {isCredit ? "+" : "-"} {formatCurrency(tx.valor)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PartnerNavbar saldoDisponivel={wallet ? formatCurrency(wallet.saldo_disponivel) : undefined} />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Carteira do Parceiro
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              Gerencie seus créditos pré-pagos, adicione saldo via Pix/Cartão e solicite reembolsos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsRefundModalOpen(true)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="h-4 w-4 text-purple-400" />
              <span>Solicitar Reembolso</span>
            </button>

            <button
              onClick={() => setIsTopupModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 active:scale-95 transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Adicionar Saldo</span>
            </button>
          </div>
        </div>

        {/* KPIs da Carteira */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Saldo Disponível"
            value={wallet ? formatCurrency(wallet.saldo_disponivel) : "..."}
            description="Pronto para novas campanhas ou reembolso"
            variant="primary"
            icon={Wallet}
          />
          <KpiCard
            label="Saldo Investido"
            value={wallet ? formatCurrency(wallet.saldo_investido) : "..."}
            description="Comprometido em campanhas ativas"
            icon={ArrowUpRight}
          />
          <KpiCard
            label="Total Aportado"
            value={wallet ? formatCurrency(wallet.total_aportado) : "..."}
            description="Soma histórica de todas as recargas"
            icon={ArrowDownLeft}
          />
          <KpiCard
            label="Taxa de Utilização"
            value={
              wallet && wallet.total_aportado > 0
                ? `${Math.round((wallet.saldo_investido / wallet.total_aportado) * 100)}%`
                : "0%"
            }
            description="Investido ÷ Total Aportado"
            icon={SparklineChart as any}
          />
        </div>

        {/* Extrato Recente */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Movimentações Recentes
            </h2>
            <Link
              href="/campanha/pagamentos"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Ver Extrato Completo &rarr;
            </Link>
          </div>

          <DataTable
            columns={columns}
            data={wallet?.transacoes_recentes || []}
            isLoading={isLoading}
            emptyMessage="Nenhuma transação recente encontrada."
          />
        </div>
      </main>

      {/* MODAL DE RECARGA (Mercado Pago) */}
      {isTopupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => !isTopupLoading && setIsTopupModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl z-10 space-y-5">
            {pixData ? (
              /* TELA DE PIX TRANSPARENTE COM QR CODE */
              <div className="space-y-4 text-center">
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                    <QrCode className="w-3.5 h-3.5" /> Pix Gerado com Sucesso
                  </span>
                  <h3 className="text-lg font-bold text-white">Escaneie o QR Code</h3>
                  <p className="text-xs text-zinc-400">
                    Abra o app do seu banco e escaneie o código abaixo ou copie a chave Pix.
                  </p>
                </div>

                  {/* Imagem do QR Code com overlay de expirado */}
                  <div className="relative flex justify-center p-3 bg-white rounded-2xl w-fit mx-auto shadow-lg">
                    {pixData.qr_code_base64 ? (
                      <img
                        src={`data:image/png;base64,${pixData.qr_code_base64}`}
                        alt="QR Code Pix"
                        className={`w-48 h-48 rounded-lg transition-all ${pixExpired ? "opacity-20 blur-sm" : ""}`}
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-zinc-400 text-xs">
                        QR Code indisponível
                      </div>
                    )}
                    {pixExpired && (
                      <div className="absolute inset-3 flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                        <span className="text-red-600 font-bold text-sm">Expirado</span>
                      </div>
                    )}
                  </div>

                  {/* Copia e Cola */}
                  {!pixExpired && (
                    <div className="space-y-2 text-left">
                      <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                        Código Pix Copia e Cola
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={pixData.qr_code}
                          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 focus:outline-none select-all font-mono"
                        />
                        <button
                          type="button"
                          onClick={handleCopyPix}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-all flex-shrink-0"
                        >
                          {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          <span>{copiedPix ? "Copiado!" : "Copiar"}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Status / expiração */}
                  {pixExpired ? (
                    <div className="flex flex-col items-center gap-2 text-xs text-red-400 bg-red-950/20 border border-red-500/20 py-3 px-3 rounded-xl">
                      <span className="font-bold">QR Code expirado (10 minutos)</span>
                      <button
                        type="button"
                        onClick={() => { setPixData(null); setPixExpired(false); }}
                        className="mt-1 flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Gerar novo Pix
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 bg-emerald-950/20 border border-emerald-500/20 py-2.5 px-3 rounded-xl">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Aguardando pagamento... Saldo atualiza automaticamente!</span>
                      </div>

                      {/* Botão de simulação rápida para ambiente de teste */}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const centavos = Math.round(Number(topupAmountReais || 100) * 100);
                            const resTopup = await adsApiFetch<{ new_balance: number }>("/api/wallet/topup", {
                              method: "POST",
                              body: JSON.stringify({ valor: centavos, method: "sandbox_simulate" }),
                            });
                            stopPixPolling();
                            setPixData(null);
                            setIsTopupModalOpen(false);
                            const updatedWallet = await loadWallet();
                            if (updatedWallet) setWallet(updatedWallet);
                            toast.success("✅ Pagamento Pix confirmado!", {
                              description: `Novo saldo: ${formatCurrency(resTopup.new_balance)}`,
                            });
                          } catch (e: unknown) {
                            const msg = e instanceof Error ? e.message : "Erro desconhecido";
                            toast.error("Erro na simulação: " + msg);
                          }
                        }}
                        className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white transition-all cursor-pointer shadow-lg shadow-emerald-950/40"
                      >
                        <span>⚡ Simular Confirmação e Fechar</span>
                      </button>
                    </div>
                  )}

                  <div className="pt-2 border-t border-white/10 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        stopPixPolling();
                        setPixData(null);
                        setPixExpired(false);
                        setIsTopupModalOpen(false);
                      }}
                      className="rounded-xl px-4 py-2 text-xs font-bold text-zinc-400 hover:bg-white/5 hover:text-white"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              ) : (
              /* FORMULÁRIO DE SELEÇÃO DE VALOR */
              <>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Adicionar Saldo à Carteira</h3>
                  <p className="text-xs text-zinc-400">
                    Escolha o valor e a forma de pagamento.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Valor da Recarga (R$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400 font-bold">
                        R$
                      </span>
                      <input
                        type="number"
                        min="50"
                        step="10"
                        value={topupAmountReais}
                        onChange={(e) => setTopupAmountReais(Number(e.target.value))}
                        className="w-full rounded-xl border border-white/10 bg-zinc-950 pl-12 pr-4 py-3 text-base font-bold text-white focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <span className="block mt-1 text-[11px] text-zinc-500">
                      Mínimo de R$ 50,00 por recarga.
                    </span>
                  </div>

                  {/* Botões rápidos de valor */}
                  <div className="flex gap-2">
                    {[50, 100, 250, 500, 1000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setTopupAmountReais(val)}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-semibold border transition-all ${
                          topupAmountReais === val
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                            : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        R$ {val}
                      </button>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/10 space-y-3">
                    {/* PIX — botão principal */}
                    <button
                      type="button"
                      onClick={handlePixSubmit}
                      disabled={isTopupLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-50 transition-all shadow-lg shadow-emerald-900/30"
                    >
                      {isTopupLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <QrCode className="w-4 h-4" />
                      )}
                      <span>Pagar via Pix</span>
                    </button>

                    {/* Checkout Pro — secundário */}
                    <button
                      type="button"
                      onClick={handleCheckoutPro}
                      disabled={isTopupLoading}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs font-semibold text-zinc-300 disabled:opacity-50 transition-all"
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Pagar com Cartão (Mercado Pago)</span>
                    </button>

                    {/* Divider + Sandbox */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px bg-white/10" />
                      <span className="text-[10px] text-zinc-600 uppercase tracking-widest">Desenvolvedor</span>
                      <div className="flex-1 h-px bg-white/10" />
                    </div>

                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleSandboxSimulate}
                        disabled={isTopupLoading}
                        className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all"
                        title="Credita o saldo diretamente no ledger sem depender do MP"
                      >
                        ⚡ Simular Saldo (+R$ {topupAmountReais})
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsTopupModalOpen(false)}
                        disabled={isTopupLoading}
                        className="rounded-xl px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-white/5"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE SOLICITAÇÃO DE REEMBOLSO */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => !isRefundLoading && setIsRefundModalOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl z-10 space-y-5">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Solicitar Reembolso</h3>
              <p className="text-xs text-zinc-400">
                Solicite o estorno do saldo disponível para a mesma conta/cartão de origem.
              </p>
            </div>

            <form onSubmit={handleRefundSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label className="font-semibold text-zinc-300 uppercase tracking-wider">
                    Valor a Reembolsar (R$) *
                  </label>
                  <span className="text-emerald-400">
                    Disponível: {formatCurrency(wallet?.saldo_disponivel)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400 font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={wallet ? wallet.saldo_disponivel / 100 : undefined}
                    step="1"
                    value={refundAmountReais}
                    onChange={(e) => setRefundAmountReais(Number(e.target.value))}
                    required
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 pl-12 pr-4 py-3 text-base font-bold text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Motivo ou Observação (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={refundObservacao}
                  onChange={(e) => setRefundObservacao(e.target.value)}
                  placeholder="Informe observações adicionais para a equipe de moderação..."
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-white focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsRefundModalOpen(false)}
                  disabled={isRefundLoading}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-400 hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isRefundLoading}
                  className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-purple-500 disabled:opacity-50 transition-all"
                >
                  {isRefundLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Enviar Solicitação</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
