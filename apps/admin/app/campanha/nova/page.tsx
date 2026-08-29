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
  FileCheck,
  Eye,
  Link2,
  Heart,
  MessageCircle,
  Target,
  Smartphone,
  Calendar,
  Zap,
  Users,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Info
} from "lucide-react";
import { PartnerNavbar } from "@/components/ads/PartnerNavbar";
import { adsApiFetch, formatCurrency } from "@/lib/ads-utils";
import { CampaignObjective, ConversionAction, CreateCampaignDto, WalletBalanceDto } from "@/domain/ads/types";
import { compressImage } from "@/lib/image-compression";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── DEFINIÇÃO DOS OBJETIVOS DO FÉCONECTA ───────────────────────────────────
interface ObjectiveConfig {
  id: CampaignObjective;
  title: string;
  badge: string;
  description: string;
  optimization: string;
  mainConversion: string;
  defaultAction: ConversionAction;
  icon: any;
  color: string;
  estimatedCostRange: [number, number]; // [min, max] em reais
}

const OBJECTIVES: ObjectiveConfig[] = [
  {
    id: "reconhecimento",
    title: "Reconhecimento",
    badge: "Mais Popular",
    description: "Mostrar para o maior número possível de pessoas na comunidade.",
    optimization: "Máximo de impressões e alcance qualificado",
    mainConversion: "Impressão / Alcance",
    defaultAction: "link_externo",
    icon: Eye,
    color: "from-emerald-500 to-teal-500 text-emerald-400 border-emerald-500/30",
    estimatedCostRange: [0.01, 0.03],
  },
  {
    id: "trafego",
    title: "Tráfego",
    badge: "Alto Tráfego",
    description: "Levar pessoas para seu site, página de vendas, landing page ou link externo.",
    optimization: "Mais cliques no link de destino",
    mainConversion: "Clique no Link / Site",
    defaultAction: "link_externo",
    icon: Link2,
    color: "from-teal-500 to-cyan-500 text-teal-400 border-teal-500/30",
    estimatedCostRange: [0.15, 0.35],
  },
  {
    id: "engajamento",
    title: "Engajamento",
    badge: "Comunidade",
    description: "Fazer as pessoas interagirem com sua mensagem no feed e stories.",
    optimization: "Mais curtidas (fogo), comentários e compartilhamentos",
    mainConversion: "Curtida, comentário e partilha",
    defaultAction: "engajamento_social",
    icon: Heart,
    color: "from-pink-500 to-rose-500 text-pink-400 border-pink-500/30",
    estimatedCostRange: [0.08, 0.20],
  },
  {
    id: "contatos",
    title: "Contatos",
    badge: "Vendas Diretas",
    description: "Gerar contato direto no WhatsApp, direct ou ligação para fechar negócios.",
    optimization: "Início de conversas no WhatsApp e ligações",
    mainConversion: "Mensagem no WhatsApp / Ligação",
    defaultAction: "whatsapp",
    icon: MessageCircle,
    color: "from-green-500 to-emerald-500 text-green-400 border-green-500/30",
    estimatedCostRange: [2.50, 4.50],
  },
  {
    id: "conversoes",
    title: "Conversões",
    badge: "Alta Intenção",
    description: "Gerar uma ação de negócio final: compras, cadastros ou formulários.",
    optimization: "Pessoas com maior propensão de compra/cadastro",
    mainConversion: "Compra / Cadastro concluído",
    defaultAction: "compra",
    icon: Target,
    color: "from-purple-500 to-indigo-500 text-purple-400 border-purple-500/30",
    estimatedCostRange: [4.00, 8.00],
  },
  {
    id: "instalacoes",
    title: "Instalações",
    badge: "Aplicativos",
    description: "Conseguir novos usuários para baixar e instalar seu aplicativo.",
    optimization: "Instalações e aberturas do app",
    mainConversion: "Instalação do app",
    defaultAction: "instalacao_app",
    icon: Smartphone,
    color: "from-blue-500 to-indigo-500 text-blue-400 border-blue-500/30",
    estimatedCostRange: [3.00, 6.00],
  },
  {
    id: "eventos",
    title: "Eventos",
    badge: "Congressos & Cultos",
    description: "Divulgar conferências, shows e cultos especiais para lotar o evento.",
    optimization: "Inscrições e confirmações de presença",
    mainConversion: "Inscrição confirmada",
    defaultAction: "inscricao_evento",
    icon: Calendar,
    color: "from-amber-500 to-orange-500 text-amber-400 border-amber-500/30",
    estimatedCostRange: [1.80, 3.50],
  },
];

