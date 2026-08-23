# 🎵 FéMusic — Documentação Técnica do Sistema de Áudio e Media Session

> **Destino:** Manutenção, Suporte e Prevenção de Regressões  
> **Módulo:** `/modules/femusic` | **Submódulos:** `player`, `state`, `infrastructure`  
> **Stack:** Next.js (App Router) + Capacitor 6 (Android) + `@jofr/capacitor-media-session@4.0.0`

---

## 1. 📌 Visão Geral da Arquitetura

O sistema de áudio do **FéMusic** opera em dois ecossistemas distintos através de um único código-fonte unificado:

```
                  ┌─────────────────────────────────┐
                  │      usePlayerStore (Zustand)   │
                  │   Estado central do Player      │
                  └────────────────┬────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   ┌──────────────────────┐                  ┌──────────────────────┐
   │ HiddenAudioElements  │                  │   useMediaSession    │
   │  2x <audio> HTML5    │                  │  Ponte com SO/Web    │
   │ (Crossfade A / B)    │                  │ (Foreground Service) │
   └──────────┬───────────┘                  └──────────┬───────────┘
              │                                         │
              ▼                                         ▼
   [ AudioContext / WebView ]                [ Android Notification / Lockscreen ]
```

1. **Camada de Renderização Sonora:** `HiddenAudioElements.tsx` monta dois elementos HTML5 `<audio>` invisíveis (Player A e Player B) para suportar reprodução contínua e *crossfade* sem engasgos.
2. **Camada de Estado:** `usePlayerStore.ts` gerencia fila, faixa atual, play/pause, progresso, volume e falhas de rede.
3. **Camada de Integração com o SO (Media Session):** `useMediaSession.ts` sincroniza título, artista, capa e estado de reprodução diretamente com a barra de notificações do Android e a Lockscreen.

---

## 2. 🚨 Anatomia dos Bugs Históricos e Causas Raízes (Post-Mortem)

Durante o desenvolvimento no ecossistema Android + Capacitor, identificamos e mapeamos as seguintes falhas críticas:

### ❌ Falha 1: "A notificação nunca aparece" (Race Condition de Threads)
* **Causa Raiz:** No plugin nativo Java (`MediaSessionPlugin.java`), o `MediaSessionService` (Foreground Service) por padrão era instanciado apenas na primeira chamada de `setPlaybackState('playing')`. O método `bindService()` do Android é assíncrono. O JavaScript enviava os metadados antes do serviço Java terminar de acoplar à Activity, fazendo o Android descartar a notificação silenciosamente.
* **Solução Obrigatória:**
  1. Configurar `plugins.MediaSession.foregroundService = 'always'` no `capacitor.config.ts`. O serviço Java agora nasce imediatamente no boot da aplicação.
  2. Declarar explicitamente o `MediaSessionService` e o `MediaButtonReceiver` no `AndroidManifest.xml`.

### ❌ Falha 2: "A notificação some ou fica vazia sem botões" (CALLBACK_ID_DANGLING)
* **Causa Raiz:** Ao navegar entre rotas no Next.js ou recarregar a WebView, o Capacitor cancela todas as Promises pendentes e marca os handlers de botões como `CALLBACK_ID_DANGLING`. Como o código antigo utilizava uma trava `handlersRegistered.current = true`, os handlers nunca eram re-registrados. O Java executava `hasActionHandler(action)`, recebia `false` para todos e removia os botões da notificação.
* **Solução Obrigatória:** O `useEffect` de registro de handlers de botões (`setActionHandler`) **NÃO DEVE** possuir travas de execução única. Ele deve se re-executar no ciclo de montagem do player.

### ❌ Falha 3: "Crash/Abort silencioso no setMetadata" (IOException no urlToBitmap)
* **Causa Raiz:** O Java nativo tenta baixar via HTTP síncrono cada URL fornecida na lista de `artwork`. Se uma das imagens for WebP (incompatível com o decoder nativo do plugin), Blob, Data URI, ou se a rede falhar em 1 das 3 resoluções, o método dispara uma `IOException` não tratada e o `call.resolve()` nunca é chamado.
* **Solução Obrigatória:**
  1. Enviar **apenas uma única URL** de capa garantidamente em formato JPEG (`image/jpeg`) e protocolo HTTPS.
  2. Separar o efeito de `setMetadata` e `setPlaybackState` em blocos isolados para que uma falha de imagem nunca bloqueie a notificação.

### ❌ Falha 4: "Spam no setPositionState derrubando o player"
* **Causa Raiz:** Atualizar a posição do áudio a cada frame/tick de 250ms gera sobrecarga de IPC (Inter-Process Communication) na ponte Java-Webview, causando *NullPointerException* se a notificação ainda estiver em transição.
* **Solução Obrigatória:** Aplicar *throttle* de no mínimo 900ms a 1000ms na chamada de `MediaSession.setPositionState`.

