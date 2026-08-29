"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, Megaphone, AlertTriangle, Play, Pause, ExternalLink, Calendar, 
  Target, DollarSign, BarChart2, Edit3, Upload, Image as ImageIcon, Video, 
  Sparkles, Check, X, Loader2, RefreshCw 
} from "lucide-react";
import { PartnerNavbar } from "@/components/ads/PartnerNavbar";
import { StatusBadge } from "@/components/ads/StatusBadge";
import { KpiCard } from "@/components/ads/KpiCard";
import { BudgetProgress } from "@/components/ads/BudgetProgress";
import { adsApiFetch, formatCurrency, formatDate } from "@/lib/ads-utils";
import { Campaign, CampaignFormat, CampaignObjective, WalletBalanceDto } from "@/domain/ads/types";
import { compressImage } from "@/lib/image-compression";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [wallet, setWallet] = useState<WalletBalanceDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Estados de Edição Completa da Campanha
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [editNome, setEditNome] = useState("");
  const [editTexto, setEditTexto] = useState("");
  const [editCta, setEditCta] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editCriativoUrl, setEditCriativoUrl] = useState("");
  const [editCriativoTipo, setEditCriativoTipo] = useState<"imagem" | "video">("imagem");
  const [editFormato, setEditFormato] = useState<CampaignFormat>("feed");
  const [editObjetivo, setEditObjetivo] = useState<CampaignObjective>("cliques");
  const [editPeriodoInicio, setEditPeriodoInicio] = useState("");
  const [editPeriodoFim, setEditPeriodoFim] = useState("");
  const [editRegioes, setEditRegioes] = useState("Brasil (Todo o país)");
  const [editDenominacoes, setEditDenominacoes] = useState("Todas as denominações cristãs");
  const [mediaTab, setMediaTab] = useState<"upload" | "url">("upload");

  useEffect(() => {
    async function loadCampaign() {
      try {
        setIsLoading(true);
        const [campRes, walletRes] = await Promise.all([
          adsApiFetch<Campaign>(`/api/campaigns/${id}`),
          adsApiFetch<WalletBalanceDto>("/api/wallet").catch(() => null),
        ]);
        setCampaign(campRes);
        if (walletRes) setWallet(walletRes);
      } catch (err: any) {
        toast.error("Erro ao carregar detalhes da campanha", { description: err.message });
      } finally {
        setIsLoading(false);
      }
    }

    if (id) loadCampaign();
  }, [id]);

  useEffect(() => {
    if (campaign) {
      setEditNome(campaign.nome || "");
      setEditTexto(campaign.texto || "");
      setEditCriativoUrl(campaign.criativo_url || "");
      setEditCriativoTipo(campaign.criativo_tipo || "imagem");
      setEditFormato(campaign.formato || "feed");
      setEditObjetivo(campaign.objetivo || "cliques");
      setEditPeriodoInicio(campaign.periodo_inicio || "");
      setEditPeriodoFim(campaign.periodo_fim || "");
      setEditRegioes(campaign.publico?.regioes?.[0] || "Brasil (Todo o país)");
      setEditDenominacoes(campaign.publico?.denominacoes?.[0] || "Todas as denominações cristãs");

      const rawCta = campaign.call_to_action || "";
      if (rawCta.includes("|")) {
        const [lbl, url] = rawCta.split("|");
        setEditCta(lbl || "Saiba Mais");
        setEditUrl(url || "");
      } else if (rawCta.startsWith("http") || rawCta.startsWith("wa.me")) {
        setEditCta("Saiba Mais");
        setEditUrl(rawCta);
      } else {
        setEditCta(rawCta || "Saiba Mais");
        setEditUrl("");
      }
    }
  }, [campaign]);

  // Upload e compressão de mídia para a campanha
  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingMedia(true);
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (!isImage && !isVideo) {
        toast.error("Formato inválido. Selecione uma imagem (PNG, JPG, WebP) ou vídeo (MP4).");
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

      setEditCriativoUrl(publicUrl);
      setEditCriativoTipo(tipo);
      toast.success("Nova mídia enviada e salva!");
    } catch (err: any) {
      console.error("Erro no upload de mídia:", err);
      toast.error(err.message || "Erro ao fazer upload da mídia.");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Salvar todas as alterações da campanha
  async function handleSaveCampaign() {
    if (!campaign) return;
    if (!editNome.trim()) {
      toast.error("Informe o nome da campanha.");
      return;
    }

    try {
      setIsSaving(true);
      const finalCta = editUrl.trim() ? `${editCta.trim() || "Saiba Mais"}|${editUrl.trim()}` : (editCta.trim() || undefined);

      const payload = {
        nome: editNome.trim(),
        texto: editTexto.trim() || undefined,
        criativo_url: editCriativoUrl.trim() || undefined,
        criativo_tipo: editCriativoTipo,
        call_to_action: finalCta,
        formato: editFormato,
        objetivo: editObjetivo,
        periodo_inicio: editPeriodoInicio,
        periodo_fim: editPeriodoFim,
        publico: {
          regioes: [editRegioes],
          denominacoes: [editDenominacoes],
        },
      };

      const updated = await adsApiFetch<Campaign>(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      setCampaign(updated);
      setIsEditModalOpen(false);
      toast.success("Campanha atualizada com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar alterações da campanha", { description: err.message });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="animate-pulse text-zinc-400 text-sm">Carregando detalhes da campanha...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4">
        <p className="text-zinc-400 mb-4">Campanha não encontrada.</p>
        <Link
          href="/campanha"
          className="rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
        >
          Voltar para Campanhas
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PartnerNavbar saldoDisponivel={wallet ? formatCurrency(wallet.saldo_disponivel) : undefined} />

      <main className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/campanha"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">{campaign.nome}</h1>
                <StatusBadge status={campaign.status} />
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                ID: {campaign.id} • Criada em {formatDate(campaign.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-all shadow-md shadow-emerald-950/20"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Campanha Completa</span>
            </button>
          </div>
        </div>

        {/* Modal de Edição Completa da Campanha */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
            <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-zinc-900 p-6 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-emerald-400" />
                    Editar Campanha Completa
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Modifique copy, mídia criativa, link de destino, WhatsApp, formato e configurações.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5">
                {/* 1. Nome da Campanha */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Nome da Campanha *
                  </label>
                  <input
                    type="text"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    placeholder="Ex: Venda do Livro - O Fim do Jogo Narcizista"
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none font-medium"
                  />
                </div>

                {/* 2. Texto / Copy do Anúncio */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Texto / Copy Principal do Anúncio
                  </label>
                  <textarea
                    rows={3}
                    value={editTexto}
                    onChange={(e) => setEditTexto(e.target.value)}
                    placeholder="Ex: Como curar as feridas após o abuso emocional e reconstruir sua fé..."
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* 3. Mídia Criativa (Imagem / Vídeo) */}
                <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Mídia Criativa (Banner ou Vídeo)
                    </label>
                    <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-white/5">
                      <button
                        type="button"
                        onClick={() => setMediaTab("upload")}
                        className={`text-[10px] px-2.5 py-1 rounded-md font-bold transition-all ${
                          mediaTab === "upload" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-zinc-400"
                        }`}
                      >
                        Upload de Arquivo
                      </button>
                      <button
                        type="button"
                        onClick={() => setMediaTab("url")}
                        className={`text-[10px] px-2.5 py-1 rounded-md font-bold transition-all ${
                          mediaTab === "url" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-zinc-400"
                        }`}
                      >
                        URL Direta
                      </button>
                    </div>
                  </div>

                  {mediaTab === "upload" ? (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,video/mp4,video/quicktime,video/webm"
                        onChange={handleMediaUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingMedia}
                        className="w-full border border-dashed border-white/20 hover:border-emerald-500/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-emerald-500/5 transition-all text-center group cursor-pointer"
                      >
                        {isUploadingMedia ? (
                          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Comprimindo e enviando nova mídia...</span>
                          </div>
                        ) : (
                          <>
                            <Upload className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400" />
                            <span className="text-xs font-semibold text-zinc-300 group-hover:text-white">
                              Clique para escolher uma nova imagem ou vídeo
                            </span>
                            <span className="text-[10px] text-zinc-500">
                              Otimização automática WebP 1080px (PNG, JPG) ou vídeo MP4 até 50MB
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="url"
                        value={editCriativoUrl}
                        onChange={(e) => setEditCriativoUrl(e.target.value)}
                        placeholder="https://meusite.com.br/banner.webp"
                        className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Prévia da Mídia */}
                  {editCriativoUrl && (
                    <div className="mt-2 relative rounded-xl overflow-hidden border border-white/10 max-h-48 bg-black/40 flex items-center justify-center">
                      {editCriativoTipo === "video" || editCriativoUrl.match(/\.(mp4|webm|mov)/i) ? (
                        <video src={editCriativoUrl} controls className="max-h-48 w-full object-contain" />
                      ) : (
                        <img src={editCriativoUrl} alt="Preview" className="max-h-48 w-full object-contain" />
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Chamada para Ação & Link de Destino */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Texto do Botão (CTA)
                    </label>
                    <input
                      type="text"
                      value={editCta}
                      onChange={(e) => setEditCta(e.target.value)}
                      placeholder="Ex: Comprar Agora, Falar no WhatsApp, Saiba Mais"
                      className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                    />
                    <div className="flex flex-wrap gap-1 mt-2">
                      {["Comprar Agora", "Falar no WhatsApp", "Saiba Mais", "Garantir Vaga", "Ouvir Agora"].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setEditCta(preset)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                            editCta === preset
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
                      Link de Destino (Vendas / WhatsApp / Site) *
                    </label>
                    <input
                      type="text"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="https://pay.hotmart.com/... ou wa.me/55..."
                      className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Destino ao clicar no anúncio na timeline.
                    </p>
                  </div>
                </div>

                {/* 5. Formato & Objetivo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Formato de Mídia
                    </label>
                    <select
                      value={editFormato}
                      onChange={(e) => setEditFormato(e.target.value as CampaignFormat)}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="feed">Feed Principal (Posts)</option>
                      <option value="stories">Stories</option>
                      <option value="banner">Banners Institucionais</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Objetivo da Campanha
                    </label>
                    <select
                      value={editObjetivo}
                      onChange={(e) => setEditObjetivo(e.target.value as CampaignObjective)}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    >
                      <option value="cliques">Cliques / Conversões no Link</option>
                      <option value="alcance">Alcance Máximo</option>
                      <option value="conversoes">Vendas & Cadastros</option>
                    </select>
                  </div>
                </div>

                {/* 6. Período de Exibição */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Data Início
                    </label>
                    <input
                      type="date"
                      value={editPeriodoInicio}
                      onChange={(e) => setEditPeriodoInicio(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                      Data Término
                    </label>
                    <input
                      type="date"
                      value={editPeriodoFim}
                      onChange={(e) => setEditPeriodoFim(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCampaign}
                  disabled={isSaving || isUploadingMedia}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white transition-all disabled:opacity-50 shadow-lg shadow-emerald-950/40 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando Alterações...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Salvar Campanha Completa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Banner de Reprovação (se aplicável) */}
        {campaign.status === "reprovado" && (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertTriangle className="h-5 w-5" />
              <span>Campanha Reprovada pela Moderação</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {campaign.motivo_reprovacao
                ? `Motivo: ${campaign.motivo_reprovacao}`
                : "Esta campanha não foi aprovada na moderação de diretrizes da comunidade."}
            </p>
            <p className="text-xs text-emerald-400 font-semibold pt-1">
              ✓ O valor do orçamento permaneceu como saldo disponível na sua carteira para ser usado em outra campanha ou solicitado como reembolso.
            </p>
          </div>
        )}

        {/* KPIs de Performance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Orçamento Aprovado"
            value={formatCurrency(campaign.orcamento)}
            description="Total alocado para veiculação"
            icon={DollarSign}
          />
          <KpiCard
            label="Gasto Consumido"
            value={formatCurrency(campaign.gasto)}
            description={`${campaign.orcamento > 0 ? Math.round((campaign.gasto / campaign.orcamento) * 100) : 0}% do orçamento`}
            icon={BarChart2}
            variant="primary"
          />
          <KpiCard
            label="Formato de Mídia"
            value={campaign.formato.toUpperCase()}
            description={`Objetivo: ${campaign.objetivo}`}
            icon={Target}
          />
          <KpiCard
            label="Período de Exibição"
            value={`${formatDate(campaign.periodo_inicio)} - ${formatDate(campaign.periodo_fim)}`}
            description="Janela de veiculação"
            icon={Calendar}
          />
        </div>

        {/* Consumo e Criativo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progresso de Orçamento */}
          <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Consumo de Orçamento</h2>
            <BudgetProgress spent={campaign.gasto} total={campaign.orcamento} />
            <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4 text-xs text-zinc-400">
              <div>
                <span className="block text-zinc-500">Saldo Restante da Campanha:</span>
                <span className="text-sm font-semibold text-white">
                  {formatCurrency(Math.max(0, campaign.orcamento - campaign.gasto))}
                </span>
              </div>
              <div>
                <span className="block text-zinc-500">Status Atual:</span>
                <span className="text-sm font-semibold text-emerald-400 capitalize">
                  {campaign.status}
                </span>
              </div>
            </div>
          </div>

          {/* Criativo Preview */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-3">
            <h2 className="text-base font-bold text-white">Prévia do Criativo</h2>
            {campaign.criativo_url ? (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950 aspect-video flex items-center justify-center">
                  <img
                    src={campaign.criativo_url}
                    alt={campaign.nome}
                    className="h-full w-full object-cover"
                  />
                </div>
                {campaign.call_to_action && (
                  <div className="flex flex-col gap-1 rounded-xl bg-white/5 p-2.5 text-xs text-zinc-200 border border-white/5">
                    <div className="font-semibold flex items-center justify-between">
                      <span>Botão: {campaign.call_to_action.includes("|") ? campaign.call_to_action.split("|")[0] : campaign.call_to_action}</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">CTA Ativo</span>
                    </div>
                    {campaign.call_to_action.includes("|") && (
                      <a 
                        href={campaign.call_to_action.split("|")[1].startsWith("http") ? campaign.call_to_action.split("|")[1] : `https://${campaign.call_to_action.split("|")[1]}`}
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-[11px] text-emerald-400 hover:underline truncate block"
                      >
                        🔗 {campaign.call_to_action.split("|")[1]}
                      </a>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-36 items-center justify-center rounded-xl border border-white/5 bg-zinc-950 text-xs text-zinc-500">
                Sem mídia configurada
              </div>
            )}
            {campaign.texto && (
              <p className="text-xs text-zinc-400 italic">"{campaign.texto}"</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
