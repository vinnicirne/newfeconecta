# 🎵 FéMusic — Documentação Técnica do Sistema de Áudio, Catálogo e Media Session

> **Destino:** Manutenção, Suporte, Prevenção de Regressões e Engenharia de Produção  
> **Módulo:** `/modules/femusic` | **Submódulos:** `player`, `state`, `infrastructure`, `presentation`  
> **Versão do Sistema:** `1.8.4 (Build 35)`  
> **Stack:** Next.js 14 (App Router) + Capacitor 6 (Android) + `@jofr/capacitor-media-session@4.0.0` + Supabase Cloud

---

## 1. 📌 Visão Geral da Arquitetura

O sistema de áudio do **FéMusic** opera com um modelo de **camada tripla de execução e resiliência** através de um único código-fonte unificado:

```
                  ┌────────────────────────────────────────┐
                  │        usePlayerStore (Zustand)        │
                  │   Estado central do Player + Likes     │
                  └───────────────────┬────────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
┌───────────────┐           ┌──────────────────┐           ┌────────────────────┐
│ Buscas / Scraper│         │ HiddenAudioElements│          │  useMediaSession   │
│ YouTubeService │          │  2x <audio> HTML5│          │  Ponte com SO/Web  │
│ /api/music/... │          │(Crossfade A / B) │          │(Foreground Service)│
└───────┬───────┘           └─────────┬────────┘           └─────────┬──────────┘
        │                             │                              │
        ▼                             ▼                              ▼
 [ YouTube SSR / Cache ]    [ AudioContext / WebView ]     [ Android Notif & Lockscreen ]
```

1. **Camada de Busca e Resiliência de Catálogo:**
   * O `YouTubeService.ts` gerencia o catálogo.
   * Caso a chave da API oficial do YouTube v3 estoure a cota diária (`429 Quota Exceeded`), o sistema aciona automaticamente a rota serverless interna `/api/music/search`, que realiza scraping SSR do YouTube em tempo real sem limite de requisições.
2. **Camada de Renderização Sonora:** 
   * `HiddenAudioElements.tsx` monta dois elementos HTML5 `<audio>` invisíveis com `disableRemotePlayback` (Player A e Player B) para suportar reprodução contínua e *crossfade* sem engasgos.
3. **Camada de Integração com o SO (Media Session):** 
   * `useMediaSession.ts` sincroniza metadados (título, artista, capa em JPEG HTTPS) e estado de reprodução diretamente com a barra de notificações do Android e a Lockscreen.
4. **Camada de Persistência (Likes & Histórico):**
   * Persistência dupla com normalização de identificadores `(track.providerTrackId || track.id)`.
   * Salva instantaneamente no `localStorage('fc_music_likes')` e sincroniza em nuvem na tabela `music_likes` do Supabase para usuários logados.

---

## 2. 🚨 Anatomia dos Bugs Históricos e Causas Raízes (Post-Mortem)

### ❌ Falha 1: "A notificação nunca aparece" (Race Condition de Threads no Boot)
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

### ❌ Falha 5: "Buscas retornando vazias por estouro de cota (429)"
* **Causa Raiz:** A API oficial do YouTube v3 possui limite gratuito restrito (100 buscas/dia). Quando a cota estourava, o método `search()` lançava exceção e caía em array vazio.
* **Solução Obrigatória:** Rota de fallback `/api/music/search` com scraper SSR serverless integrado ao `YouTubeService.ts`.

### ❌ Falha 6: "Inconsistência no botão Curtir e Curtidas não persistidas"
* **Causa Raiz:** Objetos de faixa vindos do YouTube alternavam entre `.id` e `.providerTrackId`. Comparações estritas `t.id === track.id` falhavam ao checar faixas favoritadas.
* **Solução Obrigatória:** Normalização unificada para `(t.providerTrackId || t.id) === currentId` no `usePlayerStore.ts`, `FullscreenPlayer.tsx` e `LibraryPage.tsx`, com upsert assíncrono na tabela `music_likes` do Supabase.

---

## 3. 📂 Guia de Arquivos e Estrutura de Código

Todos os arquivos que controlam o FéMusic residem em `apps/admin/`:

