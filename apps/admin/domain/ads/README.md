# Domínio Ads / Campanhas + Carteira — FéConecta

Módulo financeiro do sistema de Campanhas (Parceiros). Implementa o ledger de carteira, a máquina de estados de campanhas e as integrações com o Mercado Pago.

## Fluxo do Dinheiro

```
Parceiro acessa /campanha/carteira
  → POST /api/wallet/topup { valor }
  → Backend cria Preference no Mercado Pago
  → Parceiro paga (Pix / Cartão / Boleto)
  → Webhook POST /api/webhooks/mercadopago confirma
  → creditRecarga() → +saldo_disponivel + tx "recarga"

Parceiro cria campanha em /campanha/nova
  → POST /api/campaigns { nome, formato, orcamento, ... }
  → Campanha criada em status "pendente" — SEM debitar saldo

Admin aprova em /ads
  → POST /api/admin/campaigns/:id/approve   [FASE 2]
  → Transação atômica:
      SELECT FOR UPDATE na wallet
      saldo_disponivel >= orcamento? → sim: continua | não: erro 402
      debitForCampaignApproval() → -disponivel +investido + tx "debito_campanha"
      status → "ativa"

Admin reprova em /ads
  → POST /api/admin/campaigns/:id/reject   [FASE 2]
  → Se havia débito: creditEstornoReprovacao() → +disponivel + tx "estorno_reprovacao"
  → status → "reprovado"
  → NÃO chama Mercado Pago

Parceiro solicita reembolso em /campanha/carteira
  → POST /api/wallet/refund-request { valor }
  → Cria refund_request em status "aguardando"

Admin aprova reembolso em /ads/carteira
  → POST /api/admin/refunds/:id/approve
  → Chama API MELI → em sucesso:
      debitReembolso() → -disponivel + tx "reembolso"
      refund_request → status "aprovado"
  → Em falha MELI:
      refund_request → status "falhou"
      saldo NÃO é debitado
```

## Transições de Status da Campanha

```
rascunho ──► pendente ──► ativa ──► pausado
                  │          │         │
                  │          └────────►│
                  ▼                   ▼
             reprovado           encerrado
             (terminal)          (terminal)
```

**Regra:** Toda mudança de status passa obrigatoriamente por `assertTransition(from, to)` em `campaign-state-machine.ts`.

## Tipos de Transação do Ledger

| tipo | efeito no saldo | quando ocorre |
|------|----------------|---------------|
| `recarga` | +disponivel | Webhook MP confirma pagamento |
| `debito_campanha` | -disponivel +investido | Admin aprova campanha |
| `estorno_reprovacao` | +disponivel | Admin reprova campanha |
| `reembolso` | -disponivel | Admin aprova refund request + MELI OK |

> **REGRA ABSOLUTA:** Nenhum saldo é alterado sem uma linha em `wallet_transactions`.

## Arquitetura de Arquivos

```
domain/ads/
├── types.ts                   # Tipos, entidades, DTOs, erros tipados
├── campaign-state-machine.ts  # canTransition / assertTransition
├── wallet-ledger.service.ts   # Motor financeiro (RPCs atômicas)
├── campaign.service.ts        # Ciclo de vida das campanhas
├── mercadopago.client.ts      # Client MP com interface mockável
├── README.md                  # Este arquivo
└── __tests__/
    └── ads-domain.test.ts     # 6 suites de testes unitários

app/api/
├── wallet/
│   ├── route.ts               # GET /api/wallet
│   ├── topup/route.ts         # POST /api/wallet/topup
│   └── refund-request/route.ts # POST /api/wallet/refund-request
├── webhooks/
│   └── mercadopago/route.ts   # POST /api/webhooks/mercadopago
└── admin/
    └── refunds/[id]/
        └── approve/route.ts   # POST /api/admin/refunds/:id/approve

supabase/migrations/
└── 20260828_ads_wallet_system.sql  # Migration completa
```

## Variáveis de Ambiente Necessárias

```bash
# Existentes no projeto
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Novas para o módulo de Ads
MERCADOPAGO_ACCESS_TOKEN=...    # Obter no painel do MELI
NEXT_PUBLIC_APP_URL=https://feconecta.com.br  # Para back_urls do MP
```

Se `MERCADOPAGO_ACCESS_TOKEN` não estiver configurado, o sistema usa automaticamente o `MercadoPagoClientMock` com aviso no console.

## Rodando os Testes

```bash
# Da pasta apps/admin
npm run test

# Com coverage
npm run test:coverage
```

## Fase 2 — Ciclo de Vida da Campanha

