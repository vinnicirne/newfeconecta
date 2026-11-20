import { test, expect } from '@playwright/test';

test.describe('🛡️ FéConecta — Suíte de Testes de Segurança E2E', () => {

  test('Rotas /admin bloqueiam acesso não autenticado e redirecionam para /login', async ({ page }) => {
    // Tenta acessar /admin diretamente sem cookie ou sessão
    await page.goto('/admin');
    
    // O middleware deve interceptar e redirecionar para /login
    await page.waitForURL('**/login', { timeout: 10000 });
    expect(new URL(page.url()).pathname).toBe('/login');
  });

  test('Headers de segurança HTTP são injetados nas respostas', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response).not.toBeNull();

    const headers = response!.headers();
    
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  test('Endpoint /api/livekit/token rejeita requisição não autenticada (401)', async ({ request }) => {
    const res = await request.get('/api/livekit/token?room=teste&identity=guest');
    expect(res.status()).toBe(401);
  });

  test('Endpoint /api/livekit/end-room rejeita requisição não autenticada (401)', async ({ request }) => {
    const res = await request.post('/api/livekit/end-room', {
      data: { roomId: 'teste-room' }
    });
    expect(res.status()).toBe(401);
  });

  test('Endpoint /api/emails/generate rejeita requisição não autenticada (401)', async ({ request }) => {
    const res = await request.post('/api/emails/generate');
    expect(res.status()).toBe(401);
  });

  test('Endpoint /api/emails/send rejeita requisição não autenticada (401)', async ({ request }) => {
    const res = await request.post('/api/emails/send', {
      data: {
        email: 'invasor@teste.com',
        name: 'Invasor'
      }
    });
    expect(res.status()).toBe(401);
  });

  test('Endpoint /api/emails/welcome não permite disparo de e-mail sem sessão (401)', async ({ request }) => {
    const res = await request.post('/api/emails/welcome', {
      data: { email: 'alvo@exemplo.invalid', name: 'Teste', user_id: '11111111-1111-4111-8111-111111111111' }
    });
    expect(res.status()).toBe(401);
  });

  test('Endpoint /api/music/playback não permite gravação de histórico sem sessão (401)', async ({ request }) => {
    const res = await request.post('/api/music/playback', {
      data: { track: { provider: 'youtube', providerTrackId: 'YnrN0o0lubM' }, userId: 'attacker-id' }
    });
    expect(res.status()).toBe(401);
  });

  test('Endpoint público do Pixel rejeita nomes de evento arbitrários (400)', async ({ request }) => {
    const res = await request.post('/api/events', {
      data: { pixel_id: 'FC-DEFAULT', event_name: 'ArbitraryWrite' }
    });
    expect(res.status()).toBe(400);
  });

  test('Endpoint de chave CAPI não revela nem gera segredos sem sessão (401)', async ({ request }) => {
    const res = await request.post('/api/campaigns/11111111-1111-4111-8111-111111111111/pixel-token');
    expect(res.status()).toBe(401);
  });

  test('Endpoint de consentimento parental não envia e-mail sem sessão (401)', async ({ request }) => {
    const res = await request.post('/api/guardian/send-consent', {
      data: { user_id: '11111111-1111-4111-8111-111111111111', guardian_email: 'alvo@exemplo.invalid' }
    });
    expect(res.status()).toBe(401);
  });

  test('GET do link parental abre confirmação sem aprovar automaticamente', async ({ request }) => {
    const token = 'a'.repeat(64);
    const res = await request.get(`/api/guardian/approve?token=${token}`, { maxRedirects: 0 });
    expect(res.status()).toBe(303);
    expect(res.headers().location).toContain('/guardian/approve?token=');
  });

  test('Endpoint /api/cron/daily-message rejeita requisição sem Bearer token de CRON_SECRET (401 ou 503)', async ({ request }) => {
    const res = await request.get('/api/cron/daily-message');
    expect([401, 503]).toContain(res.status());
  });

  test('Endpoint /api/debug-log rejeita requisição não autenticada (401)', async ({ request }) => {
    const res = await request.post('/api/debug-log', {
      data: { log: 'teste-nao-autorizado' }
    });
    expect(res.status()).toBe(401);
  });

  test('Endpoint /api/extract-media rejeita requisição não autenticada (401)', async ({ request }) => {
    const res = await request.post('/api/extract-media', {
      data: { url: 'https://youtube.com/watch?v=123' }
    });
    expect(res.status()).toBe(401);
  });

  test('Endpoint /api/extract-audio rejeita requisição não autenticada (401)', async ({ request }) => {
    const res = await request.post('/api/extract-audio', {
      data: { url: 'https://youtube.com/watch?v=123' }
    });
    expect(res.status()).toBe(401);
  });

  test('Webhook Kiwify rejeita requisição sem assinatura válida ou configuração de segredo (401/503)', async ({ request }) => {
    const res = await request.post('/api/webhooks/kiwify', {
      data: { order: { status: 'approved' } }
    });
    expect([401, 503]).toContain(res.status());
  });

  test('Endpoint /api/emails/track rejeita IDs que não sejam UUID legítimos', async ({ request }) => {
    // Injeção de string inválida no tracking
    const res = await request.get('/api/emails/track?id=invalid-non-uuid-string');
    expect(res.status()).toBe(200);
    // Retorna fallback SVG sem tentar executar query maliciosa no banco
    const contentType = res.headers()['content-type'];
    expect(contentType).toContain('image/svg+xml');
  });

});
