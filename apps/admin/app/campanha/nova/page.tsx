"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Megaphone,
  Loader2,
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  X,
  FileCheck
} from "lucide-react";
import { PartnerNavbar } from "@/components/ads/PartnerNavbar";
import { adsApiFetch, formatCurrency } from "@/lib/ads-utils";
import { CreateCampaignDto, WalletBalanceDto } from "@/domain/ads/types";
import { compressImage } from "@/lib/image-compression";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function CreateCampaignPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletBalanceDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [nome, setNome] = useState("");
  const [formato, setFormato] = useState<"feed" | "stories" | "banner">("feed");
  const [objetivo, setObjetivo] = useState<"alcance" | "cliques" | "conversoes">("cliques");
  const [criativoUrl, setCriativoUrl] = useState("");
  const [criativoTipo, setCriativoTipo] = useState<"imagem" | "video">("imagem");
  const [callToAction, setCallToAction] = useState("Saiba Mais");
  const [destinoUrl, setDestinoUrl] = useState("");
  const [texto, setTexto] = useState("");

  // Público & Período
  const [periodoInicio, setPeriodoInicio] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [periodoFim, setPeriodoFim] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [regioes, setRegioes] = useState("Brasil (Todo o país)");
  const [denominacoes, setDenominacoes] = useState("Todas as denominações cristãs");

  // Orçamento (em Reais no input, convertido para centavos no envio)
  const [orcamentoReais, setOrcamentoReais] = useState<number>(100);

  // Media Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaMode, setMediaMode] = useState<"upload" | "url">("upload");
  const [uploadedFileName, setUploadedFileName] = useState("");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingMedia(true);
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (!isImage && !isVideo) {
        toast.error("Por favor, selecione um arquivo de imagem (PNG, JPG, WEBP) ou vídeo (MP4, WEBM).");
        return;
      }

      let fileToUpload: Blob | File = file;
      let fileExt = file.name.split(".").pop() || "bin";
      let tipo: "imagem" | "video" = "imagem";

      if (isImage) {
        toast.info("Otimizando e comprimindo imagem...");
        fileToUpload = await compressImage(file, 1080, 0.75);
        fileExt = "webp";
        tipo = "imagem";
      } else if (isVideo) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error("O vídeo excede o tamanho máximo de 50MB.");
          return;
        }
        tipo = "video";
        toast.info("Enviando vídeo...");
      }

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || "guest";
      const randomId = Math.random().toString(36).substring(2, 8);
      const filePath = `ads/${userId}_${Date.now()}_${randomId}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from("posts")
        .upload(filePath, fileToUpload, {
          cacheControl: "3600",
          upsert: false,
          contentType: fileToUpload.type,
        });

      if (error) {
        throw new Error(error.message);
      }

      const { data: { publicUrl } } = supabase.storage.from("posts").getPublicUrl(data.path);

      setCriativoUrl(publicUrl);
      setCriativoTipo(tipo);
      setUploadedFileName(file.name);
      toast.success("Mídia comprimida e salva com sucesso!");
    } catch (err: any) {
      console.error("Erro no upload de mídia:", err);
      toast.error(err.message || "Erro ao fazer upload da mídia.");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  useEffect(() => {
    adsApiFetch<WalletBalanceDto>("/api/wallet")
      .then((data) => setWallet(data))
      .catch((err) => console.error("Erro ao carregar carteira:", err));
  }, []);

  const orcamentoCentavos = Math.round(Number(orcamentoReais || 0) * 100);
  const saldoDisponivel = wallet?.saldo_disponivel ?? 0;
  const saldoInsuficiente = orcamentoCentavos > saldoDisponivel;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nome.trim()) {
      toast.error("Informe o nome da campanha.");
      return;
    }

    if (orcamentoCentavos < 500) {
      toast.error("O orçamento mínimo é R$ 5,00.");
      return;
    }

    if (periodoFim < periodoInicio) {
      toast.error("A data de término não pode ser anterior à data de início.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: CreateCampaignDto = {
        nome: nome.trim(),
        formato,
        objetivo,
        orcamento: orcamentoCentavos,
        periodo_inicio: periodoInicio,
        periodo_fim: periodoFim,
        criativo_url: criativoUrl.trim() || undefined,
        criativo_tipo: criativoTipo,
        call_to_action: destinoUrl.trim() ? `${callToAction.trim() || "Saiba Mais"}|${destinoUrl.trim()}` : (callToAction.trim() || undefined),
        texto: texto.trim() || undefined,
        publico: {
          regioes: [regioes],
          denominacoes: [denominacoes],
        },
      };

      await adsApiFetch("/api/campaigns", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Campanha criada com sucesso!", {
        description: "Sua campanha foi enviada para moderação da equipe FéConecta.",
      });

      router.push("/campanha");
    } catch (err: any) {
      toast.error("Erro ao criar campanha", { description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PartnerNavbar saldoDisponivel={wallet ? formatCurrency(wallet.saldo_disponivel) : undefined} />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-8 space-y-8">
        <div className="flex items-center gap-3">
          <Link
            href="/campanha"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Nova Campanha</h1>
            <p className="text-xs text-zinc-400">
              Configure seu anúncio para distribuição na rede cristã do FéConecta.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SEÇÃO 1: Detalhes do Criativo */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-5 backdrop-blur-md">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                1
              </span>
              Criativo e Formato
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Nome da Campanha *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Lançamento Single Gospel / Conferência de Jovens 2026"
                  required
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Formato de Exibição
                  </label>
                  <select
                    value={formato}
                    onChange={(e: any) => setFormato(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="feed">Feed de Publicações</option>
                    <option value="stories">Stories (Vídeo Vertical)</option>
                    <option value="banner">Banner no Topo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Objetivo Principal
                  </label>
                  <select
                    value={objetivo}
                    onChange={(e: any) => setObjetivo(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="cliques">Mais Cliques / Acessos</option>
                    <option value="alcance">Alcance e Reconhecimento</option>
                    <option value="conversoes">Inscrições / Vendas</option>
                  </select>
                </div>
              </div>

              {/* Seletor de Mídia (Upload Comprimido ou URL) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Mídia do Anúncio (Imagem ou Vídeo)
                  </label>
                  <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-white/5 text-xs">
                    <button
                      type="button"
                      onClick={() => setMediaMode("upload")}
                      className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                        mediaMode === "upload"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Upload Direto
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaMode("url")}
                      className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                        mediaMode === "url"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Inserir Link
                    </button>
                  </div>
                </div>

                {mediaMode === "upload" ? (
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {criativoUrl ? (
                      /* Preview do arquivo salvo */
                      <div className="relative rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {criativoTipo === "imagem" ? (
                            <img
                              src={criativoUrl}
                              alt="Preview"
                              className="w-14 h-14 rounded-lg object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-zinc-900 flex items-center justify-center border border-white/10 text-emerald-400">
                              <VideoIcon className="w-6 h-6" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <FileCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              <p className="text-sm font-semibold text-white truncate">
                                {uploadedFileName || "Mídia salva no Storage"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                {criativoTipo === "imagem" ? "WEBP Otimizado (1080px)" : "Vídeo Salvo"}
                              </span>
                              <span className="text-[11px] text-zinc-400 truncate max-w-[200px]">
                                {criativoUrl}
                              </span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setCriativoUrl("");
                            setUploadedFileName("");
                          }}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                          title="Remover mídia"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      /* Caixa de Dropzone */
                      <div
                        onClick={() => !isUploadingMedia && fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                          isUploadingMedia
                            ? "border-emerald-500/50 bg-emerald-950/10 opacity-70 cursor-wait"
                            : "border-white/10 hover:border-emerald-500/40 bg-zinc-950/50 hover:bg-zinc-950"
                        }`}
                      >
                        {isUploadingMedia ? (
                          <div className="flex flex-col items-center justify-center gap-2 py-2">
                            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                            <p className="text-sm font-semibold text-white">
                              Otimizando e salvando no Storage...
                            </p>
                            <p className="text-xs text-zinc-400">
                              Convertendo para WebP de alta performance
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                              <Upload className="w-5 h-5" />
                            </div>
                            <p className="text-sm font-semibold text-white">
                              Clique para selecionar Imagem ou Vídeo
                            </p>
                            <p className="text-xs text-zinc-400">
                              Imagens são convertidas automaticamente para <strong className="text-emerald-400">WebP 1080px</strong> (otimização leve e rápida). Máx 50MB para vídeos.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="url"
                      value={criativoUrl}
                      onChange={(e) => setCriativoUrl(e.target.value)}
                      placeholder="https://sua-midia.com/imagem.png"
                      className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Texto / Copy do Anúncio
                </label>
                <textarea
                  rows={2}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Ex: Descubra como transformar sua vida espiritual e superar feridas emocionais através da fé..."
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Texto do Botão (CTA)
                  </label>
                  <input
                    type="text"
                    value={callToAction}
                    onChange={(e) => setCallToAction(e.target.value)}
                    placeholder="Ex: Saiba Mais, Comprar Agora, Falar no WhatsApp"
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                  {/* Presets rápidos */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {["Saiba Mais", "Comprar Agora", "Falar no WhatsApp", "Garantir Vaga", "Ouvir Agora"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setCallToAction(preset)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                          callToAction === preset
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold"
                            : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Link de Destino / URL (Vendas, WhatsApp ou Site) *
                  </label>
                  <input
                    type="text"
                    value={destinoUrl}
                    onChange={(e) => setDestinoUrl(e.target.value)}
                    placeholder="https://seusite.com.br/livro ou wa.me/55..."
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1.5">
                    Para WhatsApp, você pode usar: <code className="text-emerald-400 font-mono">wa.me/5511999999999</code> ou seu link de checkout.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: Público e Período */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-5 backdrop-blur-md">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                2
              </span>
              Público-Alvo e Duração
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Data de Início
                </label>
                <input
                  type="date"
                  value={periodoInicio}
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Data de Término
                </label>
                <input
                  type="date"
                  value={periodoFim}
                  onChange={(e) => setPeriodoFim(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* SEÇÃO 3: Orçamento e Saldo da Carteira */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-5 backdrop-blur-md">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                3
              </span>
              Orçamento e Carteira
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Orçamento Total da Campanha (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                    R$
                  </span>
                  <input
                    type="number"
                    min="5"
                    step="5"
                    value={orcamentoReais}
                    onChange={(e) => setOrcamentoReais(Number(e.target.value))}
                    required
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 pl-12 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              {/* Informação sobre Saldo da Carteira */}
              <div className="rounded-xl border border-white/10 bg-zinc-950 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Saldo disponível na carteira:</span>
                  <span className="font-bold text-emerald-400">
                    {formatCurrency(saldoDisponivel)}
                  </span>
                </div>

                {saldoInsuficiente && (
                  <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <p className="font-semibold">Aviso de Saldo Insuficiente</p>
                      <p className="mt-0.5 text-zinc-300">
                        O orçamento solicitado ({formatCurrency(orcamentoCentavos)}) é maior que seu saldo atual.
                        Você pode enviar a campanha para análise agora, mas será necessário recarregar a carteira antes da aprovação do administrador.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ações de Envio */}
          <div className="flex items-center justify-end gap-4 pt-4">
            <Link
              href="/campanha"
              className="rounded-xl px-5 py-3 text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Enviar para Análise</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
