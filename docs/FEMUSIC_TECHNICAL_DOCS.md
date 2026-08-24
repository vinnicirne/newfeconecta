# 🎵 FéMusic — Documentação Técnica do Sistema de Áudio, API Pública e Media Session

> **Destino:** Manutenção, Suporte, Integração com Terceiros e Engenharia de Produção  
> **Módulo:** `/modules/femusic` | **Submódulos:** `player`, `state`, `infrastructure`, `presentation`  
> **Versão do Sistema:** `1.8.4 (Build 35)`  
> **Stack:** Next.js 14 (App Router) + Capacitor 6 (Android) + `@jofr/capacitor-media-session@4.0.0` + Supabase Cloud

---

## 1. 📌 Visão Geral da Arquitetura

O sistema de áudio do **FéMusic** opera com um modelo de **camada quádrupla de execução e resiliência** através de um único código-fonte unificado:

```
                  ┌────────────────────────────────────────┐
                  │        usePlayerStore (Zustand)        │
                  │   Estado central do Player + Likes     │
                  └───────────────────┬────────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
┌──────────────────┐        ┌──────────────────┐           ┌────────────────────┐
│   REST API V1    │        │HiddenAudioElements│          │  useMediaSession   │
│/api/v1/femusic/* │        │  2x <audio> HTML5│          │  Ponte com SO/Web  │
│(CORS + Terceiros)│        │(Crossfade A / B) │          │(Foreground Service)│
└───────┬──────────┘        └─────────┬────────┘           └─────────┬──────────┘
        │                             │                              │
        ▼                             ▼                              ▼
 [ Apps Externos / Web ]    [ AudioContext / WebView ]     [ Android Notif & Lockscreen ]
```

1. **Camada de API Pública para Terceiros (`/api/v1/femusic/*`):**
   * Endpoints RESTful públicos com suporte nativo a CORS (`*`), ideais para aplicativos de terceiros, bots, sites ou players externos.
   * `/api/v1/femusic/search`: Busca universal de faixas com URLs de stream e embed.
   * `/api/v1/femusic/sessions`: Listagem e detalhes de sessões e playlists curadas.
   * `/api/v1/femusic/track`: Resolução de metadados, capas HD e embeds.
2. **Camada de Busca e Resiliência de Catálogo:**
   * O `YouTubeService.ts` gerencia o catálogo.
   * Caso a chave da API oficial do YouTube v3 estoure a cota diária (`429 Quota Exceeded`), o sistema aciona automaticamente a rota serverless interna `/api/music/search`, que realiza scraping SSR do YouTube em tempo real sem limite de requisições.
3. **Camada de Renderização Sonora:** 
   * `HiddenAudioElements.tsx` monta dois elementos HTML5 `<audio>` invisíveis com `disableRemotePlayback` (Player A e Player B) para suportar reprodução contínua e *crossfade* sem engasgos.
4. **Camada de Integração com o SO (Media Session):** 
   * `useMediaSession.ts` sincroniza metadados (título, artista, capa em JPEG HTTPS) e estado de reprodução diretamente com a barra de notificações do Android e a Lockscreen.
5. **Camada de Persistência (Likes & Histórico):**
   * Persistência dupla com normalização de identificadores `(track.providerTrackId || track.id)`.
   * Salva instantaneamente no `localStorage('fc_music_likes')` e sincroniza em nuvem na tabela `music_likes` do Supabase para usuários logados.

---

## 2. 🌐 REST API v1 — Integração com Aplicativos de Terceiros

Para conectar outros aplicativos e sistemas externos ao FéMusic, utilize os seguintes endpoints:

### 🔍 1. `GET /api/v1/femusic/search`
Realiza buscas em tempo real em todo o catálogo gospel/adoração.
* **Query Params:**
  * `q` *(obrigatório)*: Termo de pesquisa (ex: `Morada Para Onde Eu Iria`)
  * `limit` *(opcional)*: Quantidade de resultados (default: `20`, máx: `50`)
* **Exemplo cURL:**
```bash
curl "https://newfeconecta.vercel.app/api/v1/femusic/search?q=Gabriela+Rocha&limit=5"
```
* **Resposta (200 OK):**
```json
{
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
      "streamUrl": "https://www.youtube.com/watch?v=abc123xyz",
      "embedUrl": "https://www.youtube-nocookie.com/embed/abc123xyz?autoplay=1",
      "source": "youtube"
    }
  ]
}
```

