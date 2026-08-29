// =============================================================================
// FéConecta — Domínio Ads
// Cliente do Mercado Pago — interface mockável
//
// REGRA: Toda interação com a API do MELI passa por esta interface.
//        Em testes, injetar MercadoPagoClientMock.
//        Em produção, usar MercadoPagoClient com as credenciais reais.
// =============================================================================

// ---------------------------------------------------------------------------
// Interface (contrato)
// ---------------------------------------------------------------------------

export interface MercadoPagoPreferenceResult {
  preference_id: string;
  init_point: string;
  sandbox_init_point: string;
}

export interface MercadoPagoPixResult {
  payment_id: string;
  status: string;
  qr_code: string;
  qr_code_base64: string;
  ticket_url?: string;
}

export interface MercadoPagoRefundResult {
  refund_id: string;
  status: "approved" | "rejected" | "pending";
}

export interface IMercadoPagoClient {
  /**
   * Cria uma Preference de pagamento para recarga de carteira.
   */
  createTopupPreference(
    valorCentavos: number,
    partnerId: string,
    walletId: string,
    payerEmail?: string
  ): Promise<MercadoPagoPreferenceResult>;

  /**
   * Cria uma cobrança PIX transparente direta com QR Code e Copia e Cola.
   */
  createPixPayment(
    valorCentavos: number,
    partnerId: string,
    walletId: string,
    email: string,
    nome?: string
  ): Promise<MercadoPagoPixResult>;

  /**
   * Solicita reembolso de um pagamento existente.
   */
  refundPayment(
    paymentId: string,
    valorCentavos: number
  ): Promise<MercadoPagoRefundResult>;
}

// ---------------------------------------------------------------------------
// Implementação real (produção)
// ---------------------------------------------------------------------------

export class MercadoPagoClient implements IMercadoPagoClient {
  private readonly accessToken: string;
  private readonly baseUrl = "https://api.mercadopago.com";

