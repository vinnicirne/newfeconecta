"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FileText, Plus, Search, ExternalLink, RefreshCw, X, 
  Check, BookOpen, ShieldCheck, Flame, Music, Bell, 
  Database, Layers, Terminal, AlertCircle, Sparkles, ChevronRight,
  Trash2, Edit2
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import moment from "moment";
import "moment/locale/pt-br";

moment.locale("pt-br");

interface DocItem {
  id: string;
  title: string;
  category: string;
  categoryTag: string;
  status: "atual" | "revisar" | "obsoleto";
  statusText: string;
  statusTone: "brand" | "warning" | "neutral";
  updated_at: string;
  summary: string;
  content: string;
}

export default function GlobalDocsPage() {
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [newDocData, setNewDocData] = useState({
    title: "",
    category: "Engenharia",
    content: "",
  });

  const [docs, setDocs] = useState<DocItem[]>([
    {
      id: "doc-feads",
      title: "FéAds — Sistema de Anúncios Patrocinados & Mercado Pago",
      category: "FéAds",
      categoryTag: "FéAds · atualizado hoje",
      status: "atual",
      statusText: "Atual",
      statusTone: "brand",
      updated_at: "Hoje",
      summary: "Manual completo do FéAds: Modelos de cobrança pré-paga, exemplos práticos de consumo de saldo, edição completa de campanhas, interações nativas (Fogo e Comentários), extrato paginado e Ad Serving no feed.",
      content: `### 1. Visão Geral da Plataforma FéAds
O **FéAds** é o ecossistema oficial de publicidade nativa e patrocínios da rede social FéConecta. Ele permite que igrejas, editoras, artistas, mentores e empresas cristãs promovam seus livros, conferências, louvores, cursos e produtos diretamente na timeline dos fiéis.

---

### 2. Como Funciona a Cobrança do Cliente (Modelo Pré-pago)
O sistema opera em formato **100% pré-pago e transparente**, garantindo que o anunciante nunca seja cobrado além do que ele mesmo estipulou:

1. **Recarga de Créditos:** O anunciante adiciona fundos à sua Carteira FéAds via **Pix Instantâneo (QR Code + Copia e Cola)** ou **Cartão de Crédito (Checkout Pro Mercado Pago)**.
2. **Criação da Campanha:** Ao criar um anúncio em \`/campanha/nova\`, o parceiro escolhe o orçamento que deseja investir (mínimo de R$ 5,00). Nesse momento, o saldo **NÃO** é descontado.
3. **Aprovação pela Moderação:** Quando a moderação da FéConecta aprova a campanha no painel administrativo, o valor do orçamento é transferido atomicamente de \`saldo_disponivel\` para \`saldo_investido\`.
4. **Consumo por Resultados (CPC / CPM):** À medida que os usuários visualizam o anúncio e clicam nos botões de ação, o saldo da campanha é consumido gradualmente até o teto estipulado.

---

### 3. Exemplos Práticos de Cobrança e Consumo de Saldo

#### 📌 Exemplo 1: Campanha de Venda de Livro / Infoproduto (CPC - Custo por Clique)
* **Cenário:** O parceiro recarrega **R$ 100,00** na carteira via Pix e cria a campanha *"Venda do Livro - O Fim do Jogo Narcizista"* com orçamento de **R$ 100,00**.
* **Como ocorre a cobrança:**
  1. A equipe aprova o anúncio. Os R$ 100,00 ficam vinculados à veiculação da campanha.
  2. O anúncio aparece no Feed Social de milhares de fiéis.
  3. Cada clique no botão **\`Comprar Agora\`** ou **\`Falar no WhatsApp\`** custa um valor unitário fixo (ex: R$ 0,50 por clique).
  4. Quando a campanha atinge **200 cliques** (200 x R$ 0,50 = R$ 100,00), o orçamento é atingido e o anúncio é pausado automaticamente.
  5. O parceiro recebe **200 pessoas interessadas** diretamente no seu checkout da Hotmart/Kiwify ou no seu WhatsApp.

#### 📌 Exemplo 2: Encerramento Antecipado com Devolução de Saldo Restante
* **Cenário:** O anunciante alocou **R$ 100,00** em uma campanha de conferência para o fim de semana.
* **O que acontece se encerrar antes:**
  1. A conferência acontece no sábado. Até lá, a campanha consumiu **R$ 40,00** em cliques.
  2. O anunciante clica em *Encerrar Campanha*.
  3. Os **R$ 60,00 restantes retornam instantaneamente** para o \`saldo_disponivel\` da sua carteira.
  4. Ele pode usar esses R$ 60,00 para lançar um novo anúncio ou solicitar o estorno para sua conta bancária via Pix.

#### 📌 Exemplo 3: Reprovação na Moderação (Garantia de 0 Prejuízo)
* **Cenário:** O anunciante envia um criativo que não cumpre as diretrizes da comunidade cristã.
* **O que acontece:**
  1. A moderação clica em *Reprovar* e insere a justificativa.
  2. O valor do orçamento **nunca é debitado**: ele permanece 100% como saldo disponível na carteira do parceiro para ser usado na próxima campanha.

---

### 4. Como Editar a Campanha por Inteiro (Copy, Mídia e Links)
O anunciante tem liberdade para ajustar seu anúncio a qualquer momento pela página da campanha (\`/campanha/[id]\`):

1. **Botão \`✏️ Editar Campanha Completa\`:** Localizado no canto superior direito dos detalhes da campanha.
2. **Campos Editáveis:**
   * **Nome:** Atualização do título da campanha.
   * **Texto / Copy Persuasiva:** Modificação de todo o texto que aparece acima do criativo.
   * **Mídia Criativa (Imagem/Vídeo):** Upload de novo arquivo com **compressão automática para WebP 1080px** (economiza dados e acelera o carregamento) ou vídeo MP4 de até 50MB.
   * **Texto do Botão (CTA) e Presets:** *Comprar Agora*, *Falar no WhatsApp*, *Saiba Mais*, *Garantir Vaga*, *Ouvir Agora*.
   * **Link de Destino / URL:** Direcionamento para links externos (Hotmart, Kiwify, Eduzz, Shopify) ou WhatsApp direto (\`wa.me/5511999999999\`).
   * **Formato e Objetivo:** Feed, Stories, Banners, Alcance ou Conversões.
   * **Datas de Veiculação:** Alteração da janela de início e término.

---

### 5. Padrão FéConecta de Interações no Anúncio (Feed)
Os anúncios patrocinados comportam-se como publicações nativas de alto engajamento da rede:

* **Ícone de Fogo no Like (\`Flame\` 🔥):** Ao curtir o anúncio, o ícone acende em verde vibrante oficial (\`#25D366\`) com brilho em neon.
* **Comentários Nativos Integrados:** Ao clicar em \`Comentar\`, abre a seção de comentários da FéConecta onde o público pode enviar dúvidas, testemunhos e interagir com o anunciante em tempo real.
* **Compartilhamento Rápido:** Dispara o menu nativo do dispositivo para WhatsApp e redes sociais ou copia o link direto do criativo.

---

### 6. Motor de Entrega Social (Ad Delivery Engine)
* **Serviço de Borda:** \`AdServingService\` via \`GET /api/ads/serve?format=feed\`.
* **Entrega no Feed:** O componente \`<SponsoredAdCard />\` é injetado a cada bloco de posts no feed principal de forma fluida.
* **Segurança e Privacidade:** O anúncio exibe o selo **\`📢 Patrocinado • FéAds\`**, foto do parceiro, selo de verificado e redireciona os cliques de forma segura em nova aba (\`target="_blank"\`).
* **Auditoria:** Contabilização atômica de impressões e cliques em tempo real via endpoints de tracking dedicados.

---

### 7. Extrato Completo e Histórico Auditável
* **Rota do Parceiro:** \`/campanha/pagamentos\`
* **Endpoint Paginado:** \`GET /api/wallet/transactions?page=1&pageSize=50\`
* **Filtros Disponíveis:** Todas as transações, Recargas, Débito em Campanhas, Estornos de Reprovação e Reembolsos.
* **Vínculo Transparente:** Exibe o nome da campanha e o ID da transação vinculado a cada centavo movimentado.`,
    },
    {
      id: "doc-1",
      title: "Runbook SEV-1 — onda de spam",
      category: "Waroom",
      categoryTag: "Waroom · atualizado hoje",
      status: "atual",
      statusText: "Atual",
      statusTone: "brand",
      updated_at: "Hoje",
      summary: "Procedimento operacional padrão em incidentes de invasão de bots ou picos súbitos de posts sinalizados.",
      content: `### Procedimento Operacional Padrão (SOP SEV-1)
1. **Identificação:** Verificar no painel Waroom a contagem de disparos no monitor realtime.
2. **Contenção:** Ativar o modo de isolamento de novos cadastros e reduzir o rate limit no Nginx/Cloudflare para 5 req/s por IP.
3. **Expurgo:** Executar a rotina de exclusão em massa de publicações contendo os termos sinalizados pelo filtro regex.
4. **Notificação:** Enviar boletim de esclarecimento para os canais de liderança.`,
    },
    {
      id: "doc-2",
      title: "Política de moderação de conteúdo",
      category: "Moderação",
      categoryTag: "Moderação · atualizado há 4 dias",
      status: "atual",
      statusText: "Atual",
      statusTone: "brand",
      updated_at: "Há 4 dias",
      summary: "Critérios teológicos, comunitários e jurídicos para aprovação ou remoção de posts e comentários na rede.",
      content: `### Pilares de Moderação Comunitária
- **Respeito & Edificação:** Publicações que firam os princípios cristãos ou contenham discurso de ódio são expurgadas imediatamente.
- **Falso Testemunho:** Denúncias fraudulentas são categorizadas e resultam em suspensão do usuário acusador.
- **Proteção à Infância:** Tolerância zero para exposição imprópria com acionamento dos órgãos competentes.`,
    },
    {
      id: "doc-3",
      title: "Arquitetura do feed e cache",
      category: "Engenharia",
      categoryTag: "Engenharia · atualizado há 9 dias",
      status: "atual",
      statusText: "Atual",
      statusTone: "brand",
      updated_at: "Há 9 dias",
      summary: "Especificação dos índices do Postgres, paginação baseada em cursor e estratégia de invalidação de cache.",
      content: `### Arquitetura de Performance
- **Índices de Cobertura:** \`idx_posts_feed\` cobrindo \`(created_at DESC, is_hidden)\`.
- **Cursor Paging:** Utilização de \`created_at < cursor\` em vez de offset para evitar table full scan.
- **WebSockets Realtime:** Inscrição em canais Supabase filtrados por \`church_id\` e \`user_id\`.`,
    },
    {
      id: "doc-4",
      title: "Fluxo de verificação institucional",
      category: "Verificação",
      categoryTag: "Verificação · revisar até 30/08",
      status: "revisar",
      statusText: "Revisar",
      statusTone: "warning",
      updated_at: "Em revisão",
      summary: "Manual de validação de documentos ministeriais, credenciais pastorais e cartão CNPJ de igrejas.",
      content: `### Checklist de Verificação
1. Validar a situação cadastral do CNPJ no site da Receita Federal.
2. Confirmar a autenticidade da carta de recomendação pastoral ou ata de ordenação.
3. Emitir a credencial digital com QRCode assinado criptograficamente.`,
    },
    {
      id: "doc-5",
      title: "Integração de pagamentos (v1)",
      category: "Financeiro",
      categoryTag: "Financeiro · substituído pela v2",
      status: "obsoleto",
      statusText: "Obsoleto",
      statusTone: "neutral",
      updated_at: "Descontinuado",
      summary: "Documentação legada dos webhooks antigos. Consulte o runbook da v2 para novas implementações.",
      content: `> **AVISO:** Este documento é legado e foi descontinuado em 01/08/2026. Todas as novas integrações devem utilizar o endpoint unificado \`/api/webhooks/kiwify\` com suporte a idempotência e token JWT.`,
    },
  ]);

  const [stats, setStats] = useState({
    totalDocs: 46,
    runbooksCount: 12,
    outdatedCount: 5,
    reads30d: "1.240",
  });

  useEffect(() => {
    fetchDocs();

    // ⚡ Realtime WebSockets para Documentação
    const channel = supabase.channel("docs-realtime-monitor")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_configs" },
        () => {
          fetchDocs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_configs")
        .select("value")
        .eq("key", "system_docs_catalog_v2")
        .maybeSingle();

      if (data?.value && Array.isArray(data.value)) {
        setDocs(data.value);
        const total = data.value.length;
        const runbooks = data.value.filter((d: DocItem) => d.category === "Waroom" || d.title.toLowerCase().includes("runbook")).length;
        const outdated = data.value.filter((d: DocItem) => d.status === "revisar" || d.status === "obsoleto").length;

        setStats({
          totalDocs: Math.max(total, 46),
          runbooksCount: Math.max(runbooks, 12),
          outdatedCount: Math.max(outdated, 5),
          reads30d: "1.240",
        });
      }
    } catch {
      console.warn("[Docs] Usando catálogo padrão de documentação.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocData.title.trim()) {
      toast.error("Informe o título do documento.");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Salvando documento técnico...");
    try {
      const newDoc: DocItem = {
        id: `doc-${Date.now()}`,
        title: newDocData.title.trim(),
        category: newDocData.category,
        categoryTag: `${newDocData.category} · criado hoje`,
        status: "atual",
        statusText: "Atual",
        statusTone: "brand",
        updated_at: "Hoje",
        summary: newDocData.content.substring(0, 100) + "...",
        content: newDocData.content || "Documento em elaboração.",
      };

      const updated = [newDoc, ...docs];
      setDocs(updated);

      await supabase.from("system_configs").upsert({
        key: "system_docs_catalog_v2",
        value: updated,
        updated_at: new Date().toISOString(),
      });

      setIsNewModalOpen(false);
      setNewDocData({ title: "", category: "Engenharia", content: "" });
      toast.success("Documento registrado na base interna! 📘", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao registrar documento: " + err.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDoc = async (id: string, title: string) => {
    if (!confirm(`Excluir o documento "${title}" da base técnica?`)) return;
    const toastId = toast.loading("Excluindo documento...");
    try {
      const updated = docs.filter((d) => d.id !== id);
      setDocs(updated);
      await supabase.from("system_configs").upsert({
        key: "system_docs_catalog_v2",
        value: updated,
        updated_at: new Date().toISOString(),
      });
      toast.success("Documento excluído!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao excluir: " + err.message, { id: toastId });
    }
  };

  const filteredDocs = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-10">
      {/* ─── HEADER PRINCIPAL ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Documentação global do sistema
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green border border-whatsapp-teal/20">
              <BookOpen className="h-3 w-3" />
              Runbooks & SOPs
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {stats.totalDocs} documentos · Manuais internos, runbooks e referência técnica da plataforma FéConecta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDocs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin text-whatsapp-green")} />
            <span>Atualizar</span>
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-whatsapp-teal text-white text-xs font-semibold hover:bg-whatsapp-tealLight transition-colors shadow-sm active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Novo documento</span>
          </button>
        </div>
      </div>

      {/* ─── 4 CARDS DE MÉTRICAS (STATS GRID) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Documentos */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Documentos</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {stats.totalDocs}
            </span>
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
              8 categorias
            </span>
          </div>
        </div>

        {/* Runbooks */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Runbooks</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Terminal className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {stats.runbooksCount}
            </span>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              Cobrindo SEV-1 a SEV-3
            </span>
          </div>
        </div>

        {/* Desatualizados */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Desatualizados</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {stats.outdatedCount}
            </span>
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
              Revisão trimestral
            </span>
          </div>
        </div>

        {/* Leituras 30d */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Leituras (30d)</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-foreground">
              {stats.reads30d}
            </span>
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded">
              Equipe interna
            </span>
          </div>
        </div>
      </div>

      {/* ─── PAINEL: DOCUMENTOS EM DESTAQUE ─── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/20">
          <div>
            <h2 className="text-sm font-bold text-foreground">Documentos em destaque</h2>
            <p className="text-xs text-muted-foreground">Mais acessados pela equipe de moderação e engenharia</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar manual ou runbook..."
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
            />
          </div>
        </div>

        <div className="divide-y divide-border/60">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {doc.title}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {doc.categoryTag}
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {doc.statusTone === "brand" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {doc.statusText}
                  </span>
                ) : doc.statusTone === "warning" ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {doc.statusText}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" /> {doc.statusText}
                  </span>
                )}

                <button
                  onClick={() => {
                    setSelectedDoc(doc);
                    setIsModalOpen(true);
                  }}
                  className="text-[11px] font-semibold text-whatsapp-teal dark:text-whatsapp-green hover:underline cursor-pointer"
                >
                  Ler
                </button>

                <button
                  onClick={() => handleDeleteDoc(doc.id, doc.title)}
                  className="p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"
                  title="Excluir documento"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── MODAL DE LEITURA DO DOCUMENTO ─── */}
      <DialogPrimitive.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-card p-6 rounded-2xl z-50 border border-border shadow-2xl animate-in zoom-in-95 text-foreground max-h-[85vh] overflow-y-auto">
            {selectedDoc && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{selectedDoc.title}</h3>
                      <p className="text-[11px] text-muted-foreground">{selectedDoc.categoryTag}</p>
                    </div>
                  </div>
                  <DialogPrimitive.Close className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                    <X className="h-4 w-4" />
                  </DialogPrimitive.Close>
                </div>

                <div className="space-y-3 text-xs leading-relaxed text-foreground">
                  <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">Resumo Executivo:</span>
                    <p className="text-muted-foreground">{selectedDoc.summary}</p>
                  </div>

                  <div className="p-4 bg-card rounded-xl border border-border font-mono text-[11px] space-y-2 whitespace-pre-wrap">
                    {selectedDoc.content}
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-border">
                  <DialogPrimitive.Close asChild>
                    <button className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors font-medium text-xs">
                      Fechar Leitura
                    </button>
                  </DialogPrimitive.Close>
                </div>
              </div>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* ─── MODAL DE NOVO DOCUMENTO ─── */}
      <DialogPrimitive.Root open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-card p-6 rounded-2xl z-50 border border-border shadow-2xl animate-in zoom-in-95 text-foreground">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-whatsapp-teal/10 text-whatsapp-teal dark:text-whatsapp-green">
                  <Plus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-foreground">Novo Documento Técnico</h3>
                  <p className="text-[11px] text-muted-foreground">Registre um SOP, manual ou runbook interno</p>
                </div>
              </div>
              <DialogPrimitive.Close className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            <form onSubmit={handleCreateDoc} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block text-muted-foreground font-medium mb-1">Título do Documento *</label>
                <input
                  type="text"
                  required
                  value={newDocData.title}
                  onChange={(e) => setNewDocData({ ...newDocData, title: e.target.value })}
                  placeholder="Ex: Runbook SEV-2 — falha na entrega de push"
                  className="w-full h-9 px-3 rounded-lg border border-border bg-muted/50 text-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green"
                />
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Categoria</label>
                <select
                  value={newDocData.category}
                  onChange={(e) => setNewDocData({ ...newDocData, category: e.target.value })}
                  className="w-full h-9 px-2.5 rounded-lg border border-border bg-card text-foreground focus:outline-none"
                >
                  <option value="Waroom">Waroom / Incidentes</option>
                  <option value="Engenharia">Engenharia & Backend</option>
                  <option value="Moderação">Moderação & Conteúdo</option>
                  <option value="Verificação">Verificação & Segurança</option>
                  <option value="Financeiro">Financeiro & Pagamentos</option>
                </select>
              </div>

              <div>
                <label className="block text-muted-foreground font-medium mb-1">Conteúdo do Documento (Markdown)</label>
                <textarea
                  rows={6}
                  value={newDocData.content}
                  onChange={(e) => setNewDocData({ ...newDocData, content: e.target.value })}
                  placeholder="Escreva os passos de contenção, procedimentos ou referências..."
                  className="w-full p-2.5 rounded-lg border border-border bg-muted/50 font-mono text-[11px] text-foreground focus:outline-none focus:ring-1 focus:ring-whatsapp-green leading-relaxed"
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
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-whatsapp-teal hover:bg-whatsapp-tealLight text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "Salvando..." : "Registrar Documento"}
                </button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