### 📜 2. `GET /api/v1/femusic/sessions`
Retorna as sessões e playlists de louvor e oração pré-curadas.
* **Query Params:**
  * `id` *(opcional)*: ID de uma sessão específica (ex: `adoracao-30`, `guerra-espiritual`, `madrugada`)
* **Exemplo cURL:**
```bash
curl "https://newfeconecta.vercel.app/api/v1/femusic/sessions"
```

### 🎵 3. `GET /api/v1/femusic/track`
Entrega metadados, capas HD em múltiplas resoluções e configuração de player para uma faixa específica.
* **Query Params:**
  * `id` *(obrigatório)*: ID do vídeo/faixa
* **Exemplo cURL:**
```bash
curl "https://newfeconecta.vercel.app/api/v1/femusic/track?id=abc123xyz"
```

---

## 3. 🚨 Anatomia dos Bugs Históricos e Causas Raízes (Post-Mortem)

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
* **Solução Obrigatória:** Rota de fallback `/api/music/search` com scraper SSR serverless integrado ao `YouTubeService.ts` e exposto publicamente em `/api/v1/femusic/search`.

### ❌ Falha 6: "Inconsistência no botão Curtir e Curtidas não persistidas"
* **Causa Raiz:** Objetos de faixa vindos do YouTube alternavam entre `.id` e `.providerTrackId`. Comparações estritas `t.id === track.id` falhavam ao checar faixas favoritadas.
* **Solução Obrigatória:** Normalização unificada para `(t.providerTrackId || t.id) === currentId` no `usePlayerStore.ts`, `FullscreenPlayer.tsx` e `LibraryPage.tsx`, com upsert assíncrono na tabela `music_likes` do Supabase.

---

## 4. 📂 Guia de Arquivos e Estrutura de Código

Todos os arquivos que controlam o FéMusic residem em `apps/admin/`:

