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
  AlertTriangle
} from "lucide-react";

export default function MusicTechnicalDocsPage() {
  const [activeTab, setActiveTab] = useState<"architecture" | "postmortem" | "rules" | "diagnostics">("architecture");
  const [expandedSection, setExpandedSection] = useState<string | null>("flow");

  const toggleSection = (id: string) => {
    setExpandedSection(expandedSection === id ? null : id);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-whatsapp-dark p-6 lg:p-10">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-whatsapp-green/20 flex items-center justify-center text-whatsapp-green">
            <Music className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl lg:text-3xl font-bold font-jakarta text-gray-900 dark:text-white">
                Documentação Técnica: FéMusic
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-whatsapp-green/20 text-whatsapp-green border border-whatsapp-green/30">
                Admin Only
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Engenharia do sistema de áudio, integração com Media Session nativo (Android/Capacitor) e manual de manutenção.
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-white/10 mt-6 pb-2 overflow-x-auto">
          {[
            { id: "architecture", label: "Arquitetura & Fluxo", icon: Cpu },
            { id: "postmortem", label: "Causas Raízes & Bugs Históricos", icon: ShieldAlert },
            { id: "rules", label: "Regras de Ouro (Prevenção)", icon: Sparkles },
            { id: "diagnostics", label: "Procedimento de Suporte (ADB)", icon: Terminal },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-whatsapp-green text-whatsapp-dark shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/5"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* TAB 1: ARQUITETURA */}
        {activeTab === "architecture" && (
          <div className="space-y-6">
            {/* Visão Geral */}
            <div className="bg-white dark:bg-whatsapp-darkLighter border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold font-jakarta text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-whatsapp-green" />
                Como Funciona a Arquitetura Unificada
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                O FéMusic opera com um modelo de <strong>camada dupla de execução</strong>. O áudio fisicamente toca em elementos HTML5 invisíveis dentro da WebView, enquanto um <strong>Foreground Service nativo em Java</strong> mantém o sistema Android ciente da reprodução para gerar a notificação na tela de bloqueio e barra de status.
              </p>

              {/* Diagrama Textual */}
              <div className="bg-gray-900 text-gray-100 p-5 rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-gray-800">
                <div className="text-whatsapp-green font-bold mb-2"># FLUXO DE SINCRONIZAÇÃO DO PLAYER</div>
                {`[ Usuário clica Play ] 
        │
        ▼
[ usePlayerStore (Zustand) ] ── (Atualiza Faixa, Status isPlaying, Fila)
        │
        ├──▶ [ HiddenAudioElements.tsx ] 
        │         ├── Player A (<audio disableRemotePlayback>)
        │         └── Player B (<audio disableRemotePlayback>)  <-- Crossfade Suave
        │
        └──▶ [ useMediaSession.ts ] 
                  │
                  ├── Se WEB: navigator.mediaSession (PWA / Chrome Desktop)
                  │
                  └── Se ANDROID: @jofr/capacitor-media-session
                            │
                            ▼
                  [ MediaSessionService.java (Foreground Service) ]
                            │
                            ▼
                  [ Notificação do Android & Controles da Lockscreen ]`}
              </div>
            </div>

            {/* Mapeamento de Arquivos */}
            <div className="bg-white dark:bg-whatsapp-darkLighter border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold font-jakarta text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FolderTree className="w-5 h-5 text-whatsapp-green" />
                Mapeamento dos Arquivos do Módulo
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    path: "apps/admin/modules/femusic/presentation/player/hooks/useMediaSession.ts",
                    desc: "Sincroniza metadados (título, artista, capa) e estado de reprodução (playing/paused) com o SO.",
                    role: "Ponte SO Nativa"
                  },
                  {
                    path: "apps/admin/modules/femusic/presentation/player/components/HiddenAudioElements.tsx",
                    desc: "Dois elementos <audio> com disableRemotePlayback para crossfade sem interrupção.",
                    role: "Saída de Áudio"
                  },
                  {
                    path: "apps/admin/modules/femusic/infrastructure/state/usePlayerStore.ts",
                    desc: "Gerenciamento de estado global com Zustand: fila, faixa atual, volume, progresso.",
                    role: "Store Central"
                  },
                  {
                    path: "apps/admin/modules/femusic/presentation/player/GlobalYouTubePlayer.tsx",
                    desc: "Componente orquestrador global montado no app/layout.tsx.",
                    role: "Orquestrador Global"
                  },
                ].map((file, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-whatsapp-green uppercase tracking-wider">{file.role}</span>
                      <FileCode className="w-4 h-4 text-gray-400" />
                    </div>
                    <code className="text-xs font-mono text-gray-800 dark:text-gray-200 break-all block mb-2">{file.path}</code>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{file.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: POST-MORTEM & BUGS HISTÓRICOS */}
        {activeTab === "postmortem" && (
          <div className="space-y-4">
            {[
              {
                id: "bug1",
                title: "1. Notificação nunca aparece (Race Condition no Boot)",
                severity: "Crítico",
                cause: "No plugin nativo Java, o MediaSessionService por padrão só era criado após o primeiro setPlaybackState('playing'). Como bindService() é assíncrono, os metadados chegavam antes do serviço existir e o Android descartava a notificação.",
                fix: "Ativação obrigatória de foregroundService: 'always' em capacitor.config.ts + declaração explícita do serviço no AndroidManifest.xml.",
                status: "Resolvido"
              },
              {
                id: "bug2",
                title: "2. Controles somem na Lockscreen (CALLBACK_ID_DANGLING)",
                severity: "Crítico",
                cause: "Ao navegar entre rotas no Next.js ou recarregar a WebView, o Capacitor cancela os listeners antigos. Se houver trava de execução única no hook, os botões não são re-registrados e o Java remove os botões da notificação.",
                fix: "Remover qualquer ref de 'alreadyRegistered' do useEffect de handlers. Re-registrar os handlers a cada montagem do hook useMediaSession.",
                status: "Resolvido"
              },
              {
                id: "bug3",
                title: "3. Crash silencioso em setMetadata (IOException no download da Capa)",
                severity: "Alto",
                cause: "O plugin Java faz requisições HTTP síncronas para baixar a imagem. Se a URL for WebP, Blob, Data URI ou se enviar 3 URLs repetidas e uma falhar, o Java lança IOException e o setPlaybackState nunca executa.",
                fix: "Enviar uma ÚNICA URL JPEG garantida com fallback estável via HTTPS. Efeitos de Metadata e PlaybackState desacoplados em useEffects independentes.",
                status: "Resolvido"
              },
              {
                id: "bug4",
                title: "4. NullPointerException por excesso de chamadas em setPositionState",
                severity: "Médio",
                cause: "Chamar setPositionState a cada 250ms satura a ponte IPC entre WebView e Android antes da notificação ser desenhada pelo sistema operacional.",
                fix: "Throttle de 1000ms (1 segundo) em useMediaSession.ts antes de despachar a posição da barra de progresso.",
                status: "Resolvido"
              },
            ].map((bug) => (
              <div key={bug.id} className="bg-white dark:bg-whatsapp-darkLighter border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold font-jakarta text-gray-900 dark:text-white text-base">{bug.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-500 border border-red-500/20">
                      {bug.severity}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {bug.status}
                    </span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600 dark:text-gray-300">
                    <strong className="text-gray-900 dark:text-white">Causa Raiz:</strong> {bug.cause}
                  </p>
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs">
                    <strong>Solução Aplicada:</strong> {bug.fix}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: REGRAS DE OURO */}
        {activeTab === "rules" && (
          <div className="bg-white dark:bg-whatsapp-darkLighter border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold font-jakarta text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-whatsapp-green" />
              Diretrizes Inegociáveis de Desenvolvimento
            </h2>
            <div className="space-y-4">
              {[
                {
                  rule: "1. Nunca remova o atributo disableRemotePlayback das tags <audio>",
                  why: "Sem essa propriedade, o Chromium da WebView tenta abrir uma Media Session Web que compete com o Foreground Service nativo do Android, causando travamentos e notificações duplicadas."
                },
                {
                  rule: "2. Não use pushState ao expandir o FullscreenPlayer",
                  why: "Alterações no histórico de navegação da WebView no Android 11+ reinicializam o foco de áudio do sistema operacional, matando a notificação instantaneamente."
                },
                {
                  rule: "3. Cada setActionHandler deve ter seu próprio bloco try/catch",
                  why: "Se o registro de um controle secundário (como seekto) falhar no dispositivo de um fabricante específico, os botões essenciais (play/pause/next/prev) continuarão funcionando normalmente."
                },
                {
                  rule: "4. Mantenha o capacitor.config.ts apontado para domínio HTTPS válido",
                  why: "IPs locais ou portas não roteadas causam falhas de DNS ou bloqueios de roteador (AP Isolation), resultando em tela preta ou erro net::ERR_NAME_NOT_RESOLVED."
                },
              ].map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-1">{item.rule}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{item.why}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DIAGNÓSTICO & SUPORTE */}
        {activeTab === "diagnostics" && (
          <div className="bg-white dark:bg-whatsapp-darkLighter border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-6">
            <h2 className="text-lg font-bold font-jakarta text-gray-900 dark:text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-whatsapp-green" />
              Roteiro de Triagem para Suporte Técnico
            </h2>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-900 text-gray-100 font-mono text-xs space-y-3">
                <div className="text-whatsapp-green font-bold"># 1. FILTRAR LOGS DE SESSÃO DE MÍDIA VIA ADB</div>
                <div className="bg-black/50 p-2.5 rounded-lg select-all">
                  adb logcat -d | findstr /i "MediaSession [MS] AudioTrack"
                </div>
                <div className="text-gray-400 text-[11px]">
                  • Se aparecer "[MS] Handlers OK" e "[MS] PlaybackState OK: playing", o app está perfeito e o usuário provavelmente desativou as notificações nas configurações do Android.<br />
                  • Se aparecer "IOException: urlToBitmap", a imagem da capa da música está com formato corrompido.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-900 text-gray-100 font-mono text-xs space-y-3">
                <div className="text-whatsapp-green font-bold"># 2. VERIFICAR SE O SERVIÇO ANDROID ESTÁ ATIVO NO DISPOSITIVO</div>
                <div className="bg-black/50 p-2.5 rounded-lg select-all">
                  adb shell dumpsys activity services | findstr "io.github.jofr.capacitor.mediasessionplugin.MediaSessionService"
                </div>
                <div className="text-gray-400 text-[11px]">
                  Deve retornar "ServiceRecord ... MediaSessionService" ativo e com binding da Activity.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-900 text-gray-100 font-mono text-xs space-y-3">
                <div className="text-whatsapp-green font-bold"># 3. RECOMPILAR APK LIMPO (SEM CACHE)</div>
                <div className="bg-black/50 p-2.5 rounded-lg select-all">
                  cd apps/admin; npx cap copy android; cd android; .\gradlew clean; .\gradlew assembleDebug
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
