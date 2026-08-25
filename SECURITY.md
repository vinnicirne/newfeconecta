# 🔐 Guia de Segurança — FéConecta

## ⚠️ Ação Urgente: Rotação de Credenciais

As credenciais abaixo foram identificadas em arquivos locais e **devem ser consideradas comprometidas**.
Rotacione-as imediatamente nos painéis de cada serviço:

---

### 1. Firebase Service Account 🔴 CRÍTICO

A chave privada RSA do SA `firebase-adminsdk-fbsvc@feconecta-4ccac.iam.gserviceaccount.com` foi exposta.

**Como rotacionar:**
1. Acesse [Firebase Console](https://console.firebase.google.com) → Projeto `feconecta-4ccac`
2. Configurações → Contas de serviço
3. Clique em **"Gerar nova chave privada"**
4. Exclua o Service Account antigo (ou revogue a chave)
5. Armazene o novo JSON **EXCLUSIVAMENTE** no painel Vercel:
   - `Settings → Environment Variables → FIREBASE_SERVICE_ACCOUNT_JSON`
6. **Nunca** coloque o JSON ou a private key no `.env.local`

---

### 2. LiveKit API Secret 🔴 CRÍTICO

**Como rotacionar:**
1. Acesse [LiveKit Cloud](https://cloud.livekit.io) → Projeto `feconecta`
2. Settings → API Keys
3. Delete a key `APIFtnSSeHmGFMg` e crie uma nova
4. Atualize no Vercel: `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET`

---

### 3. Resend API Key 🔴 CRÍTICO

**Como rotacionar:**
1. Acesse [Resend Dashboard](https://resend.com/api-keys)
2. Revogue a key `re_aLn63QQ7_...`
3. Crie uma nova e atualize no Vercel: `RESEND_API_KEY`

---

### 4. Gmail App Password 🔴 CRÍTICO

**Como rotacionar:**
1. Acesse [Google Account](https://myaccount.google.com/apppasswords) com `app.feconecta@gmail.com`
2. Remova a senha de app atual
3. Crie uma nova e atualize no Vercel: `SMTP_PASSWORD`

---

### 5. YouTube API Key 🟠 ALTO

**Como restringir/rotacionar:**
1. Acesse [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Edite a chave `AIzaSyBfBb...`
3. Em "API restrictions", restrinja a `YouTube Data API v3`
4. Em "Application restrictions", adicione os domínios autorizados (feconecta.vercel.app, feconecta.shop)
5. Ou crie uma nova chave já restrita e atualize no Vercel: `YOUTUBE_API_KEY` (**sem NEXT_PUBLIC_**)

---

### 6. Gemini API Key 🟠 ALTO

1. Acesse [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Revogue a chave atual e crie uma nova
3. Adicione cota e restrição de domínio
4. Atualize no Vercel: `GEMINI_API_KEY`

---

### 7. Spotify Client Secret 🟡 MÉDIO

1. Acesse [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Selecione o app → Settings → Client Secret → "View client secret"
3. Clique em "Reset Client Secret"
4. Atualize no Vercel: `SPOTIFY_CLIENT_SECRET`

---

## 🆕 Configurações Necessárias Adicionadas

### CRON_SECRET (OBRIGATÓRIO)

O endpoint `/api/cron/daily-message` agora exige `CRON_SECRET`. Sem ela, o endpoint retorna 503.

**Como configurar:**
```bash
# Gerar secret forte
openssl rand -hex 32
# ou via Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Adicionar no Vercel em `Settings → Environment Variables`:
- `CRON_SECRET` = (valor gerado acima)

E configurar o scheduler (Vercel Cron Jobs / GitHub Actions) para enviar:
```
Authorization: Bearer <CRON_SECRET>
```

---

## 🏗️ Correções Implementadas no Código

| Arquivo | Correção |
|---|---|
| `middleware.ts` (NOVO) | Proteção server-side de `/admin` via JWT cookie |
| `api/livekit/token/route.ts` | `requireAuth()` adicionado |
| `api/livekit/end-room/route.ts` | `requireAuth()` adicionado |
| `api/emails/generate/route.ts` | `requireAuth()` adicionado |
| `api/emails/send/route.ts` | `requireAuth()` adicionado |
| `api/cron/daily-message/route.ts` | `CRON_SECRET` agora obrigatório |
| `api/debug-log/route.ts` | Auth + rate limiting (20 req/min/IP) |
| `api/support/route.ts` | Rate limiting (5 tickets/5min/IP) + validação de tamanho |
| `api/emails/track/route.ts` | Validação de UUID antes do query |
| `api/link-preview/route.ts` | SSRF expandido (IPv6, octal, hex, 0.0.0.0) |
| `modules/femusic/infrastructure/services/YouTubeService.ts` | Remove `NEXT_PUBLIC_YOUTUBE_API_KEY` |
| `.env.local` | Remove chave privada Firebase, renomeia YouTube key |
| `.env` | Renomeia YouTube key para `YOUTUBE_API_KEY` |

---

## 📋 Checklist de Deploy Pós-Rotação

- [ ] Revogar e regenerar: Firebase SA Key
- [ ] Revogar e regenerar: LiveKit API Secret
- [ ] Revogar e regenerar: Resend API Key  
- [ ] Revogar e regenerar: Gmail App Password
- [ ] Restringir/regenerar: YouTube API Key
- [ ] Regenerar: Gemini API Key
- [ ] Resetar: Spotify Client Secret
- [ ] Gerar e configurar: `CRON_SECRET`
- [ ] Atualizar **todas** as variáveis no painel do Vercel
- [ ] Fazer deploy (`git push` → Vercel redeploy)
- [ ] Testar acesso `/admin` com usuário não-admin (deve redirecionar para `/`)
- [ ] Testar `GET /api/livekit/token` sem auth (deve retornar 401)
- [ ] Testar `POST /api/emails/send` sem auth (deve retornar 401)
- [ ] Testar `GET /api/cron/daily-message` sem Bearer token (deve retornar 401 ou 503)
