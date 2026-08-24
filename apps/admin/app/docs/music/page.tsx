"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Music, 
  ShieldAlert, 
  Cpu, 
  CheckCircle2, 
  FolderTree, 
  Terminal, 
  Sparkles,
  Layers,
  FileCode,
  Smartphone,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Search,
  BookOpen,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  Github,
  Globe,
  Radio,
  Sliders,
  CheckCircle,
  Menu,
  X,
  Lock,
  LogOut,
  User,
  ShieldCheck,
  Sun,
  Moon
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function StandaloneMusicDocsPage() {
  const router = useRouter();
  
  // Auth state
  const [session, setSession] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  
  // Theme and filter states
  const [themeMode, setThemeMode] = useState<"dark" | "nord">("dark");
  const [activeTheme, setActiveTheme] = useState<string>("all"); // "all" | "core" | "api" | "postmortem" | "cli"
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  
  // Estado de grupos expansíveis / retráteis (Accordion estilo Capgo)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Visão Geral & Core": true,
    "API & Integração": true,
    "Engenharia & Soluções": true,
    "CLI & Suporte": true,
  });

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Authentication check
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.replace("/login?redirect=/docs/music");
          return;
        }
        setSession(session);
        setUserEmail(session.user?.email || "admin@feconecta.com");
      } catch (err) {
        router.replace("/login?redirect=/docs/music");
      } finally {
        setLoadingAuth(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace("/login?redirect=/docs/music");
      } else {
        setSession(session);
        setUserEmail(session.user?.email || "admin@feconecta.com");
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Grupos e Itens de Navegação
  const navItems = [
    {
      group: "Visão Geral & Core",
      items: [
        { id: "overview", label: "Overview do Sistema" },
        { id: "architecture", label: "Arquitetura Unificada" },
        { id: "capabilities", label: "Core Capabilities" },
      ]
    },
    {
      group: "API & Integração",
      items: [
        { id: "public-api", label: "Public API Reference" },
        { id: "mediasession", label: "Media Session Nativa" },
        { id: "scraper-engine", label: "Search Engine (Scraper SSR)" },
        { id: "store-sync", label: "State & Supabase Sync" },
      ]
    },
    {
      group: "Engenharia & Soluções",
      items: [
        { id: "postmortem", label: "Post-Mortem & Bug History" },
        { id: "rules", label: "Regras de Ouro (Invioláveis)" },
      ]
    },
    {
      group: "CLI & Suporte",
      items: [
        { id: "troubleshooting", label: "Troubleshooting & ADB" },
      ]
    },
  ];

  const filteredNavItems = navItems;

  if (loadingAuth) {
    return (
      <div className="min-h-screen w-full bg-[#0b1326] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#00A884]/20 border border-[#00A884]/40 flex items-center justify-center text-[#00A884] animate-pulse">
          <Lock className="w-6 h-6" />
        </div>
        <div className="text-sm font-mono text-[#94a3b8] flex items-center gap-2">
          <span>Verificando credenciais de acesso seguro...</span>
        </div>
      </div>
    );
  }

  const isNord = themeMode === "nord";
  const bgMain = isNord ? "bg-[#1e293b]" : "bg-[#0b1326]";
  const bgSidebar = isNord ? "bg-[#0f172a]" : "bg-[#090f1e]";
  const bgCard = isNord ? "bg-[#334155]/60" : "bg-[#131d33]/60";
  const borderCol = isNord ? "border-[#475569]" : "border-[#1e293b]";

  return (
    <div className={`min-h-screen w-full ${bgMain} text-[#dae2fd] font-sans antialiased flex flex-col selection:bg-[#00A884]/30 selection:text-white`}>
      {/* Top Navbar Independente e Protegida */}
      <header className={`h-16 w-full border-b ${borderCol} ${bgSidebar}/95 backdrop-blur-xl px-6 lg:px-10 flex items-center justify-between sticky top-0 z-50`}>
        <div className="flex items-center gap-6">
          <Link href="/admin" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00A884] to-[#007a5f] flex items-center justify-center text-black shadow-[0_0_15px_rgba(0,168,132,0.4)] group-hover:scale-105 transition-transform">
              <Music className="w-5 h-5 fill-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-wide text-base">FéMusic</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00A884]/15 text-[#00A884] border border-[#00A884]/30 font-semibold">Docs Portal</span>
              </div>
            </div>
          </Link>

          <span className="text-gray-600 hidden md:inline">/</span>

          <div className="hidden md:flex items-center gap-2 text-xs font-medium text-[#94a3b8]">
            <span className="flex items-center gap-1 text-[#00A884] font-mono">
              <ShieldCheck className="w-3.5 h-3.5" /> Sessão Autenticada
            </span>
            <span>•</span>
            <span className="text-[#38bdf8] font-mono">v1.8.4 (Build 35)</span>
          </div>
        </div>

        {/* Right Actions & User Info */}
        <div className="flex items-center gap-3">
          {/* Theme Mode Toggle */}
          <button
            onClick={() => setThemeMode(themeMode === "dark" ? "nord" : "dark")}
            className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 transition-all text-xs flex items-center gap-1.5"
            title="Alternar Tema Visual (Dark / Nord)"
          >
            {isNord ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#38bdf8]" />}
          </button>

          {/* User Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-gray-300">
            <User className="w-3.5 h-3.5 text-[#00A884]" />
            <span className="max-w-[140px] truncate">{userEmail}</span>
          </div>

          <Link
            href="/admin"
            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Admin
          </Link>

          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 transition-all text-xs flex items-center gap-1"
            title="Sair da Conta"
          >
            <LogOut className="w-4 h-4" />
          </button>

          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-white/5 text-gray-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Layout de 2 Colunas */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Esquerda */}
        <aside className={`w-72 shrink-0 border-r ${borderCol} ${bgSidebar} flex flex-col h-[calc(100vh-64px)] sticky top-16 z-30 transition-all ${
          mobileMenuOpen ? "fixed inset-y-16 left-0 w-72" : "hidden lg:flex"
        }`}>
          {/* Busca na Documentação */}
          <div className={`p-4 border-b ${borderCol}`}>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
              <input 
                type="text"
                placeholder="Filtrar APIs, erros, ADB..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#131d33] text-xs text-[#cbd5e1] pl-8 pr-3 py-2 rounded-lg border border-[#223150] focus:outline-none focus:border-[#00A884] placeholder-[#475569] transition-all"
              />
            </div>
          </div>

          {/* Menus Filtrados por Tema com Accordion Estilo Capgo */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-[#1e293b]">
            {filteredNavItems.map((group, idx) => {
              const isExpanded = expandedGroups[group.group] !== false;
              return (
                <div key={idx} className="rounded-xl overflow-hidden border border-white/5 bg-white/[0.02]">
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleGroup(group.group)}
                    className="w-full px-3 py-2.5 flex items-center justify-between text-left text-[12px] font-bold text-white hover:bg-white/5 transition-colors group"
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00A884]"></span>
                      <span className="tracking-wide">{group.group}</span>
                    </span>
                    <span className="p-1 rounded-md text-[#64748b] group-hover:text-white transition-colors">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </span>
                  </button>

                  {/* Accordion Body (Sub-itens) */}
                  {isExpanded && (
                    <div className="p-1.5 pt-0 space-y-0.5 border-t border-white/[0.04]">
                      {group.items.map((item) => {
                        const isActive = activeSection === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActiveSection(item.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full text-left pl-6 pr-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                              isActive
                                ? "bg-[#00A884]/15 text-[#00A884] font-semibold border-l-2 border-[#00A884]"
                                : "text-[#94a3b8] hover:text-white hover:bg-white/5"
                            }`}
                          >
                            <span>{item.label}</span>
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#00A884]"></span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Status do App */}
          <div className={`p-4 border-t ${borderCol} text-[11px] text-[#64748b] flex items-center justify-between bg-[#070c18]`}>
            <span className="font-mono">Google Play Ready</span>
            <span className="flex items-center gap-1 text-[#00A884]">
              <span className="w-2 h-2 rounded-full bg-[#00A884] animate-pulse"></span> v1.8.4
            </span>
          </div>
        </aside>

        {/* Conteúdo Central Scrollável */}
        <main className={`flex-1 overflow-y-auto ${bgMain} p-6 lg:p-14 scroll-smooth`}>
          <div className="max-w-4xl mx-auto space-y-14">
            
            {/* SECTION: OVERVIEW */}
            {(activeSection === "overview" || searchQuery) && (
              <section id="overview" className="space-y-6">
                <div className={`border-b ${borderCol} pb-6`}>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#00A884] mb-2">
                    <span>FÉCONECTA CORE ARCHITECTURE</span> / <span>AUDIO ENGINE</span>
                  </div>
                  <h1 className="text-3xl lg:text-5xl font-bold text-white tracking-tight">
                    Overview do Sistema
                  </h1>
                  <p className="text-base text-[#94a3b8] mt-3 leading-relaxed">
                    O <strong>FéMusic</strong> é o subsistema de streaming e reprodução multimídia de alta resiliência do FéConecta. Ele integra execução de áudio contínua em segundo plano, controles nativos de sistema operacional (Android Media Session) e um motor de catálogo sem limites de cota.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-5 rounded-2xl ${bgCard} border ${borderCol} shadow-lg`}>
                    <div className="text-xs font-mono text-[#00A884] font-semibold mb-1">EXECUÇÃO CONTÍNUA</div>
                    <div className="text-lg font-bold text-white mb-2">Foreground Service</div>
                    <p className="text-xs text-[#8e9ab8] leading-relaxed">
                      Mantém o player ativo na Lockscreen e barra de status do Android sem ser suspenso pela gestão de energia.
                    </p>
                  </div>

                  <div className={`p-5 rounded-2xl ${bgCard} border ${borderCol} shadow-lg`}>
                    <div className="text-xs font-mono text-[#38bdf8] font-semibold mb-1">ALTA DISPONIBILIDADE</div>
                    <div className="text-lg font-bold text-white mb-2">Scraper SSR Fallback</div>
                    <p className="text-xs text-[#8e9ab8] leading-relaxed">
                      Resolução de buscas por extração serverless do YouTube sem consumo de cota diária ou erros 429.
                    </p>
                  </div>

                  <div className={`p-5 rounded-2xl ${bgCard} border ${borderCol} shadow-lg`}>
                    <div className="text-xs font-mono text-[#a855f7] font-semibold mb-1">TRANSIÇÃO SUAVE</div>
                    <div className="text-lg font-bold text-white mb-2">Dual HTML5 Audio</div>
                    <p className="text-xs text-[#8e9ab8] leading-relaxed">
                      Dois players desacoplados que executam crossfade orgânico entre faixas sem estalos de buffer.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* SECTION: ARCHITECTURE */}
            {(activeSection === "architecture" || searchQuery) && (
              <section id="architecture" className={`space-y-6 pt-6 border-t ${borderCol}`}>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Arquitetura & Fluxo Unificado
                  </h2>
                  <p className="text-sm text-[#94a3b8] mt-2">
                    Diagrama topológico da sincronização entre o estado Zustand, os elementos de áudio e a ponte nativa.
                  </p>
                </div>

                <div className={`rounded-2xl bg-[#070c18] border ${borderCol} p-6 font-mono text-xs overflow-x-auto leading-relaxed text-[#dae2fd] shadow-2xl`}>
                  <div className={`flex items-center justify-between pb-3 mb-4 border-b ${borderCol} text-xs text-[#64748b]`}>
                    <span>DIAGRAMA DE SINCRONIZAÇÃO EM TEMPO REAL</span>
                    <span className="text-[#00A884]">ZUSTAND ➔ CAPACITOR ➔ ANDROID OS</span>
                  </div>
                  {`[ Usuário clica Play no Feed / Biblioteca / Busca ]
                           │
                           ▼
          ┌───────────────────────────────────┐
          │     usePlayerStore (Zustand)      │ ──▶ [ LocalStorage & Supabase music_likes ]
          │  Estado Central (Fila, Faixa, FX) │
          └─────────────────┬─────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
  ┌───────────────────┐           ┌───────────────────┐
  │HiddenAudioElements│           │  useMediaSession  │
  │ Player A & B HTML5│           │  Ponte com o SO   │
  │(Crossfade Suave)  │           │(Capacitor Bridge) │
  └─────────┬─────────┘           └─────────┬─────────┘
            │                               │
            ▼                               ▼
   [ Saída de Áudio Física ]      [ MediaSessionService.java ]
   [ (Sem Remote Playback) ]                │
                                            ▼
                                  [ Notification Drawer & Lockscreen ]
                                  [ (Play, Pause, Next, Prev, Artwork) ]`}
                </div>
              </section>
            )}

            {/* SECTION: CORE CAPABILITIES */}
            {(activeSection === "capabilities" || searchQuery) && (
              <section id="capabilities" className={`space-y-6 pt-6 border-t ${borderCol}`}>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Core Capabilities
                  </h2>
                  <p className="text-sm text-[#94a3b8] mt-2">
                    Principais primitivas operacionais fornecidas pelo ecossistema do FéMusic.
                  </p>
                </div>

                <ul className="space-y-3 text-sm text-[#cbd5e1]">
                  <li className={`flex items-start gap-3 p-4 rounded-xl ${bgCard} border ${borderCol}`}>
                    <code className="text-[#38bdf8] font-mono text-xs px-2 py-1 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/20 shrink-0 mt-0.5">setMetadata</code>
                    <span>Envia título, artista, álbum e capa (JPEG HTTPS) para o sistema operacional desenhar a notificação nativa.</span>
                  </li>
                  <li className={`flex items-start gap-3 p-4 rounded-xl ${bgCard} border ${borderCol}`}>
                    <code className="text-[#38bdf8] font-mono text-xs px-2 py-1 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/20 shrink-0 mt-0.5">setPlaybackState</code>
                    <span>Sincroniza os estados <code className="text-xs text-white">playing</code>, <code className="text-xs text-white">paused</code> e <code className="text-xs text-white">none</code> com a Lockscreen do dispositivo.</span>
                  </li>
                  <li className={`flex items-start gap-3 p-4 rounded-xl ${bgCard} border ${borderCol}`}>
                    <code className="text-[#38bdf8] font-mono text-xs px-2 py-1 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/20 shrink-0 mt-0.5">setActionHandler</code>
                    <span>Conecta os botões físicos de fones de ouvido (Bluetooth/cabo) e botões da barra de status ao player.</span>
                  </li>
                  <li className={`flex items-start gap-3 p-4 rounded-xl ${bgCard} border ${borderCol}`}>
                    <code className="text-[#38bdf8] font-mono text-xs px-2 py-1 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/20 shrink-0 mt-0.5">setPositionState</code>
                    <span>Despacha a duração e o timestamp corrente da barra de progresso com throttle inteligente de 1000ms.</span>
                  </li>
                </ul>
              </section>
            )}

            {/* SECTION: PUBLIC API REFERENCE */}
            {(activeSection === "public-api" || searchQuery) && (
              <section id="public-api" className={`space-y-8 pt-6 border-t ${borderCol}`}>
                <div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#00A884] mb-1">
                    <span>REST API V1</span> / <span>INTEGRAÇÃO COM TERCEIROS</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">
                    Public API Reference (Terceiros & Apps Externos)
                  </h2>
                  <p className="text-sm text-[#94a3b8] mt-2 leading-relaxed">
                    Endpoints REST públicos com suporte nativo a <strong>CORS (*), Embed HTML5 e metadados completos</strong> para você integrar o catálogo e reprodução do FéMusic em aplicativos parceiros, bots, sites ou sistemas externos.
                  </p>
                </div>

                {/* Tabela de Endpoints REST */}
                <div className={`overflow-x-auto rounded-2xl border ${borderCol} bg-[#090f1e] shadow-xl`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`bg-[#131d33]/80 border-b ${borderCol} text-[#94a3b8] font-mono uppercase`}>
                      <tr>
                        <th className="py-3.5 px-4">Método & Rota</th>
                        <th className="py-3.5 px-4">Parâmetros</th>
                        <th className="py-3.5 px-4">Retorno</th>
                        <th className="py-3.5 px-4">Uso / Descrição</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${borderCol} text-[#cbd5e1]`}>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#38bdf8]">
                          <span className="px-1.5 py-0.5 rounded bg-[#38bdf8]/15 text-[#38bdf8] mr-2">GET</span>
                          /api/v1/femusic/search
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#94a3b8]">?q=termo&limit=20</td>
                        <td className="py-3.5 px-4 font-mono text-[#00A884]">JSON &#123; results: [] &#125;</td>
                        <td className="py-3.5 px-4">Busca universal de músicas e louvores em tempo real com stream e embed.</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#38bdf8]">
                          <span className="px-1.5 py-0.5 rounded bg-[#38bdf8]/15 text-[#38bdf8] mr-2">GET</span>
                          /api/v1/femusic/sessions
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#94a3b8]">?id=adoracao-30 (opcional)</td>
                        <td className="py-3.5 px-4 font-mono text-[#00A884]">JSON &#123; sessions: [] &#125;</td>
                        <td className="py-3.5 px-4">Retorna as playlists e sessões curadas de oração, louvor e devocionais.</td>
                      </tr>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#38bdf8]">
                          <span className="px-1.5 py-0.5 rounded bg-[#38bdf8]/15 text-[#38bdf8] mr-2">GET</span>
                          /api/v1/femusic/track
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#94a3b8]">?id=VIDEO_ID</td>
                        <td className="py-3.5 px-4 font-mono text-[#00A884]">JSON &#123; id, artwork, urls &#125;</td>
                        <td className="py-3.5 px-4">Resolve metadados, capas HD e URLs de player prontas para incorporação.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Exemplo Prático de Consumo */}
                <div className="rounded-2xl bg-[#070c18] border border-[#1e293b] overflow-hidden">
                  <div className="px-4 py-3 bg-[#131d33]/60 border-b border-[#1e293b] flex items-center justify-between text-xs">
                    <span className="font-semibold text-white flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5 text-[#38bdf8]" />
                      Exemplo de Chamada Externa (cURL / Fetch / Axios)
                    </span>
                    <button
                      onClick={() => copyToClipboard('curl "https://newfeconecta.vercel.app/api/v1/femusic/search?q=Gabriela+Rocha&limit=5"', 'api-curl')}
                      className="flex items-center gap-1 text-[11px] font-mono text-[#94a3b8] hover:text-white transition-colors"
                    >
                      {copiedCode === 'api-curl' ? <Check className="w-3.5 h-3.5 text-[#00A884]" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copiar cURL</span>
                    </button>
                  </div>
                  <div className="p-4 font-mono text-xs text-[#38bdf8] overflow-x-auto select-all">
                    curl &quot;https://newfeconecta.vercel.app/api/v1/femusic/search?q=Gabriela+Rocha&amp;limit=5&quot;
                  </div>
                  <div className="p-4 bg-[#090f1e] border-t border-[#1e293b]/40 font-mono text-[11px] text-[#94a3b8] space-y-1">
                    <div className="text-white font-bold text-xs mb-1">Exemplo de Payload de Resposta (200 OK):</div>
                    <pre className="text-[#a5b4fc] overflow-x-auto text-[11px] leading-relaxed">
{`{
  "status": "success",
  "query": "Gabriela Rocha",
  "total": 5,
  "results": [
    {
      "id": "abc123xyz",
      "providerTrackId": "abc123xyz",
      "title": "Lugar Secreto - Gabriela Rocha (Ao Vivo)",
      "artist": "Gabriela Rocha",
      "duration": 284,
      "durationFormatted": "4:44",
      "coverUrl": "https://i.ytimg.com/vi/abc123xyz/hqdefault.jpg",
      "embedUrl": "https://www.youtube-nocookie.com/embed/abc123xyz?autoplay=1",
      "source": "youtube"
    }
  ]
}`}
                    </pre>
                  </div>
                </div>
              </section>
            )}

            {/* SECTION: POST-MORTEM & BUG HISTORY */}
            {(activeSection === "postmortem" || searchQuery) && (
              <section id="postmortem" className={`space-y-6 pt-6 border-t ${borderCol}`}>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <ShieldAlert className="w-6 h-6 text-amber-500" />
                    Post-Mortem & Bug History
                  </h2>
                  <p className="text-sm text-[#94a3b8] mt-2">
                    Registro histórico de falhas críticas resolvidas e suas causas raízes no ambiente Android/Capacitor.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      code: "ERR_FOREGROUND_BOOT_RACE",
                      title: "1. Notificação nunca aparecia no Boot (Race Condition de Threads)",
                      cause: "No plugin Java, o MediaSessionService era instanciado apenas após o primeiro setPlaybackState('playing'). O método bindService() é assíncrono, descartando a notificação.",
                      resolution: "Configuração obrigatória de foregroundService: 'always' no capacitor.config.ts + declaração do serviço no AndroidManifest.xml.",
                      level: "CRITICAL"
                    },
                    {
                      code: "ERR_CALLBACK_ID_DANGLING",
                      title: "2. Botões sumiam na Lockscreen ao navegar entre telas",
                      cause: "Navegações no Next.js faziam o Capacitor cancelar promises antigas. Travas com useRef impediam o re-registro dos botões no Java nativo.",
                      resolution: "Remoção de referências estáticas. Handlers são re-registrados a cada montagem do hook useMediaSession.",
                      level: "CRITICAL"
                    },
                    {
                      code: "ERR_IO_ARTWORK_BITMAP",
                      title: "3. Abort silencioso no setMetadata por formato de capa",
                      cause: "O plugin Java tentava fazer download síncrono da imagem. URLs WebP ou DataURIs quebravam o decoder com IOException não tratada.",
                      resolution: "Garantia de URL única em formato JPEG via HTTPS e isolamento do bloco de setMetadata.",
                      level: "HIGH"
                    },
                    {
                      code: "ERR_YOUTUBE_429_QUOTA",
                      title: "4. Buscas retornando vazias por estouro da cota diária",
                      cause: "A cota gratuita da API YouTube v3 (100 buscas/dia) atingia limite de cota 429.",
                      resolution: "Criação do endpoint SSR /api/music/search com extração serverless em tempo real.",
                      level: "CRITICAL"
                    },
                    {
                      code: "ERR_LIKES_ID_MISMATCH",
                      title: "5. Inconsistência ao favoritar músicas e botão de Like",
                      cause: "IDs de faixas alternavam entre track.id e track.providerTrackId nos retornos da API.",
                      resolution: "Normalização do identificador para (t.providerTrackId || t.id) === currentId no store e Supabase.",
                      level: "MEDIUM"
                    },
                  ].map((item, idx) => (
                    <div key={idx} className={`p-5 rounded-2xl bg-[#090f1e] border ${borderCol} space-y-3 shadow-md`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[#00A884] font-bold">{item.code}</span>
                          <span className="text-white font-semibold text-sm">{item.title}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          item.level === "CRITICAL" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                          item.level === "HIGH" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                          "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        }`}>
                          {item.level}
                        </span>
                      </div>
                      <p className="text-xs text-[#94a3b8] leading-relaxed">
                        <strong className="text-white">Causa Raiz:</strong> {item.cause}
                      </p>
                      <div className="p-3 rounded-xl bg-[#00A884]/10 border border-[#00A884]/20 text-xs text-[#5eead4]">
                        <strong>Correção de Engenharia:</strong> {item.resolution}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION: REGRAS DE OURO */}
            {(activeSection === "rules" || searchQuery) && (
              <section id="rules" className={`space-y-6 pt-6 border-t ${borderCol}`}>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-[#00A884]" />
                    Regras de Ouro (Invioláveis)
                  </h2>
                  <p className="text-sm text-[#94a3b8] mt-2">
                    Diretrizes arquiteturais que impedem quebras de compatibilidade em produção.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      rule: "1. Nunca remova disableRemotePlayback das tags <audio>",
                      desc: "Evita que a WebView do Android instancie uma MediaSession web paralela que conflita com o serviço Java nativo."
                    },
                    {
                      rule: "2. Sempre normalize identificadores com (providerTrackId || id)",
                      desc: "Garante integridade entre buscas, playlists estáticas, histórico e tabela de curtidas do Supabase."
                    },
                    {
                      rule: "3. Nunca use history.pushState ao expandir o FullscreenPlayer",
                      desc: "Alterar o histórico de rotas da WebView no Android reseta o foco de áudio e destrói a notificação."
                    },
                    {
                      rule: "4. Mantenha o fallback /api/music/search sempre ativo",
                      desc: "Protege o catálogo contra esgotamento de chaves ou bloqueios de rede externos."
                    },
                  ].map((item, idx) => (
                    <div key={idx} className={`p-5 rounded-2xl ${bgCard} border ${borderCol} shadow-md`}>
                      <h4 className="text-xs font-bold text-white mb-2">{item.rule}</h4>
                      <p className="text-xs text-[#8e9ab8] leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION: TROUBLESHOOTING & CLI */}
            {(activeSection === "troubleshooting" || searchQuery) && (
              <section id="troubleshooting" className={`space-y-6 pt-6 border-t ${borderCol}`}>
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <Terminal className="w-6 h-6 text-[#38bdf8]" />
                    Troubleshooting & CLI (Procedimentos ADB)
                  </h2>
                  <p className="text-sm text-[#94a3b8] mt-2">
                    Comandos de terminal para depuração em tempo real no dispositivo Android conectado.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    {
                      id: "cmd1",
                      label: "1. Testar Scraper SSR Serverless Localmente",
                      cmd: 'curl "http://localhost:3000/api/music/search?q=gospel&limit=5"',
                      help: "Deve retornar JSON com status 200 contendo a lista de faixas extraídas com sucesso."
                    },
                    {
                      id: "cmd2",
                      label: "2. Filtrar Logs de MediaSession via ADB Logcat",
                      cmd: 'adb logcat -d | findstr /i "MediaSession [MS] AudioTrack"',
                      help: "Procure por '[MS] Handlers OK' e '[MS] PlaybackState OK'. Se houver IOException, a capa da faixa está com erro."
                    },
                    {
                      id: "cmd3",
                      label: "3. Inspecionar se o Serviço Java está Ativo no Android",
                      cmd: 'adb shell dumpsys activity services | findstr "MediaSessionService"',
                      help: "Confirma se o Foreground Service nativo está vinculado e com prioridade de execução."
                    },
                    {
                      id: "cmd4",
                      label: "4. Compilar Pacote AAB de Produção (Play Store)",
                      cmd: 'cd apps/admin; npx cap sync android; cd android; .\\gradlew bundleRelease',
                      help: "Gera o arquivo assinado em: android/app/build/outputs/bundle/release/app-release.aab"
                    },
                  ].map((item) => (
                    <div key={item.id} className={`rounded-2xl bg-[#070c18] border ${borderCol} overflow-hidden shadow-lg`}>
                      <div className={`flex items-center justify-between px-4 py-3 bg-[#131d33]/60 border-b ${borderCol} text-xs`}>
                        <span className="font-semibold text-white">{item.label}</span>
                        <button
                          onClick={() => copyToClipboard(item.cmd, item.id)}
                          className="flex items-center gap-1.5 text-[11px] font-mono text-[#94a3b8] hover:text-white px-2.5 py-1 rounded bg-white/5 border border-white/10 transition-colors"
                        >
                          {copiedCode === item.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#00A884]" />
                              <span className="text-[#00A884] font-bold">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                      <div className="p-4 font-mono text-xs text-[#38bdf8] overflow-x-auto select-all">
                        {item.cmd}
                      </div>
                      <div className={`px-4 py-2.5 bg-[#0b1326] border-t ${borderCol} text-[11px] text-[#64748b]`}>
                        {item.help}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
