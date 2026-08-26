# 🔌 FéConecta — Documentação de APIs e Endpoints

> **Especificação Técnica das Rotas de API (Next.js App Router)**  
> *Última atualização: Agosto de 2026*

---

## 1. Módulo de Proteção de Menores e Consentimento Parental (`/api/guardian`)

### `POST /api/guardian/send-consent`
Dispara o e-mail de autorização para o responsável legal de um adolescente (13–17 anos).
- **Payload:**
  ```json
  {
    "user_id": "uuid (opcional se guardian_email for passado)",
    "minor_name": "string (opcional se guardian_email for passado)",
    "guardian_email": "responsavel@exemplo.com"
  }
  ```
- **Comportamento:**
  1. Localiza o perfil do menor (caso `user_id` não seja informado diretamente).
  2. Gera um token criptográfico de 32 bytes (`guardian_token`) com expiração de 7 dias (`guardian_token_expires_at`).
  3. Atualiza `guardian_approved = false` no perfil.
  4. Envia e-mail em HTML estilizado para o responsável contendo o link de aprovação apontando para `https://newfeconecta.vercel.app/api/guardian/approve?token=<TOKEN>`.
- **Respostas:**
  - `200 OK`: `{ "success": true }`
  - `400 Bad Request`: Dados incompletos ou e-mail inválido.
  - `404 Not Found`: Cadastro do menor não localizado.

---

### `GET /api/guardian/approve`
Endpoint de validação acessado com 1 clique pelo responsável através do e-mail.
- **Query Params:** `?token=<TOKEN>`
- **Comportamento:**
  1. Busca o perfil vinculado ao `guardian_token`.
  2. Valida a validade temporal do token (7 dias).
  3. Atualiza `guardian_approved = true`, grava `guardian_approved_at = NOW()` e invalida o `guardian_token = null`.
  4. Redireciona para `/guardian/result?status=approved&name=<NOME_DO_MENOR>`.
- **Status de Redirecionamento:**
  - `approved`: Autorização concedida com sucesso.
  - `already_approved`: A conta já havia sido autorizada anteriormente.
  - `expired`: O link expirou (mais de 7 dias).
  - `invalid`: Token incorreto, nulo ou já utilizado.

---

## 2. Módulo de E-mails Transacionais (`/api/emails`)

### `POST /api/emails/send`
Envia e-mails transacionais (Boas-vindas, notificações, etc.) via SMTP (Gmail) ou fallback Resend.
- **Autenticação:** Requer cabeçalho de sessão autenticada (`requireAuth`).
- **Payload:**
  ```json
  {
    "email": "destinatario@email.com",
    "name": "Nome",
    "user_id": "uuid",
    "template_key": "welcome"
  }
  ```
- **Features:** Rastreamento com pixel SVG dinâmico (`/api/emails/track?id=<LOG_ID>`) e logging completo em `email_logs`.

---

## 3. Módulo de Áudio e Streaming (`/api/livekit` & `/api/v1/femusic`)

### `POST /api/livekit/token`
Gera token de autenticação e permissão de sala para participação na **Sala de Guerra**.

### `GET /api/v1/femusic/search`
Busca e catálogo de faixas, louvores e álbuns no serviço FéMusic.

---

## 4. Módulo de Webhooks e Pagamentos (`/api/webhooks`)

### `POST /api/webhooks/kiwify`
Webhook de integração com a Kiwify para ativação automática de planos e funcionalidades Premium do ecossistema.
