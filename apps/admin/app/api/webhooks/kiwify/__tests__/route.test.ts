import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac } from 'crypto';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  profileUpdate: vi.fn(),
  verificationUpsert: vi.fn(),
  auditInsert: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://supabase.example.invalid');
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-test-key');
vi.stubEnv('KIWIFY_WEBHOOK_TOKEN', 'kiwify-test-secret');

mocks.createClient.mockReturnValue({
  from: (table: string) => {
    if (table === 'profiles') return { update: mocks.profileUpdate };
    if (table === 'verification_requests') return { upsert: mocks.verificationUpsert };
    return { insert: mocks.auditInsert };
  },
});

const { POST } = await import('../route');

function signedRequest(payload: unknown) {
  const body = JSON.stringify(payload);
  const signature = createHmac('sha1', 'kiwify-test-secret').update(body).digest('hex');
  return new Request('https://feconecta.example/api/webhooks/kiwify', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-kiwify-signature': signature },
    body,
  });
}

describe('POST /api/webhooks/kiwify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.profileUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    mocks.verificationUpsert.mockResolvedValue({ error: null });
    mocks.auditInsert.mockResolvedValue({ error: null });
  });

  it('never accepts checkout data as a privileged profile role', async () => {
    const response = await POST(signedRequest({
      order_status: 'paid',
      order_id: 'order-admin-role',
      custom_fields: { user_id: '11111111-1111-4111-8111-111111111111', role: 'admin' },
    }));

    expect(response.status).toBe(400);
    expect(mocks.profileUpdate).not.toHaveBeenCalled();
  });

  it('stores allowed verification labels without changing authorization role', async () => {
    const response = await POST(signedRequest({
      order_status: 'paid',
      order_id: 'order-pastor',
      custom_fields: { user_id: '11111111-1111-4111-8111-111111111111', role: 'Pastor' },
    }));

    expect(response.status).toBe(200);
    expect(mocks.profileUpdate).toHaveBeenCalledWith(expect.objectContaining({
      is_verified: true,
      verification_label: 'Pastor',
    }));
    expect(mocks.profileUpdate.mock.calls[0][0]).not.toHaveProperty('role');
  });
});
