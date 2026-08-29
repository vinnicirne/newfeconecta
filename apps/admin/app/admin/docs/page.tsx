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
      title: "FéAds — Sistema de Anúncios Patrocinados, Métricas & Cobrança",
      category: "FéAds",
      categoryTag: "FéAds · atualizado hoje",
      status: "atual",
      statusText: "Atual",
      statusTone: "brand",
      updated_at: "Hoje",
      summary: "Manual oficial do FéAds: Matriz de 5+2 objetivos de campanha, ações de conversão, fluxo de criação em 6 passos, regras e fórmulas de cobrança (CPM vs CPC), painel do anunciante com métricas reais, proteções anti-fraude e integração Mercado Pago.",
      content: `### 1. Visão Geral da Plataforma FéAds
O **FéAds** é o ecossistema oficial de publicidade nativa e patrocínios da rede social FéConecta. Ele permite que igrejas, editoras, artistas, mentores e empresas cristãs promovam seus livros, conferências, louvores, cursos e produtos diretamente na timeline dos fiéis, com foco total em **resultados mensuráveis e ROI transparente**.

---

### 2. Matriz de Objetivos de Campanha & Otimização de Entrega
O FéAds estrutura as campanhas com base no **resultado que o anunciante quer obter**, e o algoritmo otimiza a distribuição para essa ação específica:

| Objetivo | O que o FéConecta busca | Conversão Principal | Modelo de Cobrança |
| :--- | :--- | :--- | :---: |
| **👁️ Reconhecimento** | Mostrar para o maior número de pessoas | Impressão / Alcance único | **CPM** (R$ 0,01 / visualização) |
| **🔗 Tráfego** | Levar pessoas para um site, página ou link | Clique no Link / Site | **CPC** (R$ 0,25 / clique) |
| **❤️ Engajamento** | Fazer pessoas interagirem no feed | Curtida (fogo), comentários, partilha | **CPM** (R$ 0,01 / visualização) |
| **💬 Contatos** | Gerar contato direto no WhatsApp / chat | Mensagem no WhatsApp / Ligação | **CPC** (R$ 0,50 / clique qualificado) |
| **🎯 Conversões** | Gerar uma ação de negócio (compra / lead) | Compra / Cadastro / Formulário | **CPC** (R$ 0,50 / clique qualificado) |
| **📱 Instalações** | Conseguir novos usuários para o app | Instalação do aplicativo | **CPC** (R$ 0,50 / clique qualificado) |
| **📅 Eventos** | Divulgar congressos e cultos especiais | Inscrição confirmada no evento | **CPC** (R$ 0,50 / clique qualificado) |

---

### 3. Ações de Conversão Personalizadas
Cada anunciante define **qual é o seu resultado final desejado**, permitindo que o painel calcule o Custo por Ação (CPA) correto:
* 📞 **WhatsApp:** Contato iniciado no WhatsApp (\`wa.me/...\`)
* 🛒 **Compra:** Compra ou checkout realizado
* 📝 **Cadastro:** Formulário ou lead preenchido
* 🔗 **Link Externo:** Visita qualificada na página de destino
* 📅 **Evento:** Inscrição confirmada no congresso/culto
* ⛪ **Igreja:** Pedido de visita ou informações pastorais
* 📱 **App:** Instalação ou registro no aplicativo
* ❤️ **Engajamento Social:** Curtida com fogo ou comentário na timeline

---

### 4. Fluxo de Criação em 6 Passos (\`/campanha/nova\`)
1. **Passo 1 — Escolha o Objetivo:** Seleção visual com foco no resultado desejado.
2. **Passo 2 — Defina o Público:** Segmentação por região geográfica, denominações cristãs e interesses.
3. **Passo 3 — Defina Orçamento & Projeção de Metas:** Cálculo em tempo real de estimativa de conversões (ex: *R$ 500 = ~110 a 200 mensagens*).
4. **Passo 4 — Crie o Anúncio:** Nome, formato (Feed, Stories, Banner), upload com compressão automática WebP 1080px, copy persuasiva e botão CTA.
5. **Passo 5 — Defina a Conversão:** Vinculação da ação de sucesso para cálculo de CPA.
6. **Passo 6 — Otimização Algorítmica:** O FéConecta direciona a exibição para membros com maior propensão de converter.

---

### 5. Cálculo e Regras de Cobrança de Valores
A cobrança é **100% pré-paga e controlada pelo motor de tracking atômico**:

#### A) Modelo CPM (Custo por Mil Impressões) — Para *Reconhecimento* e *Engajamento*:
* **Custo:** **R$ 0,01** por visualização no feed (1 centavo).
* **Fórmula do CPM:**
  $$\\text{CPM} = \\left( \\frac{\\text{Gasto Total (R\\$)}}{\\text{Total de Impressões}} \\right) \\times 1.000 = \\text{R\\$} 10,00 \\text{ por mil visualizações}$$
* **Cliques no link:** São **100% gratuitos**.

#### B) Modelo CPC (Custo por Clique) — Para *Tráfego*, *Contatos*, *Conversões*, *Eventos*, *Apps*:
* **Custo:** **R$ 0,25 a R$ 0,50** por clique legítimo no CTA/link.
* **Impressões no feed:** São **100% gratuitas** (R$ 0,00 por exibição).
* **Fórmula do CPC:**
  $$\\text{CPC} = \\frac{\\text{Gasto Total (R\\$)}}{\\text{Total de Cliques}}$$

#### C) Trava de Orçamento Automática:
* O PostgreSQL executa \`increment_campaign_gasto_atomic\`. Assim que $\\text{Gasto} \\ge \\text{Orçamento}$, a campanha é encerrada no mesmo milissegundo. **O anunciante nunca gasta mais do que aprovou.**

#### D) Proteção Anti-Fraude (Rate Limit):
* Cliques repetidos em menos de 5 minutos do mesmo IP ou usuário são detectados como suspeitos e **descartados da cobrança**.

---

### 6. Painel de Desempenho & Gráficos Interativos (\`/campanha/[id]\`)
1. **Hero Indicator (Resultado Real da Campanha):**
   * *Exemplo Tráfego:* 🎯 **Resultado da Campanha: \`3.240 Cliques no Link\`** *(R$ 0,25 por clique)*
   * *Exemplo Contatos:* 🎯 **Resultado da Campanha: \`186 Contatos no WhatsApp\`** *(R$ 2,68 por contato)*
   * *Exemplo Compras:* 🎯 **Resultado da Campanha: \`25 Compras Realizadas\`** *(Receita: R$ 3.747,50 | ROAS: 7,49x)*

2. **Cards Clicáveis com Comparação Multi-Séries:**
   Ao clicar em qualquer um dos 6 cards de métricas, ele alterna a exibição da sua respectiva curva no gráfico:
   * 🟢 **Impressões:** Curva contínua verde esmeralda (\`#10b981\`).
   * 🔵 **Alcance:** Curva tracejada azul ciano (\`#06b6d4\`), visível perfeitamente mesmo com números iguais aos de impressões.
   * 🟣 **Cliques:** Curva roxa (\`#a855f7\`) escalada na proporção exata do volume do funil.
   * 🌸 **CTR (%):** Curva rosa (\`#ec4899\`) com escala percentual.
   * 🟡 **Gasto Diário:** Curva dourada (\`#f59e0b\`) com escala monetária em Reais.
   * 🟢 **Conversões:** Curva verde neon (\`#22c55e\`) com contagem exata de ações reais.

3. **Seletor de Janela Temporal:**
   Abas rápidas: **\`7 Dias\`**, **\`14 Dias\`**, **\`30 Dias\`** e **\`Todo o Período\`**.

4. **Tooltip Inteligente com Âncora Anti-Corte:**
   O card flutuante ajusta sua posição horizontal automaticamente de acordo com o quadrante da tela:
   * **Dias à direita (ex: 29/08):** Abre para a esquerda (\`translate(-108%, -15%)\`), garantindo 0 cortes.
   * **Dias à esquerda:** Abre para a direita (\`translate(8%, -15%)\`).
   * Exibe o ponto colorido, nome e valor formatado de todas as séries selecionadas.

---

### 7. Gestão de Carteira & Reembolso
* **Recarga Instantânea:** Pix (QR Code) e Cartão via Mercado Pago.
* **Devolução Automática:** Ao encerrar uma campanha antes do término, o saldo não consumido retorna imediatamente para \`saldo_disponivel\`.
* **Garantia de Moderação:** Campanhas reprovadas não debitam saldo da carteira.
* **Acesso Protegido à Documentação:** A rota \`/docs\` possui barreira de login para assegurar privacidade e controle institucional aos membros e parceiros.`,
    },
    {
      id: "doc-pixel",
      title: "FéConecta Pixel & Conversions API (CAPI)",
      category: "FéAds",
      categoryTag: "FéAds · Novo",
      status: "atual",
      statusText: "Oficial",
      statusTone: "brand",
      updated_at: "Hoje",
      summary: "Manual completo de mensuração de vendas: Como o Pixel e a Conversions API (CAPI) avisam a Central do FéAds sobre compras, leads, receita gerada e cálculo automático de ROAS.",
      content: `### 1. O que é o FéConecta Pixel?
O **FéConecta Pixel** é a tecnologia oficial de mensuração e atribuição de eventos fora da plataforma FéConecta. Com ele instalado no seu site, loja virtual ou checkout, você rastreia o ciclo comercial completo:

$$\\text{Anúncio no Feed} \\longrightarrow \\text{Clique com UTMs} \\longrightarrow \\text{Página de Vendas} \\longrightarrow \\text{Checkout} \\longrightarrow \\text{Compra (Purchase)} \\longrightarrow \\text{Central FéAds}$$

---

### 2. Como o Pixel Avisa a Central sobre a Venda (Passo a Passo)

1. **No Clique (Passagem de Bastão):**
   Ao clicar no anúncio patrocinado, o link direciona com parâmetros de campanha:
   \`https://sualoja.com.br/produto?fc_cid=CAMP_123&fc_pid=FC-8F72A91&utm_source=feconecta&utm_medium=feads\`

2. **Na Memória do Navegador (Cookie de 30 Dias):**
   O script \`pixel.js\` captura o ID da campanha e salva em um first-party cookie seguro com validade de **30 dias**. Mesmo que o comprador finalize a compra dias depois, a venda é creditada à campanha.

3. **Na Página de Obrigado / Confirmação (Disparo da Venda):**
   Assim que o pagamento é aprovado, a página de obrigado executa:
   \`\`\`javascript
   feconectaPixel.track("Purchase", {
     value: 149.90,        // Valor da compra em Reais
     currency: "BRL",      // Moeda
     order_id: "PED-12345" // ID do pedido
   });
   \`\`\`

4. **Envio Silencioso para a Central:**
   O \`pixel.js\` envia os dados assincronamente via \`navigator.sendBeacon\` para \`POST https://ads.feconecta.com.br/api/events\`.

5. **Gravação Atômica:**
   A API do FéAds grava o evento na tabela \`ad_conversions\` vinculando o ID da campanha, o valor transacionado e o pedido.

6. **Atualização Instantânea no Painel:**
   O painel da campanha atualiza em tempo real:
   * 🎯 **Resultado:** +1 Compra Concluída
   * 💵 **Receita:** +R$ 149,90
   * 💰 **CPA:** Custo por aquisição
   * 📈 **ROAS:** Retorno sobre o investimento

---

### 3. Código de Instalação no Site (<head>)
Cole o código abaixo no cabeçalho (\`<head>\`) de todas as páginas da sua loja ou site:

\`\`\`html
<script
  src="https://ads.feconecta.com.br/pixel.js"
  data-pixel-id="SEU_PIXEL_ID">
</script>
\`\`\`

---

### 4. Conversions API (CAPI — Integração de Servidor / Webhook)
Para plataformas como **Hotmart, Kiwify, Eduzz, Shopify e WooCommerce**, você pode enviar eventos diretamente via backend através de Webhooks sem depender do navegador:

* **Endpoint:** \`POST https://ads.feconecta.com.br/api/events\`
* **Headers:** \`Content-Type: application/json\`
* **Payload:**
\`\`\`json
{
  "pixel_id": "SEU_PIXEL_ID",
  "campaign_id": "ID_DA_CAMPANHA",
  "event_name": "Purchase",
  "value": 149.90,
  "currency": "BRL",
  "order_id": "PED-12345"
}
\`\`\``,
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
