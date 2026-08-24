"use client";

import React, { useState } from "react";
import { 
  Music, 
  ShieldAlert, 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  FolderTree, 
  Terminal, 
  Sparkles,
  Layers,
  FileCode,
  Smartphone,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  Search,
  Heart,
  ListMusic,
  Code2,
  BookOpen,
  Settings,
  Flame,
  ExternalLink,
  Copy,
  Check
} from "lucide-react";

export default function MusicTechnicalDocsPage() {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const navItems = [
    {
      group: "Visão Geral",
      items: [
        { id: "overview", label: "Overview" },
        { id: "architecture", label: "Arquitetura & Fluxo" },
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
        { id: "troubleshooting", label: "Troubleshooting & CLI (ADB)" },
      ]
    },
  ];

  return (
    <div className="flex h-screen w-full bg-[#0b1326] text-[#dae2fd] overflow-hidden font-sans antialiased">
      {/* Sidebar de Documentação Estilo Stripe/Capgo */}
      <aside className="w-72 shrink-0 border-r border-[#1e293b]/70 bg-[#090f1e] flex flex-col h-full z-20">
        {/* Logo & Header */}
        <div className="p-5 border-b border-[#1e293b]/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00A884]/20 border border-[#00A884]/40 flex items-center justify-center text-[#00A884]">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                FéMusic <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00A884]/20 text-[#00A884] font-mono border border-[#00A884]/30">v1.8.4</span>
              </div>
              <p className="text-[11px] text-[#8e9ab8]">Docs de Engenharia</p>
            </div>
          </div>
        </div>

        {/* Input de Busca Rápida na Docs */}
        <div className="p-3 border-b border-[#1e293b]/40">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input 
              type="text"
              placeholder="Buscar método, erro, CLI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#131d33] text-xs text-[#cbd5e1] pl-8 pr-3 py-1.5 rounded-lg border border-[#223150] focus:outline-none focus:border-[#00A884] placeholder-[#475569] transition-all"
            />
          </div>
        </div>

        {/* Lista de Navegação Hierárquica */}
        <div className="flex-1 overflow-y-auto p-3 space-y-6 scrollbar-thin scrollbar-thumb-[#1e293b]">
          {navItems.map((group, idx) => (
            <div key={idx}>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#64748b] px-3 mb-2 font-mono">
                {group.group}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSection(item.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                        isActive
                          ? "bg-[#00A884]/15 text-[#00A884] font-semibold border-l-2 border-[#00A884]"
                          : "text-[#94a3b8] hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span>{item.label}</span>
                      {isActive && <ChevronRight className="w-3 h-3 text-[#00A884]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer do Sidebar */}
        <div className="p-4 border-t border-[#1e293b]/60 text-[11px] text-[#64748b] flex items-center justify-between">
          <span>Build 35 • Play Store</span>
          <span className="flex items-center gap-1 text-[#00A884]">
            <span className="w-2 h-2 rounded-full bg-[#00A884] animate-pulse"></span> Produção
          </span>
        </div>
      </aside>

      {/* Conteúdo Central Principal */}
      <main className="flex-1 overflow-y-auto bg-[#0b1326] p-8 lg:p-12 scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* SECTION: OVERVIEW */}
          {(activeSection === "overview" || searchQuery) && (
            <section id="overview" className="space-y-6">
              <div className="border-b border-[#1e293b] pb-6">
                <div className="flex items-center gap-2 text-xs font-mono text-[#00A884] mb-2">
                  <span>DOCUMENTAÇÃO OFICIAL</span> / <span>SISTEMA DE ÁUDIO</span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                  Overview
                </h1>
                <p className="text-base text-[#94a3b8] mt-3 leading-relaxed">
                  O <strong>FéMusic</strong> é o subsistema de streaming e reprodução multimídia de alta resiliência do FéConecta. Ele integra execução de áudio contínua em segundo plano, controles nativos de sistema operacional (Android Media Session) e um motor de catálogo sem limites de cota.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-[#131d33]/60 border border-[#1e293b]">
                  <div className="text-xs font-mono text-[#00A884] font-semibold mb-1">EXECUÇÃO CONTÍNUA</div>
                  <div className="text-lg font-bold text-white mb-2">Foreground Service</div>
                  <p className="text-xs text-[#8e9ab8] leading-relaxed">
                    Mantém o player ativo na Lockscreen e barra de status do Android sem ser suspenso pela gestão de energia.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-[#131d33]/60 border border-[#1e293b]">
                  <div className="text-xs font-mono text-[#38bdf8] font-semibold mb-1">ALTA DISPONIBILIDADE</div>
                  <div className="text-lg font-bold text-white mb-2">Scraper SSR Fallback</div>
                  <p className="text-xs text-[#8e9ab8] leading-relaxed">
                    Resolução de buscas por extração serverless do YouTube sem consumo de cota diária ou erros 429.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-[#131d33]/60 border border-[#1e293b]">
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
            <section id="architecture" className="space-y-6 pt-6 border-t border-[#1e293b]">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Arquitetura & Fluxo Unificado
                </h2>
                <p className="text-sm text-[#94a3b8] mt-2">
                  Diagrama topológico da sincronização entre o estado Zustand, os elementos de áudio e a ponte nativa.
                </p>
              </div>

              {/* Code / Architecture Block */}
              <div className="rounded-xl bg-[#070c18] border border-[#1e293b] p-6 font-mono text-xs overflow-x-auto leading-relaxed text-[#dae2fd]">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#1e293b]/60 text-xs text-[#64748b]">
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
            <section id="capabilities" className="space-y-6 pt-6 border-t border-[#1e293b]">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Core Capabilities
                </h2>
                <p className="text-sm text-[#94a3b8] mt-2">
                  Principais primitivas operacionais fornecidas pelo ecossistema do FéMusic.
                </p>
              </div>

              <ul className="space-y-3 text-sm text-[#cbd5e1]">
                <li className="flex items-start gap-3 p-3 rounded-lg bg-[#131d33]/40 border border-[#1e293b]/50">
                  <code className="text-[#38bdf8] font-mono text-xs px-2 py-0.5 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/20 shrink-0 mt-0.5">setMetadata</code>
                  <span>Envia título, artista, álbum e capa (JPEG HTTPS) para o sistema operacional desenhar a notificação nativa.</span>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-lg bg-[#131d33]/40 border border-[#1e293b]/50">
                  <code className="text-[#38bdf8] font-mono text-xs px-2 py-0.5 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/20 shrink-0 mt-0.5">setPlaybackState</code>
                  <span>Sincroniza os estados <code className="text-xs text-white">playing</code>, <code className="text-xs text-white">paused</code> e <code className="text-xs text-white">none</code> com a Lockscreen do dispositivo.</span>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-lg bg-[#131d33]/40 border border-[#1e293b]/50">
                  <code className="text-[#38bdf8] font-mono text-xs px-2 py-0.5 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/20 shrink-0 mt-0.5">setActionHandler</code>
                  <span>Conecta os botões físicos de fones de ouvido (Bluetooth/cabo) e botões da barra de status ao player.</span>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-lg bg-[#131d33]/40 border border-[#1e293b]/50">
                  <code className="text-[#38bdf8] font-mono text-xs px-2 py-0.5 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/20 shrink-0 mt-0.5">setPositionState</code>
                  <span>Despacha a duração e o timestamp corrente da barra de progresso com throttle inteligente de 1000ms.</span>
                </li>
              </ul>
            </section>
          )}

          {/* SECTION: PUBLIC API REFERENCE */}
          {(activeSection === "public-api" || searchQuery) && (
            <section id="public-api" className="space-y-6 pt-6 border-t border-[#1e293b]">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Public API Reference
                </h2>
                <p className="text-sm text-[#94a3b8] mt-2">
                  Tabela de interfaces e contratos do módulo FéMusic.
                </p>
              </div>

              {/* Tabela de Métodos Estilo Documentação de Grande Porte */}
              <div className="overflow-x-auto rounded-xl border border-[#1e293b] bg-[#090f1e]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#131d33]/80 border-b border-[#1e293b] text-[#94a3b8] font-mono uppercase">
                    <tr>
                      <th className="py-3 px-4">Método / Função</th>
                      <th className="py-3 px-4">Parâmetros</th>
                      <th className="py-3 px-4">Retorno</th>
                      <th className="py-3 px-4">Descrição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e293b]/60 text-[#cbd5e1]">
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#00A884]">playTrack(track, queue?)</td>
                      <td className="py-3 px-4 font-mono text-[#94a3b8]">track: MusicTrack, queue?: MusicTrack[]</td>
                      <td className="py-3 px-4 font-mono text-[#38bdf8]">void</td>
                      <td className="py-3 px-4">Define a faixa atual, atualiza a fila e inicia o crossfade no player ativo.</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#00A884]">toggleLike(track)</td>
                      <td className="py-3 px-4 font-mono text-[#94a3b8]">track: MusicTrack</td>
                      <td className="py-3 px-4 font-mono text-[#38bdf8]">Promise&lt;void&gt;</td>
                      <td className="py-3 px-4">Favorita/desfavorita com normalização de ID e sincroniza com o Supabase.</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#00A884]">search(query, limit)</td>
                      <td className="py-3 px-4 font-mono text-[#94a3b8]">query: string, limit?: number</td>
                      <td className="py-3 px-4 font-mono text-[#38bdf8]">Promise&lt;MusicTrack[]&gt;</td>
                      <td className="py-3 px-4">Busca resiliente no YouTubeService com rotação de API e fallback SSR.</td>
                    </tr>
                    <tr className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#00A884]">GET /api/music/search</td>
                      <td className="py-3 px-4 font-mono text-[#94a3b8]">?q=termo&limit=20</td>
                      <td className="py-3 px-4 font-mono text-[#38bdf8]">JSON &#123; results: [] &#125;</td>
                      <td className="py-3 px-4">Endpoint serverless para extração de metadados sem autenticação/cota.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* SECTION: POST-MORTEM & BUG HISTORY */}
          {(activeSection === "postmortem" || searchQuery) && (
            <section id="postmortem" className="space-y-6 pt-6 border-t border-[#1e293b]">
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
                  <div key={idx} className="p-5 rounded-xl bg-[#090f1e] border border-[#1e293b] space-y-3">
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
                    <div className="p-3 rounded-lg bg-[#00A884]/10 border border-[#00A884]/20 text-xs text-[#5eead4]">
                      <strong>Correção de Engenharia:</strong> {item.resolution}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION: REGRAS DE OURO */}
          {(activeSection === "rules" || searchQuery) && (
            <section id="rules" className="space-y-6 pt-6 border-t border-[#1e293b]">
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
                  <div key={idx} className="p-4 rounded-xl bg-[#131d33]/50 border border-[#1e293b]">
                    <h4 className="text-xs font-bold text-white mb-1.5">{item.rule}</h4>
                    <p className="text-xs text-[#8e9ab8] leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION: TROUBLESHOOTING & CLI */}
          {(activeSection === "troubleshooting" || searchQuery) && (
            <section id="troubleshooting" className="space-y-6 pt-6 border-t border-[#1e293b]">
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
                  <div key={item.id} className="rounded-xl bg-[#070c18] border border-[#1e293b] overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-[#131d33]/60 border-b border-[#1e293b] text-xs">
                      <span className="font-semibold text-white">{item.label}</span>
                      <button
                        onClick={() => copyToClipboard(item.cmd, item.id)}
                        className="flex items-center gap-1 text-[11px] font-mono text-[#94a3b8] hover:text-white transition-colors"
                      >
                        {copiedCode === item.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#00A884]" />
                            <span className="text-[#00A884]">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-4 font-mono text-xs text-[#38bdf8] overflow-x-auto">
                      {item.cmd}
                    </div>
                    <div className="px-4 py-2 bg-[#0b1326] border-t border-[#1e293b]/40 text-[11px] text-[#64748b]">
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
  );
}
