import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  createClient: vi.fn(),
  recentRecords: [] as Array<{ id: string; started_at: string }>,
  historyRecord: { id: 'history-e2e', started_at: '2026-11-20T12:00:00.000Z' },
  insert: vi.fn(),
}));

vi.mock('@/lib/auth-server', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));

import { POST } from '../route';

function makeRequest(track: unknown, overrides: RequestInit = {}) {
  return new Request('http://localhost/api/music/playback', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer valid-session' },
    body: JSON.stringify({ track }),
    ...overrides,
  });
}

describe('POST /api/music/playback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example.invalid';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';
    mocks.requireAuth.mockResolvedValue({ id: 'authenticated-user' });
    mocks.recentRecords = [];
    mocks.insert.mockReturnValue({
      select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: mocks.historyRecord, error: null }) }),
    });

    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      limit: vi.fn().mockImplementation(async () => ({ data: mocks.recentRecords, error: null })),
      insert: mocks.insert,
    };
    mocks.createClient.mockReturnValue({ from: vi.fn(() => query) });
  });

  it('rejects unauthenticated playback before using the service role', async () => {
    mocks.requireAuth.mockRejectedValue(new Error('Não autorizado: Token ausente'));
    const response = await POST(makeRequest({ id: 'YnrN0o0lubM' }));

    expect(response.status).toBe(401);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('rejects invalid provider IDs', async () => {
    const response = await POST(makeRequest({ provider: 'youtube', providerTrackId: 'https://evil.invalid' }));

    expect(response.status).toBe(400);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('deduplicates the same user and track within 60 seconds', async () => {
    mocks.recentRecords = [{ id: 'existing', started_at: '2026-11-20T12:00:00.000Z' }];
    const response = await POST(makeRequest({ provider: 'youtube', providerTrackId: 'YnrN0o0lubM' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, duplicate: true });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it('stores playback against the authenticated identity', async () => {
    const response = await POST(makeRequest({
      provider: 'spotify',
      providerTrackId: '4uLU6hMCjMI75M1A2tKUQC',
      title: 'Canção E2E',
      duration: 210_000,
    }));

    expect(response.status).toBe(200);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'authenticated-user' }));
    expect(mocks.insert).toHaveBeenCalledWith(expect.not.objectContaining({ user_id: 'attacker-id' }));
  });
});
