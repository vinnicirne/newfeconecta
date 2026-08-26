# 🛠️ FéConecta — Guia de Troubleshooting e Resolução de Bugs

> **Manual de Diagnóstico Rápido, Causa-Raiz e Correções Arquiteturais**  
> *Última atualização: 26 de Agosto de 2026*

Este documento detalha os problemas técnicos reais encontrados na plataforma, seus sintomas, a causa-raiz identificada e o procedimento exato de resolução para evitar regressões futuras.

---

## 📑 Índice de Casos
1. [FéMusic — Músicas Travando / Não Avançam Após Tocar uma Vez](#1-fémusic--músicas-travando--não-avançam-após-tocar-uma-vez)
2. [FéMusic — Timeline Não Responde ao Arrastar (Scrubbing/Seek)](#2-fémusic--timeline-não-responde-ao-arrastar-scrubbingseek)
3. [Consentimento Parental (LGPD/ANPD) — Links no E-mail com Localhost](#3-consentimento-parental-lgpdanpd--links-no-e-mail-com-localhost)
4. [Consentimento Parental — Redirecionamento Indevido para Login](#4-consentimento-parental--redirecionamento-indevido-para-login)
5. [AuthGuard — Loop Infinito de Redirecionamento (`/complete-profile`)](#5-authguard--loop-infinito-de-redirecionamento-complete-profile)
6. [Botão de Notificações Travado em Modo Anônimo/Navegadores Estritos](#6-botão-de-notificações-travado-em-modo-anônimonavegadores-estritos)

---

## 1. FéMusic — Músicas Travando / Não Avançam Após Tocar uma Vez

### 🔴 Sintoma:
A primeira música toca, mas ao terminar ou ao tentar mudar de faixa, o player congela, não toca a próxima e silencia todo o som.

### 🔍 Causa-Raiz:
1. **Conflito de Instâncias (`useCrossfade` + `useAudioPlayers`):** A transição de crossfade manipulava dois elementos `<audio>` (`audioA` e `audioB`). Ao pausar o inativo, a referência global `window.audioPlayer` ficava desatualizada ou apontando para um elemento já descarregado.
2. **Evento `onPause` Fantasma:** O navegador emitia um evento nativo `pause` ao descarregar o áudio antigo. O componente `HiddenAudioElements` capturava esse evento sem verificar se pertencia ao player ativo, setando indevidamente `isPlaying: false` no Zustand.
3. **Resolução Estática no `YouTubeProvider`:** O método `play()` mantinha uma referência estática interna que perdia o vínculo com o DOM real do React.

### 🟢 Solução Aplicada:
- No `HiddenAudioElements.tsx`, adicione uma guarda no `onPause` verificando se o elemento pausado é de fato o `(window as any).audioPlayer` antes de alterar o estado global.
- No `YouTubeProvider.ts`, sempre resolva a instância ativa dinamicamente: `const activeAudio = (window as any).audioPlayer || this.player`.
- No `useCrossfade.ts`, desative manipulações forçadas de volume que conflitem com a fila do Zustand.

---

## 2. FéMusic — Timeline Não Responde ao Arrastar (Scrubbing/Seek)

### 🔴 Sintoma:
O usuário tentava arrastar a barra de progresso (timeline) com o mouse ou dedo no celular e a música não avançava/voltava, aceitando apenas cliques simples ou ignorando o comando.

### 🔍 Causa-Raiz:
1. O elemento da timeline usava apenas o evento `onClick`, que não suporta o movimento de arrastar contínuo (`pointermove` / `touchmove`).
2. O método `YouTubeProvider.seek(positionMs)` usava a referência estática antiga `this.player.currentTime`, sem atualizar o elemento ativo `window.audioPlayer`.

### 🟢 Solução Aplicada:
- No `FullscreenPlayer.tsx`, implemente eventos de ponteiro nativos (`onPointerDown`, `onPointerMove`, `onPointerUp`) com captura de ponteiro (`setPointerCapture`) e estado local `dragProgressMs` para feedback visual instantâneo durante o arraste.
- No `YouTubeProvider.ts`, garanta que `seek(positionMs)` atualize o `currentTime` no `(window as any).audioPlayer`.

---

## 3. Consentimento Parental (LGPD/ANPD) — Links no E-mail com Localhost

### 🔴 Sintoma:
O pai/mãe recebia o e-mail de autorização, mas ao clicar no botão, era direcionado para `http://localhost:3000/...` e a página não abria.

### 🔍 Causa-Raiz:
O endpoint `/api/guardian/send-consent` usava o cabeçalho HTTP da requisição `request.headers.get('host')`. Quando o teste era feito em ambiente local, o e-mail continha a URL local em vez da URL de produção.

### 🟢 Solução Aplicada:
- No `/api/guardian/send-consent/route.ts`, fixe a URL base oficial de produção:
  ```typescript
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://newfeconecta.vercel.app';
  const approvalLink = `${baseUrl.replace(/\/$/, '')}/api/guardian/approve?token=${token}`;
  ```

---

## 4. Consentimento Parental — Redirecionamento Indevido para Login

### 🔴 Sintoma:
Ao clicar no link de autorização no e-mail, a tela de sucesso `/guardian/result` piscava por um segundo e jogava o responsável para a tela de `/login`.

### 🔍 Causa-Raiz:
O `AuthGuard` possuía duas etapas de checagem (uma no `initSession` e outra na sentinela de rotas). Como o pai/mãe **não possui login no app**, a sentinela não reconhecia `/guardian/result` como rota pública e forçava o redirecionamento compulsório para `/login`.

### 🟢 Solução Aplicada:
- No `auth-guard.tsx`, declare as rotas `/guardian/*` como públicas tanto na montagem da sessão quanto na sentinela reativa:
  ```typescript
  const isGuardianRoute = pathname.startsWith("/guardian/");
  const isPublicRoute = isEntryRoute || isPostRoute || isGuardianRoute;
  ```

---

## 5. AuthGuard — Loop Infinito de Redirecionamento (`/complete-profile`)

### 🔴 Sintoma:
Usuários com conta ativa ficavam presos em um loop eterno recarregando entre `/` e `/complete-profile`.

### 🔍 Causa-Raiz:
Dois event listeners `profile-hydrated` conflitantes disparavam atualizações circulares no cache local, aliados a uma condição rígida que exigia campos opcionais (`city`, `phone`, `birthdate`) para considerar o perfil completo.

### 🟢 Solução Aplicada:
- Elimine listeners duplicados no `auth-guard.tsx`.
- Simplifique o critério de perfil completo para checar a existência de identificação básica:
  ```typescript
  Boolean(profile.username || profile.full_name || profile.id)
  ```

---

## 6. Botão de Notificações Travado em Modo Anônimo/Navegadores Estritos

### 🔴 Sintoma:
O card "Ative as Notificações" aparecia e o botão "Permitir Notificações" não respondia ao clique ou girava eternamente.

### 🔍 Causa-Raiz:
O hook `usePushNotifications` dependia estritamente da inicialização do Firebase Messaging (`messaging`). Em abas anônimas ou navegadores com bloqueio de Service Workers/IndexedDB, `messaging` retornava `null` e a função saía silenciosamente antes de chamar `Notification.requestPermission()`.

### 🟢 Solução Aplicada:
- No `usePushNotifications.ts`, separe o fluxo:
  1. Primeiro execute **sempre** a chamada nativa do navegador `Notification.requestPermission()`.
  2. Apenas após a permissão ser concedida, tente obter o token FCM do Firebase como enriquecimento opcional.
  3. Salve `push_notifications_enabled: true` no perfil mesmo se o Firebase estiver indisponível.
