# 📱 FéConecta — Visão Geral e Funcionalidades (Features)

> **Documento Oficial de Especificação de Funcionalidades**  
> *Última atualização: Agosto de 2026*

---

## 1. O que é o FéConecta?
O **FéConecta** é a primeira rede social cristã completa do Brasil. Um ecossistema digital criado para unir membros, líderes e igrejas em um ambiente 100% limpo, sem conteúdos impróprios, polarização tóxica ou algoritmos seculares.

---

## 2. Mapa Completo de Funcionalidades

### 2.1. Rede Social & Comunidade
- **Feed de Publicações:** Postagens com textos, imagens, vídeos, áudios e links, voltados para edificação, louvor e testemunhos.
- **Stories / Histórias:** Compartilhamento de devocionais rápidos e momentos que expiram em 24h.
- **Interações Espirituais:** Curtidas, comentários, compartilhamentos e reações personalizadas.
- **Mensagens Privadas (Chat Direto):** Comunicação 1:1 segura entre membros da comunidade.
- **Notificações em Tempo Real:** Alertas internos via Supabase Realtime e Push Notifications para conexões e interações.

### 2.2. FéMusic (Streaming Gospel Integrado)
- **Streaming de Louvor:** Músicas nacionais e internacionais integradas no app.
- **Sem Anúncios Seculares:** Foco exclusivo em adoração contínua.
- **Playlists Personalizadas:** Criação e gestão de listas de músicas para oração e cultos domésticos.
- **Player Flutuante:** Música contínua em segundo plano enquanto navega pela rede.

### 2.3. Oração & Vida Espiritual
- **Sala de Guerra (Oração ao Vivo):** Salas de áudio interativas em tempo real (tecnologia LiveKit) para intercessão, vigílias e clamores.
- **Mural de Oração:** Espaço para cadastrar pedidos de oração e receber o clamor da comunidade.
- **Lugar Secreto:** Espaço reservado para propósitos de oração individuais.

### 2.4. Bíblia & Estudos Teológicos
- **Bíblia Sagrada Digital:** Leitura completa do Antigo e Novo Testamento.
- **Versículo do Dia:** Mensagens diárias destacadas na interface.
- **IA Teológica:** Assistente com Inteligência Artificial para estudo bíblico, explicação contextual e dúvidas doutrinárias.

### 2.5. Ministérios, Igrejas & Células
- **Páginas de Igrejas:** Espaço institucional para congregações cadastrarem cultos e eventos.
- **Gestão de Membros:** Aprovação e controle de membresia da igreja local.
- **Células e Grupos:** Espaço exclusivo para pequenos grupos, jovens, mulheres e homens.

### 2.6. Segurança, Privacidade & Proteção à Família (LGPD/ANPD)
- **Conformidade Art. 14 LGPD & Resolução ANPD 15/2024:**
  - **Bloqueio de Menores de 13 anos:** Cadastro automaticamente impedido para crianças.
  - **Consentimento Parental para 13 a 17 anos:** Exigência obrigatória do e-mail do responsável legal.
  - **Validação Segura por Token:** O responsável recebe um link criptográfico único (válido por 7 dias) para autorizar o acesso com um clique.
  - **Tela de Espera em Tempo Real:** O adolescente aguarda na tela `/guardian/pending`, que detecta automaticamente a aprovação do pai/mãe e redireciona sem necessidade de recarregar.
  - **Reenvio de E-mail:** Opção de disparar novamente o e-mail caso o responsável não tenha recebido.