### Aprovação (transação atômica)
1. Valida transição pendente → ativa via `assertTransition`
2. Chama RPC `approve_campaign_atomic` no PostgreSQL:
   - Lock da campanha (`FOR UPDATE`)
   - Lock da wallet do parceiro (`FOR UPDATE`)
   - Valida `saldo_disponivel >= orcamento`
   - Debita saldo disponível, credita saldo investido
   - Insere linha no ledger (`debito_campanha`)
   - Status da campanha muda para `ativa`
   - Commit atômico

Se qualquer passo falhar: rollback total automático. `InsufficientBalanceError` → `402 Payment Required`.

### Reprovação
1. Valida transição pendente → reprovado
2. Chama RPC `reject_campaign_atomic`:
   - Verifica se houve débito prévio
   - Se houver: estorna via `creditEstornoReprovacao` (+disponível no ledger)
   - Status muda para `reprovado`, motivo salvo
   - **NÃO** chama Mercado Pago

### Máquina de estados (completa)
```
rascunho → pendente → ativa → pausado ↔ ativa
                    ↓
                reprovado (terminal)
ativa / pausado → encerrado (terminal)
```

## Fase 3 — Interfaces de Usuário
- `/campanha` — Dashboard do Parceiro (KPIs, lista, BudgetProgress)
- `/campanha/nova` — Criar campanha em 3 etapas
- `/campanha/carteira` — Gestão de Saldo, Recarga Mercado Pago e Reembolso
- `/campanha/pagamentos` — Extrato completo paginado
- `/ads` — Fila de moderação e aprovação admin
- `/ads/carteira` — Fila e execução de reembolsos via API MELI
- `/ads/desempenho` — Métricas consolidadas globais
- `/ads/pagamentos` — Status da integração Mercado Pago

## Fase 4 — Ad-serving, Tracking e Encerramento Automático

### Entrega Nativa no Feed Social (Ad Delivery Engine)
- **Componente:** `<SponsoredAdCard />` em `components/feed/SponsoredAdCard.tsx`.
- **Injeção:** Integrado no `RootClient.tsx` consumindo o `AdServingService` (`/api/ads/serve?format=feed`).
- **Estrutura:** Foto do parceiro, selo de verificado, tag `📢 Patrocinado • FéAds`, copy, criativo em imagem/vídeo e botão de conversão (CTA) com URL de destino (Página de Vendas / WhatsApp).
- **Editor Completo (`/campanha/[id]`):** Permite alterar copy, nome, link de destino, formato, objetivo e fazer upload de nova mídia com compressão WebP em tempo real.

### Modelos de Cobrança e Exemplos Práticos
1. **Modelo Pré-Pago:** O parceiro recarrega créditos via Pix ou Cartão (Mercado Pago).
2. **Alocação na Aprovação:** O orçamento da campanha é transferido de `saldo_disponivel` para `saldo_investido` apenas quando a moderação aprova o anúncio.
3. **Consumo por Cliques (CPC) / Impressões (CPM):**
   - *Exemplo:* Orçamento de R$ 100,00 com CPC de R$ 0,50 ➔ 200 cliques entregues diretamente na página de vendas ou WhatsApp do parceiro.
4. **Garantia de Não-Prejuízo:**
   - Se reprovada: Orçamento nunca é debitado.
   - Se encerrada com saldo restante: O valor não gasto é estornado imediatamente para o `saldo_disponivel`.

### Ciclo Completo de uma Impressão
1. Cliente chama `GET /api/ads/serve?format=feed|stories|banner`
   - Retorna campanha ativa elegível + URLs de tracking (`204` se nenhuma disponível)
2. Criativo é exibido na tela → cliente aciona `POST /api/ads/track/impression` (ou pixel 1x1 GIF)
   - Insere registro em `ad_impressions` (append-only)
   - Executa `increment_campaign_gasto_atomic` no PostgreSQL
   - Se `gasto >= orcamento`: dispara automaticamente `CampaignClosingService.closeIfEligible`
3. Usuário clica no anúncio → cliente aciona `POST /api/ads/track/click`
   - Verifica proteção anti-fraude (rate limit in-memory)
   - Insere registro em `ad_clicks` (append-only)
   - Abre o link de destino (Página de Vendas / WhatsApp) em nova aba (`target="_blank"`).

### Encerramento Automático
- **Por Orçamento**: Disparado imediatamente após o clique/impressão que esgota o teto financeiro aprovado.
- **Por Data**: Job periódico chamando `closeExpiredCampaigns` para campanhas com `periodo_fim < CURRENT_DATE`.
- **Regra de Saldo**: O encerramento transiciona o status para `encerrado`. Saldo remanescente não gasto é devolvido para a carteira.