export default function CreateCampaignPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletBalanceDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State em 6 Passos
  const [objetivo, setObjetivo] = useState<CampaignObjective>("contatos");
  const [acaoConversao, setAcaoConversao] = useState<ConversionAction>("whatsapp");
  
  // Público
  const [regioes, setRegioes] = useState("Brasil (Todo o país)");
  const [denominacoes, setDenominacoes] = useState("Todas as denominações cristãs");
  const [interesses, setInteresses] = useState("Comunidade Cristã Geral");

  // Orçamento & Período
  const [orcamentoReais, setOrcamentoReais] = useState<number>(500);
  const [periodoInicio, setPeriodoInicio] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [periodoFim, setPeriodoFim] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );

  // Criativo
  const [nome, setNome] = useState("");
  const [formato, setFormato] = useState<"feed" | "stories" | "banner">("feed");
  const [criativoUrl, setCriativoUrl] = useState("");
  const [criativoTipo, setCriativoTipo] = useState<"imagem" | "video">("imagem");
  const [callToAction, setCallToAction] = useState("Falar no WhatsApp");
  const [destinoUrl, setDestinoUrl] = useState("");
  const [texto, setTexto] = useState("");

  // Media Upload State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaMode, setMediaMode] = useState<"upload" | "url">("upload");

  useEffect(() => {
    adsApiFetch<WalletBalanceDto>("/api/wallet")
      .then((data) => setWallet(data))
      .catch((err) => console.error("Erro ao carregar carteira:", err));
  }, []);

  // Sincroniza ação padrão quando objetivo muda
  function handleSelectObjective(obj: ObjectiveConfig) {
    setObjetivo(obj.id);
    setAcaoConversao(obj.defaultAction);
    if (obj.id === "contatos") {
      setCallToAction("Falar no WhatsApp");
    } else if (obj.id === "trafego") {
      setCallToAction("Saiba Mais");
    } else if (obj.id === "conversoes") {
      setCallToAction("Comprar Agora");
    } else if (obj.id === "eventos") {
      setCallToAction("Garantir Vaga");
    } else if (obj.id === "instalacoes") {
      setCallToAction("Instalar Agora");
    }
  }

  // Cálculos de Projeção / Estimativa em Tempo Real
  const selectedObjConfig = OBJECTIVES.find((o) => o.id === objetivo) || OBJECTIVES[0];
  const orcamentoVal = Number(orcamentoReais) || 0;
  const minEstimated = Math.max(1, Math.round(orcamentoVal / selectedObjConfig.estimatedCostRange[1]));
  const maxEstimated = Math.max(minEstimated, Math.round(orcamentoVal / selectedObjConfig.estimatedCostRange[0]));
  const avgCost = ((selectedObjConfig.estimatedCostRange[0] + selectedObjConfig.estimatedCostRange[1]) / 2).toFixed(2);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingMedia(true);
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (!isImage && !isVideo) {
        toast.error("Selecione um arquivo de imagem (PNG, JPG, WEBP) ou vídeo (MP4, WEBM).");
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

      if (error) throw new Error(error.message);

      const { data: { publicUrl } } = supabase.storage.from("posts").getPublicUrl(data.path);
      setCriativoUrl(publicUrl);
      setCriativoTipo(tipo);
      toast.success("Mídia enviada e comprimida com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro no upload.");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const orcamentoCentavos = Math.round(orcamentoVal * 100);

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
        acao_conversao: acaoConversao,
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
          interesses: [interesses],
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

      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/campanha"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Criar Nova Campanha</h1>
            <p className="text-xs text-zinc-400">
              Fluxo em 6 passos: escolha seu objetivo e o FéConecta otimizará a entrega automaticamente.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ─── PASSO 1: ESCOLHA O OBJETIVO ─── */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                  1
                </span>
                Escolha o Objetivo da Campanha
              </h2>
              <span className="text-[11px] text-zinc-400 font-medium">O que você quer obter?</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {OBJECTIVES.map((obj) => {
                const Icon = obj.icon;
                const isSelected = objetivo === obj.id;
                return (
                  <button
                    key={obj.id}
                    type="button"
                    onClick={() => handleSelectObjective(obj)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-all relative flex flex-col justify-between space-y-3 group",
                      isSelected
                        ? "border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/30"
                        : "border-white/10 bg-zinc-950/60 hover:border-white/20 hover:bg-zinc-950"
                    )}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className={cn("p-2 rounded-lg bg-white/5", isSelected ? "text-emerald-400" : "text-zinc-400 group-hover:text-white")}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", isSelected ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10" : "border-white/10 text-zinc-500")}>
                          {obj.badge}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-white">{obj.title}</h3>
                        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{obj.description}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 text-[10px] text-zinc-500 space-y-0.5">
                      <div><strong className="text-zinc-400">Otimização:</strong> {obj.optimization}</div>
                      <div><strong className="text-zinc-400">Conversão:</strong> {obj.mainConversion}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── PASSO 2: DEFINA O PÚBLICO ─── */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-5 backdrop-blur-md">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                2
              </span>
              Defina o Público-Alvo Cristão
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Região / Alcance
                </label>
                <select
                  value={regioes}
                  onChange={(e) => setRegioes(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Brasil (Todo o país)">Brasil (Todo o país)</option>
                  <option value="São Paulo / SP">São Paulo / SP</option>
                  <option value="Rio de Janeiro / RJ">Rio de Janeiro / RJ</option>
                  <option value="Belo Horizonte / MG">Belo Horizonte / MG</option>
                  <option value="Curitiba / PR">Curitiba / PR</option>
                  <option value="Região Sul">Região Sul</option>
                  <option value="Região Sudeste">Região Sudeste</option>
                  <option value="Região Nordeste">Região Nordeste</option>
                  <option value="Região Centro-Oeste">Região Centro-Oeste</option>
                  <option value="Região Norte">Região Norte</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Denominações Cristãs
                </label>
                <select
                  value={denominacoes}
                  onChange={(e) => setDenominacoes(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Todas as denominações cristãs">Todas as denominações cristãs</option>
                  <option value="Batista">Batista</option>
                  <option value="Assembleia de Deus">Assembleia de Deus</option>
                  <option value="Presbiteriana">Presbiteriana</option>
                  <option value="Adventista">Adventista</option>
                  <option value="Metodista">Metodista</option>
                  <option value="Luterana">Luterana</option>
                  <option value="Congregacional">Congregacional</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Segmento / Interesse
                </label>
                <select
                  value={interesses}
                  onChange={(e) => setInteresses(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Comunidade Cristã Geral">Comunidade Cristã Geral</option>
                  <option value="Música Gospel & Louvor">Música Gospel & Louvor</option>
                  <option value="Jovens & Universitários">Jovens & Universitários</option>
                  <option value="Casais & Família">Casais & Família</option>
                  <option value="Empreendedorismo Cristão">Empreendedorismo Cristão</option>
                  <option value="Teologia & Estudos Bíblicos">Teologia & Estudos Bíblicos</option>
                </select>
              </div>
            </div>
          </div>

          {/* ─── PASSO 3: DEFINA ORÇAMENTO & PROJEÇÃO DE META ─── */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-5 backdrop-blur-md">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                3
              </span>
              Defina o Orçamento & Período
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Orçamento Total (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-zinc-400">R$</span>
                  <input
                    type="number"
                    min="5"
                    step="1"
                    value={orcamentoReais}
                    onChange={(e) => setOrcamentoReais(Math.max(5, Number(e.target.value)))}
                    required
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 pl-11 pr-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none font-bold"
                  />
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Mínimo: R$ 5,00</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Data Início
                </label>
                <input
                  type="date"
                  value={periodoInicio}
                  onChange={(e) => setPeriodoInicio(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Data Término
                </label>
                <input
                  type="date"
                  value={periodoFim}
                  onChange={(e) => setPeriodoFim(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* ─── CARD DE ESTIMATIVA DE RESULTADO EM TEMPO REAL ─── */}
            <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 to-teal-950/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4" /> Projeção de Resultados FéConecta
                </span>
                <span className="text-[10px] text-zinc-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  Estimativa algorítmica
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Objetivo Selecionado</span>
                  <span className="text-sm font-bold text-white capitalize">{selectedObjConfig.title}</span>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Meta Estimada</span>
                  <span className="text-base font-black text-emerald-400">
                    ~{minEstimated} a {maxEstimated} {selectedObjConfig.mainConversion.toLowerCase()}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 block uppercase">Custo Médio Projetado</span>
                  <span className="text-sm font-bold text-white">~R$ {avgCost} / resultado</span>
                </div>
              </div>
            </div>
          </div>

          {/* ─── PASSO 4: CRIE O ANÚNCIO (CRIATIVO & FORMATAÇÃO) ─── */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-5 backdrop-blur-md">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                4
              </span>
              Crie o Anúncio (Criativo & Copy)
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
                  placeholder="Ex: Conferência Jovens com Propósito / Venda de Livro Gospel"
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
                    Texto do Botão de Ação (CTA)
                  </label>
                  <input
                    type="text"
                    value={callToAction}
                    onChange={(e) => setCallToAction(e.target.value)}
                    placeholder="Ex: Falar no WhatsApp, Saiba Mais, Comprar Agora"
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Link de Destino / WhatsApp *
                </label>
                <input
                  type="text"
                  value={destinoUrl}
                  onChange={(e) => setDestinoUrl(e.target.value)}
                  placeholder="https://wa.me/55... ou https://seusite.com.br"
                  required
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Texto / Copy do Anúncio
                </label>
                <textarea
                  rows={3}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Descreva a mensagem do anúncio que aparecerá no feed..."
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Upload de Mídia */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                    Mídia Criativa (Imagem ou Vídeo)
                  </label>
                  <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-white/5 text-xs">
                    <button
                      type="button"
                      onClick={() => setMediaMode("upload")}
                      className={cn("px-2.5 py-1 rounded-md transition-all font-medium", mediaMode === "upload" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-zinc-400")}
                    >
                      Upload Direto
                    </button>
                    <button
                      type="button"
                      onClick={() => setMediaMode("url")}
                      className={cn("px-2.5 py-1 rounded-md transition-all font-medium", mediaMode === "url" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "text-zinc-400")}
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
                      <div className="relative rounded-xl border border-emerald-500/30 bg-emerald-950/10 p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {criativoTipo === "imagem" ? (
                            <img src={criativoUrl} alt="Preview" className="w-14 h-14 rounded-lg object-cover border border-white/10" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-zinc-900 flex items-center justify-center border border-white/10 text-emerald-400">
                              <VideoIcon className="w-6 h-6" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-emerald-400 block truncate">Mídia Salva com Sucesso</span>
                            <span className="text-[11px] text-zinc-400 block truncate">{criativoUrl}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCriativoUrl("")}
                          className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer rounded-xl border-2 border-dashed border-white/10 bg-zinc-950/40 p-6 flex flex-col items-center justify-center gap-2 hover:border-emerald-500/40 transition-all text-center group"
                      >
                        {isUploadingMedia ? (
                          <div className="flex flex-col items-center gap-2 text-emerald-400">
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span className="text-xs font-medium">Otimizando e enviando mídia...</span>
                          </div>
                        ) : (
                          <>
                            <div className="p-3 rounded-full bg-white/5 text-zinc-400 group-hover:text-emerald-400 transition-colors">
                              <Upload className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-semibold text-zinc-200">Clique para selecionar imagem ou vídeo</span>
                            <span className="text-[10px] text-zinc-500">Imagens comprimidas automaticamente em WebP • Vídeos até 50MB</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="url"
                    value={criativoUrl}
                    onChange={(e) => setCriativoUrl(e.target.value)}
                    placeholder="https://exemplo.com/imagem.jpg"
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
                  />
                )}
              </div>
            </div>
          </div>

          {/* ─── PASSO 5: DEFINA A CONVERSÃO PRINCIPAL ─── */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 space-y-5 backdrop-blur-md">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">
                5
              </span>
              Defina a Ação de Conversão
            </h2>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Qual ação você considera o resultado de sucesso desta campanha?
              </label>
              <select
                value={acaoConversao}
                onChange={(e: any) => setAcaoConversao(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-2.5 text-sm text-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="whatsapp">📞 Contato iniciado no WhatsApp</option>
                <option value="compra">🛒 Compra realizada no site</option>
                <option value="cadastro">📝 Cadastro / Formulário preenchido</option>
                <option value="link_externo">🔗 Visita à Página de Vendas</option>
                <option value="inscricao_evento">📅 Inscrição confirmada no Evento</option>
                <option value="visita_igreja">⛪ Pedido de Visita / Informação da Igreja</option>
                <option value="instalacao_app">📱 Instalação do Aplicativo</option>
                <option value="engajamento_social">❤️ Curtida ou Comentário no Feed</option>
              </select>
              <p className="text-[10px] text-zinc-400 mt-1.5">
                O painel de desempenho calculará o custo por resultado baseado exatamente nesta ação escolhida.
              </p>
            </div>
          </div>

          {/* ─── PASSO 6: OTIMIZAÇÃO & FINALIZAÇÃO ─── */}
          <div className="rounded-2xl border border-emerald-500/20 bg-zinc-900/80 p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">6. FéConecta Otimiza a Entrega</h3>
                <p className="text-xs text-zinc-400">
                  Após a revisão da equipe, nosso algoritmo priorizará a exibição do seu anúncio para membros com maior afinidade pelo objetivo <strong>{selectedObjConfig.title}</strong>.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="text-xs text-zinc-400">
                <span>Orçamento configurado: </span>
                <strong className="text-white font-bold">{formatCurrency(orcamentoCentavos)}</strong>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isUploadingMedia}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Criando Campanha...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>Lançar Campanha Otimizada</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
