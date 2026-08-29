// =============================================================================
// FéConecta — Domínio Ads / Campanhas
// Tipos compartilhados: entidades, enums e DTOs de API
// REGRA: Nunca usar "anunciante" — sempre "Parceiro" ou "partner"
// =============================================================================

// ---------------------------------------------------------------------------
// Enums / Union Types
// ---------------------------------------------------------------------------

export type CampaignStatus =
  | "rascunho"
  | "pendente"
  | "ativa"
  | "pausado"
  | "reprovado"
  | "encerrado";

export type WalletTransactionType =
  | "recarga"
  | "debito_campanha"
  | "estorno_reprovacao"
  | "reembolso";

export type RefundRequestStatus =
  | "aguardando"
  | "aprovado"
  | "rejeitado"
  | "falhou";

export type CampaignFormat = "feed" | "stories" | "banner";

export type CampaignObjective =
  | "reconhecimento"
  | "trafego"
  | "engajamento"
  | "contatos"
  | "conversoes"
  | "instalacoes"
  | "eventos"
  | "alcance"
  | "cliques";

export type ConversionAction =
  | "whatsapp"
  | "compra"
  | "cadastro"
  | "link_externo"
  | "inscricao_evento"
  | "visita_igreja"
  | "instalacao_app"
  | "engajamento_social";

// ---------------------------------------------------------------------------
// Entidades de banco (espelham as tabelas do Supabase)
// ---------------------------------------------------------------------------

export interface Wallet {
  id: string;
  partner_id: string;          // = profiles.id do usuário parceiro
  saldo_disponivel: number;    // em centavos (R$ * 100)
  saldo_investido: number;     // em centavos
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  tipo: WalletTransactionType;
  valor: number;               // sempre positivo, em centavos
  campaign_id: string | null;
  payment_id: string | null;   // payment_id do Mercado Pago
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface RefundRequest {
  id: string;
  wallet_id: string;
  valor: number;               // em centavos
  status: RefundRequestStatus;
  mp_refund_id: string | null;
  solicitado_em: string;
  processado_em: string | null;
  admin_id: string | null;
  motivo_rejeicao: string | null;
}

export interface Campaign {
  id: string;
  partner_id: string;
  nome: string;
  formato: CampaignFormat;
  objetivo: CampaignObjective;
  acao_conversao?: ConversionAction | null;
  orcamento: number;           // em centavos
  gasto: number;               // em centavos — consumo real de impressões/cliques
  status: CampaignStatus;
  periodo_inicio: string;      // ISO date
  periodo_fim: string;         // ISO date
  publico: CampaignPublico;
  criativo_url: string | null;
  criativo_tipo: "imagem" | "video" | null;
  call_to_action: string | null;
  texto: string | null;
  motivo_reprovacao: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignPublico {
  regioes?: string[];
  interesses?: string[];
  denominacoes?: string[];
}

// ---------------------------------------------------------------------------
// DTOs de API — Request / Response
// ---------------------------------------------------------------------------

// POST /api/wallet/topup
export interface TopupRequestDto {
  valor: number;  // em centavos, mínimo 5000 (R$ 50,00)
}
export interface TopupResponseDto {
  preference_id: string;
  init_point: string;         // URL de checkout do Mercado Pago
  sandbox_init_point: string;
}

// GET /api/wallet
export interface WalletBalanceDto {
  saldo_disponivel: number;
  saldo_investido: number;
  total_aportado: number;     // soma histórica de recargas
  transacoes_recentes: WalletTransactionDto[];
}

export interface WalletTransactionDto {
  id: string;
  tipo: WalletTransactionType;
  valor: number;
  campaign_id: string | null;
  campaign_nome: string | null;
  created_at: string;
}

// POST /api/wallet/refund-request
export interface RefundRequestDto {
  valor: number;              // em centavos, deve ser <= saldo_disponivel
  observacao?: string;
}
export interface RefundRequestResponseDto {
  id: string;
  status: RefundRequestStatus;
  valor: number;
  solicitado_em: string;
}

// POST /api/admin/refunds/[id]/approve
export interface ApproveRefundResponseDto {
  id: string;
  status: RefundRequestStatus;
  mp_refund_id: string | null;
  processado_em: string;
}

export interface CreateCampaignDto {
  nome: string;
  formato: CampaignFormat;
  objetivo: CampaignObjective;
  acao_conversao?: ConversionAction;
  orcamento: number;          // em centavos
  periodo_inicio: string;
  periodo_fim: string;
  publico?: CampaignPublico;
  criativo_url?: string;
  criativo_tipo?: "imagem" | "video";
  call_to_action?: string;
  texto?: string;
}

// ---------------------------------------------------------------------------
// Erros de domínio tipados
// ---------------------------------------------------------------------------

export class InsufficientBalanceError extends Error {
  readonly code = "INSUFFICIENT_BALANCE";
  constructor(
    public readonly walletId: string,
    public readonly required: number,
    public readonly available: number
  ) {
    super(
      `Saldo insuficiente: disponível R$ ${(available / 100).toFixed(2)}, necessário R$ ${(required / 100).toFixed(2)}`
    );
    this.name = "InsufficientBalanceError";
  }
}

export class InvalidStatusTransitionError extends Error {
  readonly code = "INVALID_STATUS_TRANSITION";
  constructor(public readonly from: CampaignStatus, public readonly to: CampaignStatus) {
    super(`Transição de status inválida: ${from} → ${to}`);
    this.name = "InvalidStatusTransitionError";
  }
}

export class WalletNotFoundError extends Error {
  readonly code = "WALLET_NOT_FOUND";
  constructor(public readonly partnerId: string) {
    super(`Carteira não encontrada para o parceiro: ${partnerId}`);
    this.name = "WalletNotFoundError";
  }
}

export class RefundRequestNotFoundError extends Error {
  readonly code = "REFUND_REQUEST_NOT_FOUND";
  constructor(public readonly refundId: string) {
    super(`Solicitação de reembolso não encontrada: ${refundId}`);
    this.name = "RefundRequestNotFoundError";
  }
}
