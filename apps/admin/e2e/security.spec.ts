import { test, expect } from '@playwright/test';

test.describe('🛡️ FéConecta — Suíte de Testes de Segurança E2E', () => {

  test('Rotas /admin bloqueiam acesso não autenticado e redirecionam para /login', async ({ page }) => {
    // Tenta acessar /admin diretamente sem cookie ou sessão
    await page.goto('/admin');
    
    // O middleware deve interceptar e redirecionar para /login
    await page.waitForURL('**/login?redirect=%2Fadmin', { timeout: 10000 });
    expect(page.url()).toContain('/login');
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

  test('Webhook Kiwify rejeita requisição sem assinatura válida (401)', async ({ request }) => {
    const res = await request.post('/api/webhooks/kiwify', {
      data: { order: { status: 'approved' } }
    });
    expect(res.status()).toBe(401);
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