  constructor() {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
      throw new Error(
        "[MercadoPago] MERCADOPAGO_ACCESS_TOKEN não configurado. " +
        "Adicione ao .env.local para usar o cliente real."
      );
    }
    this.accessToken = token;
  }

  async createTopupPreference(
    valorCentavos: number,
    partnerId: string,
    walletId: string,
    payerEmail?: string
  ): Promise<MercadoPagoPreferenceResult> {
    const valorReais = valorCentavos / 100;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://newfeconecta.vercel.app";
    const isLocalhost = appUrl.includes("localhost") || appUrl.includes("127.0.0.1");
    // Mercado Pago exige URLs válidas com https para auto_return e notification_url
    const validUrl = isLocalhost ? "https://newfeconecta.vercel.app" : appUrl;

    // E-mail do pagador — obrigatório para liberar o botão "Pagar" no sandbox
    const email = payerEmail || `test_user_${Date.now()}@testuser.com`;

    const returnUrl = isLocalhost ? "http://localhost:3000" : validUrl;

    const body: Record<string, unknown> = {
      items: [
        {
          id: `wallet-topup-${walletId}`,
          title: "Recarga de Carteira — FéConecta Parceiros",
          quantity: 1,
          unit_price: valorReais,
          currency_id: "BRL",
        },
      ],
      payer: {
        email,
      },
      binary_mode: true,
      statement_descriptor: "FECONECTA",
      external_reference: `topup:${walletId}:${partnerId}`,
      back_urls: {
        success: `${returnUrl}/campanha/carteira?topup=success`,
        failure: `${returnUrl}/campanha/carteira?topup=failure`,
        pending: `${returnUrl}/campanha/carteira?topup=pending`,
      },
      auto_return: "approved",
      notification_url: `${validUrl}/api/webhooks/mercadopago`,
    };

    const res = await fetch(`${this.baseUrl}/checkout/preferences`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`[MercadoPago] Falha ao criar Preference: ${res.status} — ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    return {
      preference_id: data.id,
      init_point: data.init_point,
      sandbox_init_point: data.sandbox_init_point,
    };
  }

  async createPixPayment(
    valorCentavos: number,
    partnerId: string,
    walletId: string,
    email: string,
    nome?: string
  ): Promise<MercadoPagoPixResult> {
    const valorReais = valorCentavos / 100;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://newfeconecta.vercel.app";
    const isLocalhost = appUrl.includes("localhost") || appUrl.includes("127.0.0.1");
    const validUrl = isLocalhost ? "https://newfeconecta.vercel.app" : appUrl;

    const firstName = (nome || "Parceiro").split(" ")[0];
    const lastName = (nome || "").split(" ").slice(1).join(" ") || "FéConecta";

    const body = {
      transaction_amount: valorReais,
      description: "Recarga de Carteira — FéConecta Ads",
      payment_method_id: "pix",
      payer: {
        email: email || "contato@feconecta.com.br",
        first_name: firstName,
        last_name: lastName,
        // Não enviamos CPF — o MP gera o PIX sem identification no Brasil
      },
      external_reference: `topup:${walletId}:${partnerId}`,
      notification_url: `${validUrl}/api/webhooks/mercadopago`,
    };

    const res = await fetch(`${this.baseUrl}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": `pix-${walletId}-${Date.now()}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`[MercadoPago PIX] Falha: ${res.status} — ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    return {
      payment_id: String(data.id),
      status: data.status,
      qr_code: data.point_of_interaction?.transaction_data?.qr_code || "",
      qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64 || "",
      ticket_url: data.point_of_interaction?.transaction_data?.ticket_url,
    };
  }

  async refundPayment(
    paymentId: string,
    valorCentavos: number
  ): Promise<MercadoPagoRefundResult> {
    const valorReais = valorCentavos / 100;

    const res = await fetch(`${this.baseUrl}/v1/payments/${paymentId}/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount: valorReais }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        `[MercadoPago] Falha ao solicitar reembolso: ${res.status} — ${JSON.stringify(err)}`
      );
    }

    const data = await res.json();
    return {
      refund_id: data.id,
      status: data.status === "approved" ? "approved" : data.status === "rejected" ? "rejected" : "pending",
    };
  }
}

// ---------------------------------------------------------------------------
// Mock (testes e desenvolvimento sem credenciais MELI)
// ---------------------------------------------------------------------------

export class MercadoPagoClientMock implements IMercadoPagoClient {
  // Controle para simular falhas em testes
  shouldFailTopup = false;
  shouldFailRefund = false;

  async createTopupPreference(
    valorCentavos: number,
    partnerId: string,
    walletId: string,
    payerEmail?: string
  ): Promise<MercadoPagoPreferenceResult> {
    if (this.shouldFailTopup) {
      throw new Error("[MercadoPagoMock] Falha simulada na criação de Preference");
    }
    return {
      preference_id: `mock-pref-${walletId}-${Date.now()}`,
      init_point: `https://www.mercadopago.com.br/checkout/mock?ref=${walletId}`,
      sandbox_init_point: `https://sandbox.mercadopago.com.br/checkout/mock?ref=${walletId}`,
    };
  }

  async createPixPayment(
    valorCentavos: number,
    partnerId: string,
    walletId: string,
    email: string,
    nome?: string
  ): Promise<MercadoPagoPixResult> {
    if (this.shouldFailTopup) {
      throw new Error("[MercadoPagoMock] Falha simulada no PIX");
    }
    return {
      payment_id: `mock-pix-${Date.now()}`,
      status: "pending",
      qr_code: "00020126580014br.gov.bcb.pix0136feconecta-mock-pix-code-1234567895204000053039865802BR5913FeConecta6009SaoPaulo62070503***6304ABCD",
      qr_code_base64: "iVBORw0KGgoAAAANSUhEUgAAAMgAAADIAQAAAACFIImAAAABJElEQVR42u3YwY2EMAwF0N80m6YJUoEKqIUK6IE2qJEQa5hLciA42v1/s5/l2C8hHts2aZJm/qXJa7Qd0iTNf4E0SZM0f0y2m9f2bC9d3iRNkv8g2Q06rF2y28z5kTZJk/QfSKa3eWz3t3b30hQJk/x1kmnPdrS5XF9p+2G9kTZJk/wfJJvN+/U62vQy7aXfJE3SfycZtpX/5fP60pQySZP8Pcmw59aU9p5+kTZJk/wPybCdbSltl/7xSNokTZL/Jdn92u5b232XNkmT/D+Q7G5tG9t2/yRN0iT9Esnwtq9jG3f30j5Jm6RJ/i+QzO5e5tH+SZOkSf49yW65tL8kW9MkaZIm6TdJMj22d2t3b6VJkiT/RjLs9k2/SZIkSZIkSZIkSf5x8g9xYwQ/b+n5gQAAAABJRU5ErkJggg==",
    };
  }

  async refundPayment(
    paymentId: string,
    valorCentavos: number
  ): Promise<MercadoPagoRefundResult> {
    if (this.shouldFailRefund) {
      throw new Error("[MercadoPagoMock] Falha simulada no reembolso");
    }
    return {
      refund_id: `mock-refund-${paymentId}-${Date.now()}`,
      status: "approved",
    };
  }
}

// ---------------------------------------------------------------------------
// Factory — resolve automaticamente baseado no ambiente
// ---------------------------------------------------------------------------

let _instance: IMercadoPagoClient | null = null;

export function getMercadoPagoClient(): IMercadoPagoClient {
  if (_instance) return _instance;

  const hasToken = !!process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (hasToken) {
    _instance = new MercadoPagoClient();
  } else {
    console.warn(
      "[MercadoPago] MERCADOPAGO_ACCESS_TOKEN não encontrado. " +
      "Usando cliente MOCK — pagamentos não serão processados."
    );
    _instance = new MercadoPagoClientMock();
  }

  return _instance;
}

/** Permite injetar um mock em testes sem afetar o singleton de produção */
export function setMercadoPagoClientForTest(client: IMercadoPagoClient): void {
  _instance = client;
}

/** Reseta o singleton (usar no afterEach dos testes) */
export function resetMercadoPagoClient(): void {
  _instance = null;
}