```
apps/admin/
├── app/
│   ├── api/music/search/route.ts      # Scraper SSR Serverless para buscas ilimitadas
│   ├── music/
│   │   ├── page.tsx                  # Home do FéMusic (Carrosséis de Trending e Adoração)
│   │   ├── library/page.tsx          # Biblioteca com Sessões Prontas, Curtidas e Histórico
│   │   └── search/page.tsx           # Tela de Pesquisa em tempo real
│   └── admin/docs/music/page.tsx     # Dashboard com documentação técnica interativa
├── modules/femusic/
│   ├── domain/
│   │   ├── entities/MusicTrack.ts    # Modelo de dados da faixa de música
│   │   └── sessions.ts               # Configuração das sessões prontas (Adoração, Guerra, etc.)
│   ├── infrastructure/
│   │   ├── services/YouTubeService.ts# Orquestrador de busca e catálogo com fallback
│   │   └── state/usePlayerStore.ts   # Zustand Store: isPlaying, queue, progress, likedTracks
│   └── presentation/
│       ├── components/
│       │   ├── FullscreenPlayer.tsx  # Player expandido em tela cheia com letras e fila
│       │   ├── MiniPlayer.tsx        # Floating bar fixa na base do app
│       │   └── ReadySessions.tsx     # Cards de sessões prontas de oração e louvor
│       └── player/
│           ├── GlobalYouTubePlayer.tsx # Orquestrador global montado no app/layout.tsx
│           ├── components/HiddenAudioElements.tsx # 2x <audio> com disableRemotePlayback
│           └── hooks/useMediaSession.ts # Sincronização nativa Android / Web MediaSession API
```

---

## 4. 🛡️ Regras de Ouro para Manutenção (Não Quebre o Player!)

1. **Sempre use `(track.providerTrackId || track.id)` para comparações:**
   Garante compatibilidade total entre itens gerados pela busca direta, playlists estáticas, histórico e tabela de curtidas do Supabase.
2. **Mantenha o fallback `/api/music/search` ativo no `YouTubeService.ts`:**
   Protege o catálogo contra indisponibilidade ou estouro de cotas de APIs externas.
3. **Nunca remova o atributo `disableRemotePlayback` dos `<audio>` em `HiddenAudioElements.tsx`:**  
   Ele previne que o Google Chrome / WebView do Android crie uma notificação fantasma descontrolada que compete com o plugin nativo do Capacitor.
4. **Nunca use `history.pushState` no Android ao abrir o Fullscreen Player:**  
   Navegações de histórico na WebView forçam o descarte do foco de áudio no Android 11+. Use o listener nativo de botão voltar (`App.addListener('backButton')`).
5. **Mantenha os Handlers Nativos separados:**  
   Em `useMediaSession.ts`, cada `MediaSession.setActionHandler` deve estar envelopado em seu próprio bloco `try/catch`.

---

## 5. 🛠️ Procedimento de Suporte e Diagnóstico Rápido

### Passo 1: Inspecionar Logcat do Android via ADB
```bash
adb logcat -d | findstr /i "MediaSession [MS] AudioTrack"
```
* **Cenário A:** `[MS] Handlers OK` e `[MS] PlaybackState OK` aparecem, mas a notificação não surge.  
  👉 **Diagnóstico:** O usuário negou a permissão de notificações do app nas configurações do Android.
* **Cenário B:** `IOException` em `urlToBitmap`.  
  👉 **Diagnóstico:** Imagem de capa com formato incompatível (WebP/Blob). O fallback JPEG HTTPS de `useMediaSession.ts` foi violado.

### Passo 2: Testar Endpoint de Busca Interna
```bash
curl "http://localhost:3000/api/music/search?q=gospel&limit=5"
```
Deve retornar JSON com status 200 e array `results` com os vídeos extraídos.

### Passo 3: Compilar Novo Pacote AAB de Release (Play Store)
```powershell
cd apps/admin
npx cap sync android
cd android
.\gradlew bundleRelease
```
O pacote assinado é gerado em:  
`apps/admin/android/app/build/outputs/bundle/release/app-release.aab`
