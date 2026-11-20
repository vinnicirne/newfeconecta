import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  getOrCreateWallet: vi.fn(),
  creditRecarga: vi.fn(),
  getWalletById: vi.fn(),
}));

vi.mock("@/lib/auth-server", () => ({ requireAuth: mocks.requireAuth }));
vi.mock("@/domain/ads/wallet-ledger.service", () => ({
  WalletLedgerService: class {
    getOrCreateWallet = mocks.getOrCreateWallet;
    creditRecarga = mocks.creditRecarga;
    getWalletById = mocks.getWalletById;
  },
}));
vi.mock("@/domain/ads/mercadopago.client", () => ({
  getMercadoPagoClient: vi.fn(),
}));

import { POST } from "../route";

function makeRequest() {
  return new Request("http://localhost/api/wallet/topup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ valor: 5000, method: "sandbox_simulate" }),
  });
}

describe("POST /api/wallet/topup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ id: "partner-1" });
    mocks.getOrCreateWallet.mockResolvedValue({ id: "wallet-1" });
    mocks.creditRecarga.mockResolvedValue({ id: "tx-1" });
    mocks.getWalletById.mockResolvedValue({ saldo_disponivel: 5000 });
  });

  afterEach(() => vi.unstubAllEnvs());

  it("bloqueia crédito de teste em produção", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(makeRequest());

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Método disponível apenas em desenvolvimento" });
    expect(mocks.creditRecarga).not.toHaveBeenCalled();
  });

  it("permite simulação em ambiente de teste e credita pelo ledger", async () => {
    vi.stubEnv("NODE_ENV", "test");

    const response = await POST(makeRequest());

    expect(response.status).toBe(200);
    expect(mocks.creditRecarga).toHaveBeenCalledWith("wallet-1", 5000, expect.stringMatching(/^sandbox-topup-/));
    expect(await response.json()).toMatchObject({ success: true, method: "sandbox_simulate", new_balance: 5000 });
  });
});