### ❌ Falha 5: "Conflito com Live Reload / IP da Rede"
* **Causa Raiz:** Configurar `server.url` com IPs locais (ex: `192.168.1.X:3000`) causa falhas de handshake SSL e bloqueios por roteadores locais (*AP Isolation*), resultando em tela preta (`ERR_NAME_NOT_RESOLVED`).
* **Solução Obrigatória:** Em produção ou testes de APK, apontar o `server.url` diretamente para o domínio HTTPS de produção (`https://newfeconecta.vercel.app`) ou compilar os assets estáticos diretamente no pacote.

---

## 3. 📂 Guia de Arquivos e Estrutura de Código

Todos os arquivos que controlam o FéMusic residem em:
`apps/admin/modules/femusic/`

```
modules/femusic/
├── application/
│   └── useSaveProgress.ts          # Salva timestamp da faixa no localStorage / Supabase
├── infrastructure/
│   ├── services/
│   │   └── YouTubeService.ts       # Resolução de streams, fallback de áudio e álbuns
│   └── state/
│       └── usePlayerStore.ts       # Zustand Store: isPlaying, currentTrack, queue, progress
└── presentation/
    ├── components/
    │   ├── FullscreenPlayer.tsx    # Player expandido em tela cheia com letras e fila
    │   ├── MiniPlayer.tsx          # Floating bar fixa na base do aplicativo
    │   └── PostCardMedia.tsx       # Player embutido dentro dos cards do Feed
    └── player/
        ├── GlobalYouTubePlayer.tsx # Orquestrador global montado no app/layout.tsx
        ├── types.ts                # Interfaces de referências dos elementos de áudio
        ├── components/
        │   └── HiddenAudioElements.tsx # Elementos <audio> com disableRemotePlayback
        └── hooks/
            ├── useAudioPlayers.ts  # Gerencia Refs (audioA, audioB) e alternância
            ├── useCrossfade.ts     # Transição suave de volume entre faixas
            ├── usePlayerControls.ts# TimeUpdate, Ended, Error, LoadMetadata
            └── useMediaSession.ts  # Sincronização nativa Android / Web MediaSession API
```

---

## 4. 🛡️ Regras de Ouro para Manutenção (Não Quebre o Player!)

Ao dar manutenção no código de música, **NUNCA VIOLE** as seguintes diretrizes:

1. **Nunca remova o atributo `disableRemotePlayback` dos `<audio>` em `HiddenAudioElements.tsx`:**  
   Ele previne que o Google Chrome / WebView do Android crie uma notificação fantasma descontrolada que compete com o plugin nativo do Capacitor.
2. **Nunca use `history.pushState` no Android ao abrir o Fullscreen Player:**  
   Navegações de histórico na WebView forçam o descarte do foco de áudio no Android 11+. Use o listener nativo de botão voltar (`App.addListener('backButton')`).
3. **Mantenha os Handlers Nativos separados:**  
   Em `useMediaSession.ts`, cada `MediaSession.setActionHandler` deve estar envelopado em seu próprio bloco `try/catch`.
4. **Verificação de Permissão Android 13+:**  
   Qualquer inicialização de áudio deve respeitar a permissão de notificações `POST_NOTIFICATIONS`. No `GlobalYouTubePlayer.tsx`, mantemos a requisição automática via `@capacitor/local-notifications`.

---

## 5. 🛠️ Procedimento de Suporte e Diagnóstico Rápido

Caso um usuário relate que a música toca, mas os controles da tela de bloqueio sumiram:

### Passo 1: Inspecionar Logcat do Android via ADB
Conecte o aparelho ao computador e execute:
```bash
adb logcat -d | findstr /i "MediaSession [MS] AudioTrack"
```

* **Cenário A:** `[MS] ✅ Handlers completos` e `[MS] ✅ PlaybackState OK` aparecem, mas a notificação não surge.  
  👉 **Diagnóstico:** O usuário negou a permissão de notificações do app nas configurações do Android.
* **Cenário B:** `IOException` em `urlToBitmap`.  
  👉 **Diagnóstico:** A imagem da capa da música está em formato inválido ou com URL quebrada. O fallback de imagem de `useMediaSession.ts` foi violado.
* **Cenário C:** `ServiceRecord` não encontrado em `dumpsys activity services`.  
  👉 **Diagnóstico:** O APK foi instalado sem o `MediaSessionService` no `AndroidManifest.xml`. Necessário rodar `npx cap sync android` e recompilar o APK.

### Passo 2: Recompilar APK de Teste
Para gerar um APK limpo sem cache corrompido:
```powershell
cd apps/admin
npx cap copy android
cd android
.\gradlew clean
.\gradlew assembleDebug
```
O APK final é gerado em:  
`apps/admin/android/app/build/outputs/apk/debug/app-debug.apk`

---
*Documentação atualizada em Agosto de 2026 para a versão 1.6.5 do FéConecta.*
