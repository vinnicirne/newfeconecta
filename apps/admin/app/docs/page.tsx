"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FileText, Search, ExternalLink, RefreshCw, X, 
  BookOpen, ShieldCheck, Flame, Music, Bell, 
  Database, Layers, Terminal, Sparkles, ChevronRight,
  Code2, ShoppingCart, UserCheck, ArrowLeft, Lock, Mail, Eye, EyeOff, UserPlus, ArrowRight, Loader2
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

export default function PublicDocsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Login form state (caso usuário não esteja logado)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Docs state
  const [selectedDoc, setSelectedDoc] = useState<DocItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("Todas");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user || null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Preencha todos os campos.");
      return;
    }
    setIsLoggingIn(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setCurrentUser(data.user);
      toast.success("Login realizado com sucesso! Acesso à documentação liberado.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer login.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const isNative = typeof window !== "undefined" && (window as any).Capacitor?.isNativePlatform();
      const redirectUrl = isNative 
        ? "feconecta://login-callback" 
        : `${window.location.origin}/docs`;

      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: "google",
        options: {
          redirectTo: redirectUrl
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Erro ao fazer login com Google.");
      setIsLoggingIn(false);
    }
  };

  const [docs, setDocs] = useState<DocItem[]>([
    {
      id: "doc-feads",
      title: "FéAds — Sistema de Anúncios Patrocinados, Métricas & Cobrança",
      category: "FéAds",
      categoryTag: "FéAds · Atualizado",
      status: "atual",
      statusText: "Oficial",
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
      id: "doc-music",
      title: "FéMusic — Especificação Técnica e Distribuição",
      category: "FéMusic",
      categoryTag: "FéMusic · Atualizado",
      status: "atual",
      statusText: "Oficial",
      statusTone: "brand",
      updated_at: "Hoje",
      summary: "Manual de engenharia do streaming e player de áudio contínuo FéMusic, cache local, fila de reprodução e metadados musicais.",
      content: `### Especificação de Áudio FéMusic
- **Streaming em Borda:** Arquivos de áudio servidos via CDN Supabase Storage com suporte a HTTP Range requests (206 Partial Content).
- **Background Player:** Integração com Capacitor Media Session para controle nativo na central de notificações de iOS e Android.
- **Cache Local:** Pre-buffering de faixas subsequentes para transição gapless entre louvores.`,
    },
    {
      id: "doc-moderacao",
      title: "Diretrizes Comunitárias e Moderação",
      category: "Moderação",
      categoryTag: "Moderação · Atual",
      status: "atual",
      statusText: "Oficial",
      statusTone: "brand",
      updated_at: "Hoje",
      summary: "Critérios comunitários e teológicos para aprovação de anúncios, conteúdos, postagens e interações no FéConecta.",
      content: `### Princípios Editoriais
- **Edificação e Fé:** Conteúdos que promovem a comunhão, a família e os princípios cristãos.
- **Transparência Comercial:** Anúncios patrocinados devem conter links válidos, preços explícitos e identificação clara do anunciante.
- **Segurança Comunitária:** Reprovação imediata de produtos enganosos, práticas fraudulentas ou mensagens de discórdia.`,
    },
  ]);

  const categories = ["Todas", "FéAds", "FéMusic", "Moderação"];

  const filteredDocs = docs.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      activeCategory === "Todas" || doc.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  // ─── GATE DE LOGIN OBRIGATÓRIO PARA DOCUMENTAÇÃO ───
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col justify-center items-center px-4 relative overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10 space-y-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-xl shadow-emerald-500/20">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Documentação FéConecta
            </h1>
            <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
              Área exclusiva para usuários e parceiros cadastrados. Faça login para acessar os manuais técnicos do FéAds e o FéConecta Pixel.
            </p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-6 space-y-5 backdrop-blur-md shadow-2xl">
            {/* Google Login */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full bg-white text-black py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Acessar com o Google</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">ou entre com email</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="seu@email.com"
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1 block">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-white/10 bg-zinc-950 pl-10 pr-10 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50"
              >
                {isLoggingIn ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Entrar e Acessar Documentação</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Cadastro Link */}
          <div className="text-center text-xs text-zinc-500">
            Ainda não tem conta?{" "}
            <Link href="/register" className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5" /> Criar conta gratuita
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── USUÁRIO AUTENTICADO: RENDERIZA DOCUMENTAÇÃO COMPLETA ───
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header Autenticado */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <Link
              href="/campanha"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                Documentação Oficial FéConecta
              </h1>
              <p className="text-xs text-zinc-400">
                Acesso liberado • Usuário: <span className="text-emerald-400 font-semibold">{currentUser?.email}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/campanha"
              className="px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-all shadow-md shadow-emerald-950/20"
            >
              Ir ao Painel FéAds
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8 space-y-6">
        {/* Barra de Busca & Filtros */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar em manuais, regras de cobrança, Pixel..."
              className="w-full rounded-xl border border-white/10 bg-zinc-900/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border",
                  activeCategory === cat
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400 shadow-sm"
                    : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Manuais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              onClick={() => {
                setSelectedDoc(doc);
                setIsModalOpen(true);
              }}
              className="cursor-pointer rounded-2xl border border-white/10 bg-zinc-900/60 p-5 hover:border-emerald-500/40 hover:bg-zinc-900 transition-all space-y-3 group backdrop-blur-md flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                    {doc.categoryTag}
                  </span>
                  <span className="text-[10px] text-zinc-500">{doc.updated_at}</span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors flex items-center justify-between">
                  <span>{doc.title}</span>
                  <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 transition-transform group-hover:translate-x-0.5" />
                </h3>

                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                  {doc.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-zinc-500 font-medium">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" />
                  Manual Completo
                </span>
                <span className="text-emerald-400 font-bold group-hover:underline">
                  Abrir Leitura →
                </span>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* ─── MODAL DE LEITURA DO DOCUMENTO ─── */}
      <DialogPrimitive.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 animate-in fade-in duration-200" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-zinc-900 p-6 rounded-2xl z-50 border border-white/10 shadow-2xl animate-in zoom-in-95 text-white max-h-[85vh] overflow-y-auto space-y-5">
            {selectedDoc && (
              <>
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white">{selectedDoc.title}</h3>
                      <p className="text-xs text-zinc-400">{selectedDoc.categoryTag}</p>
                    </div>
                  </div>
                  <DialogPrimitive.Close className="p-2 rounded-xl text-zinc-400 hover:bg-white/5 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </DialogPrimitive.Close>
                </div>

                <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
                  <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-white/10 space-y-1">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                      Resumo Executivo
                    </span>
                    <p className="text-zinc-300">{selectedDoc.summary}</p>
                  </div>

                  <div className="p-5 bg-zinc-950 rounded-xl border border-white/10 font-mono text-[11px] space-y-2 whitespace-pre-wrap leading-relaxed text-zinc-200">
                    {selectedDoc.content}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-white/10">
                  <DialogPrimitive.Close asChild>
                    <button className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all">
                      Fechar Leitura
                    </button>
                  </DialogPrimitive.Close>
                </div>
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
