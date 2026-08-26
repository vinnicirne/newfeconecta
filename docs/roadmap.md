# 🗺️ FéConecta — Roadmap de Desenvolvimento e Entregas

> **Acompanhamento de Releases e Marcos Estratégicos**  
> *Última atualização: Agosto de 2026*

---

## 🟢 Fase 1: MVP & Fundação (Concluída)
- [x] Autenticação e Gestão de Sessão (Supabase Auth + Cache Local).
- [x] Feed Principal com suporte a postagens de texto, imagem, áudio e vídeo.
- [x] FéMusic: Catálogo e player de streaming gospel integrado.
- [x] Sala de Guerra: Salas de áudio ao vivo com WebRTC (LiveKit).
- [x] Bíblia Sagrada Digital e Versículo do Dia.
- [x] Módulo de Igrejas e Células.
- [x] Sistema de Notificações Internas (Supabase Realtime) e Push Web/Nativo.

---

## 🟢 Fase 2: Conformidade e Segurança ANPD/LGPD + Estabilidade FéMusic (Concluída)
- [x] **Motor de Classificação Etária:** Utilitário `lib/age-compliance.ts` com cálculo de idade preciso.
- [x] **Proteção Infantil (Bloqueio < 13 anos):** Interrupção automática do cadastro no frontend e backend.
- [x] **Consentimento Parental (13 a 17 anos):**
  - Solicitação obrigatória do e-mail do responsável.
  - Envio de e-mail com link criptográfico de autorização de 1 clique (7 dias de validade).
  - Bloqueio de acesso no `AuthGuard` enquanto `guardian_approved = false`.
  - Atualização automática em tempo real na tela de espera do menor (`/guardian/pending`).
  - Botão de reenvio de e-mail funcional.
  - Tela de confirmação pública para o responsável (`/guardian/result`).
- [x] **FéMusic Engine Fixes:**
  - Resolução de player de áudio dinâmico eliminando travamento após 1ª música.
  - Timeline com suporte a arrastar/deslizar (Pointer Scrubbing) com seek instantâneo.
  - Desacoplamento do Push Notification contra travamento em abas anônimas.

---

## 🟡 Fase 3: Próximos Passos (Em Andamento / Planejado)
- [ ] Centralização dos e-mails de administração em utilitário compartilhado.
- [ ] Expansão do catálogo de gravadoras e ministérios no FéMusic.
- [ ] Otimização de entrega de mídia nativa (yt-dlp e microserviço).
- [ ] Lançamento do ecossistema expandido: FéNamoro e FéChat.