```
apps/admin/
├── app/
│   ├── api/v1/femusic/
│   │   ├── search/route.ts           # API REST Pública de Busca Universal
│   │   ├── sessions/route.ts         # API REST Pública de Sessões e Playlists
│   │   └── track/route.ts            # API REST Pública de Resolução de Faixas e Capas
│   ├── docs/page.tsx                 # Portal Global e Seguro de Documentação (/docs)
│   └── music/
│       ├── page.tsx                  # Home do FéMusic (Carrosséis de Trending e Adoração)
│       ├── library/page.tsx          # Biblioteca com Sessões Prontas, Curtidas e Histórico
│       └── search/page.tsx           # Tela de Pesquisa em tempo real
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

## 5. 🛡️ Regras de Ouro para Manutenção (Não Quebre o Player!)

1. **Sempre use `(track.providerTrackId || track.id)` para comparações:**
   Garante compatibilidade total entre itens gerados pela busca direta, playlists estáticas, histórico e tabela de curtidas do Supabase.
2. **Mantenha os endpoints públicos com cabeçalhos CORS (`Access-Control-Allow-Origin: *`):**
   Garante que outros aplicativos e serviços web consigam integrar com a API sem bloqueios de navegador.
3. **Nunca remova o atributo `disableRemotePlayback` dos `<audio>` em `HiddenAudioElements.tsx`:**  
   Ele previne que o Google Chrome / WebView do Android crie uma notificação fantasma descontrolada que compete com o plugin nativo do Capacitor.
4. **Nunca use `history.pushState` no Android ao abrir o Fullscreen Player:**  
   Navegações de histórico na WebView forçam o descarte do foco de áudio no Android 11+. Use o listener nativo de botão voltar (`App.addListener('backButton')`).
5. **Mantenha os Handlers Nativos separados:**  
   Em `useMediaSession.ts`, cada `MediaSession.setActionHandler` deve estar envelopado em seu próprio bloco `try/catch`.

---

## 6. 🛠️ Procedimento de Suporte e Diagnóstico Rápido

### Passo 1: Inspecionar Logcat do Android via ADB
```bash
adb logcat -d | findstr /i "MediaSession [MS] AudioTrack"
```
* **Cenário A:** `[MS] Handlers OK` e `[MS] PlaybackState OK` aparecem, mas a notificação não surge.  
  👉 **Diagnóstico:** O usuário negou a permissão de notificações do app nas configurações do Android.
* **Cenário B:** `IOException` em `urlToBitmap`.  
  👉 **Diagnóstico:** Imagem de capa com formato incompatível (WebP/Blob). O fallback JPEG HTTPS de `useMediaSession.ts` foi violado.

### Passo 2: Testar Endpoints de API REST v1
```bash
curl "http://localhost:3000/api/v1/femusic/search?q=gospel&limit=5"
curl "http://localhost:3000/api/v1/femusic/sessions"
curl "http://localhost:3000/api/v1/femusic/track?id=abc123xyz"
```
Todos devem retornar JSON com status 200 e payload estruturado.

### Passo 3: Compilar Novo Pacote AAB de Release (Play Store)
```powershell
cd apps/admin
npx cap sync android
cd android
.\gradlew bundleRelease
```
O pacote assinado é gerado em:  
`apps/admin/android/app/build/outputs/bundle/release/app-release.aab`

---

## 7. 🛡️ Auditoria Nuclear de Segurança e Estabilidade do Feed Principal (`/feed`)

Realizada varredura código a código em `apps/admin/app/RootClient.tsx`, `components/feed/*` e `hooks/feed/*`.

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Normalização Dupla de Identificador de Autor (`user_id` vs `author_id`):**
   * **Cenário Identificado:** Em inserções no `CreatePost.tsx` e escuta realtime no `RootClient.tsx`, algumas instâncias esperavam `author_id` enquanto o schema do banco utiliza `user_id`.
   * **Correção Nuclear:** O payload de inserção agora envia ambos os campos garantindo retrocompatibilidade com RLS policies e triggers de estatísticas. A escuta do canal de realtime resolve `newPost.user_id || newPost.author_id` antes de consultar o cache de perfis.

2. **Deduplicação Rigorosa de Feed e Paginação Virtuosa (`react-virtuoso`):**
   * **Cenário Identificado:** Reposts e posts originais intercalados com paginação infinita podiam colidir em chaves React.
   * **Correção Nuclear:** O mapa do feed utiliza `unique_key` composto (`${id}-${type}-${uid}`), impedindo vazamento de render e re-renderização em cascata.

3. **Isolamento de Erro e Sanitização de Mídia:**
   * **Cenário Identificado:** Imagens legadas sem extensão ou com falha de decodificação não quebram o layout do post; fallback transparente ativo em `PostCardMedia.tsx`.
   * **Segurança XSS:** O conteúdo textual do feed é higienizado contra tags HTML maliciosas antes da renderização de menções e hashtags via `utils/feed-formatter.tsx`.

---

## 8. 💬 Auditoria e Arquitetura Nuclear do Chat Interno (`/messages`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Pontos de Entrada e Acessibilidade:**
   * **Menu Hambúrguer (Mobile):** Atalho direto e prioritário de Mensagens/Chat na grade de utilitários no topo do drawer lateral.
   * **Top Navbar:** Botão de atalho direto para `/messages` com ícone `<MessageSquare>` e badge de mensagens.
   * **Sidebar do Feed (Desktop):** Link de mensagens destacado com estilo nativo e acesso rápido.
   * **Cards de Publicações (`PostCardHeader.tsx`):** Opção "Enviar Mensagem" adicionada ao menu de 3 pontos de qualquer autor.
   * **Página de Perfil (`/profile/[username]`):** Botão "Chat" com redirecionamento direto (`/messages?userId=UUID`).
   * **Navegação Inferior (Mobile BottomNav):** Preservada a distribuição nativa com Home, Sala (War Room), Postar, Tribo e Perfil.

2. **Resiliência Dual no Hook `useChat.ts`:**
   * Caso as stored procedures (`get_my_conversations` ou `get_chat_history`) estejam indisponíveis ou não migradas, o sistema executa automaticamente fallback direto na tabela `direct_messages` com joins dinâmicos em `profiles`.
   * Tratamento de conversas iniciadas via URL sem histórico prévio (hidratação de perfil imediata).

3. **Tempo Real & Notificações:**
   * Canal cirúrgico Supabase Realtime (`chat_active_{selectedId}`) escutando `INSERT`, `UPDATE` (recibo de leitura) e `DELETE`.
   * Envio automático de notificação push em segundo plano na tabela `notifications`.

---

## 9. 👤 Auditoria e Arquitetura Nuclear do Módulo de Perfil (`/profile`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Resiliência de Busca de Dados Dual (`useUserProfile.ts` e `/profile/[username]`):**
   * **Problema Prevenido:** Quebra em cascata caso as RPCs `get_full_profile_data` ou `get_profile_with_state` retornassem erro ou não estivessem sincronizadas no banco.
   * **Correção Nuclear:** Fallback inteligente que consulta as tabelas fundamentais `profiles`, `posts`, `likes` e `follows` em paralelo via `Promise.all`.

2. **Compartilhamento de Perfil Dinâmico:**
   * O link de compartilhamento de perfil agora utiliza dinamicamente `window.location.origin` em vez de URLs estáticas fixas, adaptando-se perfeitamente aos ambientes de desenvolvimento, staging e produção.

3. **Cache SWR e Zero Spam:**
   * Deduping interval de 60s/300s para evitar requisições redundantes.
   * Atualização otimista imediata no contador de seguidores e no estado de "Seguindo", com sincronização em background via Supabase Realtime (`follows`).

4. **Trigger Anti-Escalação de Privilégios (`protect_profile_privileged_fields`):**
   * **Vulnerabilidade Mitigada:** Impedida a adulteração de `role`, `is_verified` e `verification_label` via chamadas de `UPDATE` direto no cliente.
   * **Mecanismo:** Gatilho atômico `BEFORE UPDATE ON profiles` que valida se o chamador possui credenciais de administrador antes de aceitar modificações em colunas críticas.

5. **Isolamento de Documentos e PII (`verification_requests`):**
   * Políticas RLS restritas para garantir que documentos de identidade (RG/CNH), CNPJ e comprovantes bancários sejam acessíveis **apenas** pelo próprio usuário e por administradores homologados.

---

## 10. 🛰️ Auditoria e Arquitetura Nuclear do Radar de Presença (Usuários Online)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Heartbeat Ativo e Contínuo no Feed (`RootClient.tsx`):**
   * **Cenário Identificado:** Usuários que navegavam e consumiam o app sem fazer posts ou editar perfis não atualizavam o campo `updated_at`, sumindo do radar de presença após 10 minutos.
   * **Correção Nuclear:** Implementado um `heartbeatInterval` contínuo a cada 3 minutos que dispara um ping silencioso no `profiles.updated_at`, garantindo que qualquer usuário ativo no app seja detectado em tempo real.

2. **Canal de Presença WebSockets (`presence_online_users`):**
   * Resolução instantânea do `activeUserId` no canal de presença do Supabase, rastreando conexões simultâneas via evento `sync` sem polling excessivo.

3. **Renderização nos Dashboards (`/admin` e `/admin/users`):**
   * Consulta de presença em janela deslizante de 10-15 minutos com contadores sincronizados e badge pulsante verde nos avatares.

---

## 11. 🛡️ Segurança Nuclear, RLS & Likes em Nuvem no FéMusic (`/music`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Sincronização em Nuvem de Músicas Curtidas (`music_likes`):**
   * **Problema:** O hook `usePlayerStore.ts` operava com chamadas à tabela `music_likes`, inexistente no PostgreSQL da VPS.
   * **Correção Nuclear:** Criação da tabela `public.music_likes` com UUID primário, integridade relacional (`ON DELETE CASCADE`), restrição `UNIQUE(user_id, track_id)` e 4 políticas RLS amarradas a `auth.uid() = user_id`.

2. **Curtidas Atômicas em Comentários de Músicas (`toggle_music_track_comment_like`):**
   * **Problema:** `music_track_comments` continha política `UPDATE USING (true) WITH CHECK (true)`, permitindo adulteração do texto de comentários.
   * **Correção Nuclear:** Criação da RPC `toggle_music_track_comment_like(p_comment_id UUID)` com `SECURITY DEFINER` e `auth.uid()`, além de trigger atômico `tr_music_track_comment_likes_sync` para contagem automática de `likes_count`.
   * **Políticas Restritivas:** O `UPDATE` direto em `music_track_comments` foi restrito a `auth.uid() = user_id`.

3. **Blindagem RLS Total (12 Tabelas de Áudio):**
   * RLS ativado e validado em: `music_likes`, `music_posts`, `music_track_comments`, `music_track_comment_likes`, `music_reactions`, `music_comments`, `music_saved`, `music_history`, `music_sessions`, `music_provider_accounts`, `music_tracks` e `femusic_cache`.

---

## 12. 🎬 Módulo de Tribos (`/tribo`) — Feed Vertical & Reels

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Blindagem Anti-IDOR em Curtidas e Seguidores:**
   * **Problema:** As RPCs `toggle_like` e `toggle_follow` aceitavam `p_profile_id` fornecido pelo cliente sem validar o token de autenticação.
   * **Correção Nuclear:** Resolução forçada de `v_caller_id := auth.uid()` com `SECURITY DEFINER` e `search_path = public, pg_temp`, além de trava contra auto-seguimento (`follower_id != following_id`).

2. **Normalização do Payload no Supabase Realtime (`hooks/useTribo.ts`):**
   * **Problema:** Novos vídeos injetavam objeto aninhado `author` em vez dos campos planos esperados pelo componente, quebrando a renderização com "@undefined".
   * **Correção Nuclear:** Payload normalizado mapeando diretamente `author_name`, `author_username` e `author_avatar`.

3. **Gerenciamento de Visibilidade & Lazy-Preload:**
   * `IntersectionObserver` configurado com threshold de 60% para disparo de autoplay e carregamento de lote a cada aproximação do final (`idx >= reels.length - 3`).
   * Preload condicional restrito ao vídeo ativo e vizinhos imediatos (`Math.abs(current - idx) <= 1`).

---

## 13. 🛡️ Segurança Nuclear do Feed & Interações Sociais (`/`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **RPCs Atômicas de Curtida em Comentários (`toggle_post_comment_like` e `toggle_verse_comment_like`):**
   * **Vulnerabilidade Mitigada:** A tabela `comments` possuía política aberta `FOR ALL` que permitia que usuários alterassem ou deletassem comentários de terceiros.
   * **Mecanismo:** Funções com `SECURITY DEFINER` que manipulam o array de curtidas (`likes`) com base estrita no `auth.uid()`, sem conceder permissão de `UPDATE` irrestrita aos clientes.

2. **Blindagem RLS Total em Comentários e Denúncias:**
   * `comments`: `UPDATE` restrito a `auth.uid() = profile_id`; `DELETE` restrito ao autor do comentário, autor do post ou moderador/admin.
   * `daily_verse_comments`: Leitura pública, escrita e remoção restritas ao autor ou admin.
   * `reports`: Denúncias isoladas por `reporter_id` e abertas para moderação homologada.

---

## 14. 📖 Segurança Nuclear do Card da Mensagem do Dia (`daily_verses`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **RPC Atômica para Curtidas de Versículos (`toggle_daily_verse_like`):**
   * **Vulnerabilidade Mitigada:** Políticas de `UPDATE` e `INSERT` abertas para usuários comuns (`USING (true)`), permitindo adulteração ou vandalismo do texto sagrado dos versículos bíblicos.
   * **Mecanismo:** A função com `SECURITY DEFINER` altera o array de likes e sincroniza o contador `likes_count` de forma concorrente e atômica.

2. **Blindagem RLS Inviolável em `daily_verses`:**
   * Acesso de leitura público e operações de escrita (`INSERT`, `UPDATE`, `DELETE`) estritamente restritas a administradores (`role = 'admin'`) ou `service_role`.

---

## 15. 🛡️ Segurança Nuclear de Salas de Oração & War Room (`/room` & `/waroom`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Blindagem de Propriedade e Controle de Salas (`rooms` & `prayer_rooms`):**
   * **Vulnerabilidade Mitigada:** A política `Admins manage all prayer rooms` permitia que qualquer usuário autenticado (`FOR ALL TO authenticated USING (true)`) editasse ou deletasse salas de outros usuários.
   * **Mecanismo:** Políticas reestruturadas vinculando `UPDATE` e `DELETE` ao `auth.uid() = creator_id / host_id` ou administradores cadastrados.

2. **Isolamento de Participantes e Mensagens (`participants` & `prayer_room_messages`):**
   * Participantes só podem gerenciar seu próprio registro (`auth.uid() = user_id / profile_id`) ou o host da sala.
   * Mensagens no chat da sala amarradas estritamente a `auth.uid() = profile_id`, impedindo falsificação de autoria durante clamores.

---

## 16. 📖 Segurança Nuclear da Bíblia Sagrada & IA (`/bible` & `/api/ai/bible-study`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Desbloqueio de RLS Vazio em `bible_comments` e `bible_favorites`:**
   * **Vulnerabilidade Mitigada:** Ambas as tabelas tinham RLS ativado sem políticas, bloqueando o acesso de leitura/escrita para todos os usuários comuns.
   * **Mecanismo:** Políticas criadas permitindo que cada usuário gerencie seus próprios favoritos (`auth.uid() = profile_id`) e comente de forma identificada em capítulos e versículos.

2. **Blindagem de Anotações Espirituais e Destaques (`bible_interactions`, `bible_highlights`, `user_notes`):**
   * Operações de `INSERT`, `UPDATE` e `DELETE` rigorosamente amarradas ao `auth.uid()`, prevenindo modificações e visualizações indevidas de notas privadas.

3. **Proteção da Cota de IA Exegética (`/api/ai/bible-study`):**
   * Autenticação obrigatória com JWT via `requireAuth(req)` e controle de taxa de requisições persistido no PostgreSQL (`ai_rate_limits`, cooldown de 60s por usuário).

---

## 17. 🔔 Segurança Nuclear da Central de Notificações (`notifications`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **RPC Atômica de Consulta Enriquecida (`get_my_notifications`):**
   * **Vulnerabilidade Mitigada:** Chamada de RPC inexistente gerava falhas de carregamento e N+1 queries.
   * **Mecanismo:** Função com `SECURITY DEFINER` que valida identidade com `auth.uid()` nativo e retorna notificações enriquecidas com autor (`sender_name`, `sender_avatar`, `sender_username`).

2. **RPC Atômica de Marcação em Lote (`mark_all_notifications_as_read`):**
   * Atualização instantânea e atômica de todas as notificações não lidas de um usuário logado.

3. **Blindagem RLS Total em `notifications`:**
   * Políticas com `WITH CHECK (auth.uid() = recipient_id)` impedindo o redirecionamento ou falsificação de alertas para outros usuários.

---

## 18. 💬 Segurança Nuclear do Chat & Mensagens Diretas (`/messages` & `/chat`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Eliminação de IDOR em RPCs `SECURITY DEFINER` (`get_my_conversations` & `get_chat_history`):**
   * **Vulnerabilidade Mitigada:** Parâmetros `p_user_id` passados pelo cliente sem checagem de `auth.uid()`, permitindo que um usuário autenticado extraísse o histórico e conversas privadas de qualquer outro membro.
   * **Mecanismo:** Validação rigorosa em PL/pgSQL checando se `auth.uid() = p_user_id` (para conversas) ou `auth.uid() IN (p_user_id, p_other_id)` (para histórico), autorizando desvios apenas para administradores/superadministradores.

2. **Blindagem RLS na Tabela `direct_messages`:**
   * `SELECT`: Exclusivo para os participantes da mensagem (`auth.uid() = sender_id OR auth.uid() = receiver_id`).
   * `INSERT`: Exclusivo para o remetente autenticado (`auth.uid() = sender_id`).
   * `UPDATE`: Exclusivo para o destinatário (`auth.uid() = receiver_id`) com `WITH CHECK`.
   * `DELETE`: Exclusivo para o autor da mensagem (`auth.uid() = sender_id`).

3. **Higienização da Tabela Legada `messages`:**
   * Expurgo de todas as políticas públicas `SELECT true` e restrição das operações de escrita e leitura estritamente aos respectivos autores (`user_id = auth.uid()`) ou administradores.

4. **Restauração da Navegabilidade Móvel (`BottomNav`):**
   * Remoção de `/messages` da lista de bloqueio de rotas em `BottomNav.tsx` com compensação de padding (`pb-24`) na lista de conversas, garantindo menu de navegação inferior acessível.

---

## 19. 📝 Segurança Nuclear de Notas & Devocional (`user_notes` & `/notes`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Blindagem RLS Total em `user_notes`:**
   * **Vulnerabilidade Mitigada:** Políticas permissivas que permitiam inserção com `profile_id` de terceiros e leitura restrita apenas a `user_id`.
   * **Mecanismo:** Políticas de `INSERT` e `UPDATE` com checagem estrita forçando que tanto `user_id` quanto `profile_id` pertençam exclusivamente ao `auth.uid()`, e leitura autorizada apenas para o proprietário ou notas marcadas explicitamente como `is_public = true`.

2. **Resiliência de Consulta e Integridade no Hook `useNotes`:**
   * Resolução de consultas relacionais usando `.or('user_id.eq.' + userId + ',profile_id.eq.' + userId)`, prevenindo omissão de notas em contas antigas.

3. **Integridade de Publicação no Feed (`shareToFeed`):**
   * Preenchimento completo de `author_id`, `user_id` e `profile_id` ao transformar notas/devocionais em testemunhos públicos no Feed.

---

## 20. 🔔 Arquitetura de Emissão Forçada de Notificações (`/forcar-notificacao` & `ForceNotificationModal`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Canal Direto de Notificação Forçada (`ForceNotificationModal`):**
   * **Problema:** Ausência de ferramenta administrativa para disparar notificações pontuais e prioritárias a um usuário específico em tempo real.
   * **Solução:** Modal administrativo com seleção de templates dinâmicos, verificação de conectividade do dispositivo (FCM Push vs In-App Realtime) e inserção com `priority: 'high'`.

2. **Garantia de Entrega Multicanal:**
   * Inserções em `public.notifications` geram sincronização imediata no canal Realtime do Supabase (para exibição de toast na tela ativa) e acionam o webhook `tr_invoke_send_push` para envio ao Firebase Cloud Messaging (FCM).

3. **Rotas de Acesso Amigáveis:**
   * Redirecionamento configurado em `/forcar-notificacao`, `/forcar-notificacoes` e `/forcarnotificacao` apontando para o console central de transmissão (`/admin/push`).

---

## 21. 📸 Segurança Nuclear do Subsistema de Stories (`stories`, `story_views`, `story_likes`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Prevenção de Spoofing de Visualizações (`story_views`):**
   * **Vulnerabilidade Mitigada:** Inserções com `viewer_id` forjado em nome de terceiros.
   * **Mecanismo:** Política `WITH CHECK (auth.uid() = viewer_id)` e leitura restrita exclusivamente ao autor do story, ao próprio espectador ou a administradores.

2. **Expurgo Nuclear e Higienização em `story_likes`:**
   * **Problema Mitigado:** 12 políticas legadas duplicadas e conflitantes.
   * **Mecanismo:** Consolidação em 3 políticas atômicas (`SELECT` público, `INSERT` amarrado ao `auth.uid() = user_id`, e `DELETE` restrito ao autor da curtida ou admin).

3. **Blindagem RLS Total em `stories`:**
   * Políticas de escrita estritamente amarradas ao `auth.uid()`, com validação de expiração (`expires_at > now()`) ou destaques perpétuos (`is_highlight = true`).

---

## 22. ⚡ Experiência de Stories & Limpeza de Câmera (`/stories`, `/status` & `StoryCreator`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Página Dedicada de Stories em Tela Cheia (`/stories`):**
   * Interface mobile-first para navegação, busca em tempo real por autores, atalho de criação e abertura instantânea do `StoryViewer`.

2. **Roteamento Transparente:**
   * Redirecionamento configurado em `/status` apontando para `/stories`.

3. **Otimização da Câmera (`StoryCreator.tsx`):**
   * Removidos disparos redundantes de logs informativos no banco de dados a cada inicialização da câmera.

---

## 23. 🕯️ Segurança Nuclear do Lugar Secreto & Santuário (`/lugarsecreto`, `/santuario`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Forjamento Restrito a Perfis Verificados (`sanctuary_journeys`):**
   * **Vulnerabilidade Mitigada:** Injeção direta de jornadas por usuários não verificados via REST API.
   * **Mecanismo:** Política `INSERT` com checagem estrita no PostgreSQL (`is_verified = true OR role = 'admin'`).

2. **Isolamento do Altar Digital (`sanctuary_progress`):**
   * Operações de leitura, selamento de capítulos e orações estritamente restritas a `auth.uid() = user_id`.

3. **Rotas Transparentes e Resilientes:**
   * Redirecionamentos configurados para `/lugarsecreto`, `/lugar-secreto`, `/quarto-secreto` e `/quartosecreto` apontando para `/santuario`.

---

## 24. 👤 Unificação do Cache de Perfil & Persistência de Identidade (`lib/profile-cache.ts`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Eliminação de Incompatibilidade de Schema no `localStorage`:**
   * **Problema:** Módulos gravavam `{ data: profile, timestamp }` enquanto outros consumiam `{ id, full_name, ... }`, quebrando `currentUser` e exibindo avatares "U" e perfis vazios.
   * **Mecanismo:** Unificação via [`lib/profile-cache.ts`](file:///c:/Users/THINKPAD/Desktop/feconecta/apps/admin/lib/profile-cache.ts) com as funções `getStoredProfile()` e `setStoredProfile()`, que normalizam e recuperam o perfil independentemente da estrutura de origem.

2. **Garantia de Hidratação Reativa Multicomponente:**
   * Emissão de evento customizado `profile-hydrated` com o payload unificado, alimentando imediatamente `AuthGuard`, `RootClient`, `BottomNav`, `StoryCreator` e `Sidebar`.

3. **Fallback Atômico Direto no Supabase Auth:**
   * Se o cache for limpo ou expirar, `RootClient` consulta `supabase.auth.getUser()` diretamente para hidratar o perfil sem falhas visuais.

---

## 25. 🕯️ Deep Clean Técnico do Lugar Secreto & Santuário (`/santuario`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Eliminação de Travamento no Carregamento:**
   * **Causa:** Chamadas concorrentes a `supabase.auth.getUser()` bloqueavam a thread de autenticação por lock contention.
   * **Correção:** Consumo do perfil via `getStoredProfile()` e carregamento paralelo via `Promise.all` de jornadas publicadas, rascunhos, capítulos e progresso.

2. **Navegação SPA Otimizada:**
   * Todos os redirecionamentos legados baseados em `window.location.href` foram convertidos para `router.push()` e componentes `<Link>`, eliminando reloads de página inteira.

3. **Inclusão do Menu Mobile Inferior (`BottomNav`):**
   * Integrado menu nativo no rodapé em todas as visualizações do Santuário (`/santuario`, `/santuario/[id]`).

---

## 26. ⛪ Segurança & Blindagem de Permissões de Igrejas & Células (`churches`, `church_members`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Eliminação de Políticas Permissivas (`UPDATE true` / `DELETE true`):**
   * **Brechas Corrigidas:** Qualquer usuário autenticado podia modificar campos estruturais de qualquer igreja ou aprovar-se como pastor.
   * **Mecanismo:** Políticas atômicas RLS no PostgreSQL vinculadas à liderança comprovada na tabela `church_members` (`role IN ('admin', 'pastor') AND approved = true`).

2. **Isolamento de Pedidos de Entrada (`church_join_requests`):**
   * Visualização restrita ao próprio requerente e à liderança da congregação alvo.

3. **Guarda de Acesso ao Painel Administrativo Congregacional:**
   * Bloqueio imediato na página `/igreja/[slug]/admin` para usuários sem cargo ministerial aprovado.

---

## 27. 🏛️ Catálogo de Igrejas & Resolução de Rotas (`/igrejas`, `/igreja`)

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Resolução de Rota 404 (`/igrejas`):**
   * Criada a página [`app/igrejas/page.tsx`](file:///c:/Users/THINKPAD/Desktop/feconecta/apps/admin/app/igrejas/page.tsx) redirecionando suavemente para `/igreja`.

2. **Carregamento Otimizado com Skeletons:**
   * Adicionados cards pulsantes de carregamento na busca de comunidades e listagem ordenada por engajamento de membros.

3. **Integração Completa do Menu Inferior Mobile:**
   * Inclusão do componente `BottomNav` para navegação responsiva em dispositivos móveis.

---

## 28. 📝 Tipografia Lumina no Bloco de Notas & Conformidade TypeScript no Santuário

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Aplicação da Escala Tipográfica Lumina no Bloco de Notas (`/notes`):**
   * **Título:** `24px - 32px` (`headline-lg` / `headline-lg-mobile`), `lineHeight: 30px - 40px`, semibold, tracking negativo suave.
   * **Corpo:** `18px` (`body-lg`), `lineHeight: 28px` (`leading-relaxed`), altura mínima de `300px` para foco em devocionais.
   * **Seletor de Visibilidade:** Botões em pílulas (`label-md` 14px) para alternar entre "Público" e "Privado".

2. **Conformidade Estrita no TypeScript (`santuario/[id]`):**
   * Ajustada a tipagem de `userId: string | null` em todas as rotinas de leitura de progresso do Altar Digital e acendimento de chamas, garantindo compatibilidade estrita no build de produção da Vercel.

---

## 29. 🛡️ Mitigação de Loops de Redirecionamento & Sincronização de Perfil

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Reatividade Global com `profile-hydrated` no `AuthGuard`:**
   * Quando um usuário atualiza dados em `/complete-profile` ou no modal de edição, o `AuthGuard` atualiza seu estado interno imediatamente sem necessitar de recarregamento.

2. **Critério Resiliente de Perfil Ativo:**
   * Evita bloqueios cíclicos em contas que já possuem cadastro ativo ou identificador válido (`username`/`full_name`).

---

## 30. 🎮 Arena Fé & Sabedoria — Jogos Bíblicos & Gamificação

### 🔍 Diagnóstico e Resoluções Implementadas:

1. **Isolamento de Performance e Bundling Sob Demanda (`/jogos`):**
   * O ecossistema de jogos é carregado de forma assíncrona por rota. Zero impacto de peso ou latência na experiência do Feed principal ou Player de Música.

2. **Quiz Bíblico Cronometrado & Motor Dinâmico aBook:**
   * Acervo curado de perguntas em português divididas em 3 graus de dificuldade com bônus de agilidade e feedback teológico explicativo.

3. **Jogo da Memória Sagrado & Conquistas Sociais:**
   * Tabuleiro interativo de símbolos bíblicos com premiação em XP e geração de postagem automática no Feed e nos Stories do FéConecta.


















