import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'crypto';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  campaign: { id: '11111111-1111-4111-8111-111111111111', partner_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' },
  eventInsert: vi.fn(),
  conversionUpsert: vi.fn(),
  conversionResult: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));

import { POST } from '../route';

function makeRequest(payload: unknown, authorization?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'content-length': '512' };
  if (authorization) headers.authorization = authorization;
  return new Request('https://feconecta.example/api/events', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
}

describe('POST /api/events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example.invalid';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    mocks.eventInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: 'event-id' }, error: null }) }),
    });
    mocks.conversionResult.mockResolvedValue({ data: { id: 'conversion-id' }, error: null });
    mocks.conversionUpsert.mockReturnValue({
      select: vi.fn().mockReturnValue({ maybeSingle: mocks.conversionResult }),
    });
    const campaignQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: mocks.campaign, error: null }),
    };
    const credentialQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { token_hash: createHash('sha256').update('test-capi-secret').digest('hex') },
        error: null,
      }),
    };
    mocks.createClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'campaigns') return campaignQuery;
        if (table === 'ad_pixel_credentials') return credentialQuery;
        return table === 'ad_pixel_events'
          ? { insert: mocks.eventInsert }
          : { upsert: mocks.conversionUpsert };
      }),
    });
  });

  it('rejects unsupported event names before writing', async () => {
    const response = await POST(makeRequest({ pixel_id: 'FC-AAAAAAAA', event_name: 'ArbitraryWrite' }));

    expect(response.status).toBe(400);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('rejects a pixel used against another partner campaign', async () => {
    const response = await POST(makeRequest({
      pixel_id: 'FC-BBBBBBBB',
      campaign_id: mocks.campaign.id,
      event_name: 'Purchase',
      value: 100,
    }));

    expect(response.status).toBe(403);
    expect(mocks.eventInsert).not.toHaveBeenCalled();
  });

  it('does not count public browser purchase events as trusted conversions', async () => {
    const response = await POST(makeRequest({
      pixel_id: 'FC-AAAAAAAA',
      campaign_id: mocks.campaign.id,
      event_name: 'Purchase',
      event_id: 'purchase-001',
      value: 149.9,
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ conversion_verified: false });
    expect(mocks.eventInsert).toHaveBeenCalled();
    expect(mocks.conversionUpsert).not.toHaveBeenCalled();
  });

  it('stores verified conversions while dropping personal metadata fields', async () => {
    const response = await POST(makeRequest({
      pixel_id: 'FC-AAAAAAAA',
      campaign_id: mocks.campaign.id,
      event_name: 'Purchase',
      event_id: 'purchase-001',
      value: 149.9,
      metadata: { order_source: 'checkout', email: 'person@example.invalid' },
    }, 'Bearer test-capi-secret'));

    expect(response.status).toBe(200);
    expect(mocks.eventInsert).toHaveBeenCalledWith(expect.objectContaining({
      campaign_id: mocks.campaign.id,
      partner_id: mocks.campaign.partner_id,
      value_cents: 14990,
      metadata: { order_source: 'checkout' },
    }));
    expect(mocks.conversionUpsert).toHaveBeenCalledWith(expect.objectContaining({
      campaign_id: mocks.campaign.id,
      event_id: 'purchase-001',
      revenue_cents: 14990,
    }), { onConflict: 'campaign_id,event_id', ignoreDuplicates: true });
  });

  it('requires an idempotency key for trusted conversions', async () => {
    const response = await POST(makeRequest({
      pixel_id: 'FC-AAAAAAAA',
      campaign_id: mocks.campaign.id,
      event_name: 'Purchase',
      value: 149.9,
    }, 'Bearer test-capi-secret'));

    expect(response.status).toBe(400);
    expect(mocks.eventInsert).not.toHaveBeenCalled();
    expect(mocks.conversionUpsert).not.toHaveBeenCalled();
  });

  it('reports a replayed trusted conversion without inserting a second conversion', async () => {
    mocks.conversionResult.mockResolvedValueOnce({ data: null, error: null });
    const response = await POST(makeRequest({
      pixel_id: 'FC-AAAAAAAA',
      campaign_id: mocks.campaign.id,
      event_name: 'Purchase',
      event_id: 'purchase-duplicate',
      value: 149.9,
    }, 'Bearer test-capi-secret'));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ conversion_duplicate: true });
    expect(mocks.conversionUpsert).toHaveBeenCalledOnce();
  });

  it('rejects invalid CAPI tokens', async () => {
    const response = await POST(makeRequest({
      pixel_id: 'FC-AAAAAAAA',
      campaign_id: mocks.campaign.id,
      event_name: 'Purchase',
      value: 149.9,
    }, 'Bearer invalid-token'));

    expect(response.status).toBe(403);
    expect(mocks.eventInsert).not.toHaveBeenCalled();
  });
});
