# 🕊️ FéConecta - Ecossistema de Fé Digital (2026 Stable)

O **FéConecta** é uma plataforma multicanal (Web & Mobile) desenhada para conectar a comunidade cristã através de estudos bíblicos assistidos por I.A., diário espiritual e interação social em tempo real.

## 🚀 Avanços Técnicos Recentes (Operação Nuclear 17/04)

Acabamos de concluir uma estabilização crítica na infraestrutura do projeto:

### 🧠 Inteliência Artificial (Gemini 2.5 Flash)
- **Migração Completa**: Motor de Análise Bíblica atualizado para o modelo `gemini-2.5-flash` (Padrão 2026).
- **Exegese Otimizada**: Prompt engineering refinado para estudos teológicos profundos sem poluição de markdown.
- **Resiliência**: Tratamento de logs técnicos e fallback para falhas de API.

### 📊 Dashboard Administrativo (Monitoramento Real)
- **Fim dos Mocks**: Substituição de todos os estados estáticos por consultas dinâmicas ao Supabase.
- **Sensores de Saúde**: Implementação de monitoramento live para o servidor de áudio LiveKit e motores de I.A.
- **Controle de Receita e Atividade**: Visualização real de planos PIX ativos e engajamento de Stories (24h).

### 📖 Diário Espiritual (Persistent Engine)
- **Importação Atômica**: Fluxo de "Salvar no Diário" estabilizado com blindagem de estado (Atomic Initialization).
- **Interface Colapsável**: Visualização de lista otimizada para estudos longos com expansão sob demanda.
- **Deep Tracking**: Sistema de logs para auditoria de persistência de dados.

## 🛠️ Stack Tecnológica
- **Framework**: Next.js 15+ (App Router)
- **Banco de Dados & Auth**: Supabase
- **I.A.**: Google Gemini AI (Vertex/GenerativeAI)
- **Streaming de Áudio**: LiveKit
- **Estilização**: Tailwind CSS 4 / Radix UI

## 📦 Como Rodar
1.  Clone o repositório.
2.  Instale as dependências: `npm install`.
3.  Configure o `.env.local` com as chaves `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `GEMINI_API_KEY`.
4.  Rode em produção local: `npm run dev`.

---
*Status: Produção Estável - Abril 2026*
