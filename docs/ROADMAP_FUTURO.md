# 🚀 Plano de Implementação Futura (Gatilho Operacional: "futuro")

Este documento contém o roadmap de arquitetura de software e engenharia pesada para a plataforma FéConecta. 
São melhorias estratégicas arquivadas para execução apenas após a validação do MVP e ganho de tração no mercado, justificando o investimento de tempo e infraestrutura.

---

## 1. Motor Nativo de Extração de Mídia (Fim dos Iframes)
**Status Atual (MVP):** 
Uso de Iframes com manipulação extrema de CSS (Corte de aspecto `4/9` e Zoom `1.35x` via classe) para esconder referências do Instagram/TikTok. 
- *Limitação:* Autoplay nativo bloqueado pelos navegadores e alto custo de processamento (scripts de terceiros rodando na Vercel).

**A Solução Futura (Fase 2):**
- **Arquitetura Paralela:** Levantar um "Servidor Escravo" (Microserviço em VPS barato como Hetzner ou DigitalOcean) com IP limpo para não sofrer bloqueio (Rate Limit/403).
- **Core de Extração:** Implementar o robô open-source `yt-dlp` neste servidor paralelo.
- **Fluxo de Dados:** Quando o app na Vercel receber um link, ele joga a tarefa para o Servidor Escravo. O robô raspa o arquivo `.mp4` cru do Instagram/TikTok, faz upload programático direto para o **Supabase Storage** e retorna o link limpo.
- **Resultado na UX:** O vídeo será renderizado como um `<video>` nativo do app, permitindo autoplay imediato, performance absurda e controle cirúrgico da interface.

---

## 2. Reestruturação do Bloco de Notas
**Status Atual (MVP):** 
O recurso de "Notas" (antigo Meu Diário) possui funcionalidades vitais, porém básicas.

**A Solução Futura:**
- Refatoração completa da interface e arquitetura de dados do Bloco de Notas.
- Melhorar a categorização, edição rica e organização visual para entregar uma experiência premium de anotações aos usuários.

---

## 3. Ecossistema: FéNamoro
**Conceito (A Solução Futura):**
- Expansão do ecossistema criando uma rede social de namoro cristão.
- O FéNamoro será conjugado diretamente com o FéConecta, compartilhando a mesma base de usuários e autenticação unificada, utilizando uma arquitetura semelhante à integração "Instagram ↔ Threads".

---

## 4. Ecossistema: FéChat (WhatsCristão)
**Conceito (A Solução Futura):**
- Criação de uma aplicação de mensageria instantânea (FéChat / WhatsCristão), atuando como o comunicador oficial da plataforma.
- Aplicativo dedicado à comunicação direta, segura e privada, alimentado pelos contatos do FéConecta.

---

## 5. (Espaço aberto para catalogar os próximos passos de evolução...)
