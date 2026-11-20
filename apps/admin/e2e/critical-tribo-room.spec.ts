import { expect, test, type Page, type Route } from '@playwright/test';

const userId = '44444444-4444-4444-8444-444444444444';
const roomId = '55555555-5555-4555-8555-555555555555';
const authorId = '66666666-6666-4666-8666-666666666666';

async function mockAuthenticatedBackend(page: Page) {
  await page.addInitScript((profile) => {
    const now = Math.floor(Date.now() / 1000);
    window.localStorage.setItem('feconecta_onboard_v1_seen', 'true');
    window.localStorage.setItem('fc_profile_cache', JSON.stringify(profile));
    window.localStorage.setItem('fc-auth-token', JSON.stringify({
      access_token: 'playwright-fake-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: now + 3600,
      refresh_token: 'playwright-fake-refresh-token',
      user: {
        id: profile.id,
        aud: 'authenticated',
        role: 'authenticated',
        email: 'e2e@example.invalid',
        user_metadata: { full_name: profile.full_name },
      },
    }));
  }, { id: userId, username: 'e2e-room-user', full_name: 'Usuário E2E', role: 'user', is_verified: false });

  await page.route('**/auth/v1/user**', (route: Route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: userId,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'e2e@example.invalid',
      user_metadata: { full_name: 'Usuário E2E' },
    }),
  }));

  await page.route('**/auth/v1/token**', (route: Route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      access_token: 'playwright-fake-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'playwright-fake-refresh-token',
      user: { id: userId, aud: 'authenticated', role: 'authenticated', email: 'e2e@example.invalid' },
    }),
  }));

  await page.route('**/rest/v1/**', async (route: Route) => {
    const url = new URL(route.request().url());
    const resource = url.pathname.split('/').pop();
    let rows: any = [];

    if (resource === 'get_tribo_reels') {
      rows = [{
        id: '77777777-7777-4777-8777-777777777777',
        content: 'Reel de teste da Tribo',
        media_url: 'https://example.invalid/reel-e2e.mp4',
        media_type: 'video',
        post_type: 'video',
        created_at: new Date().toISOString(),
        likes_count: 2,
        comments_count: 0,
        reposts_count: 0,
        views_count: 0,
        author_id: authorId,
        author_username: 'autor-e2e',
        author_name: 'Autor E2E',
        author_avatar: null,
        is_liked: false,
        is_reposted: false,
        is_saved: false,
      }];
    } else if (resource === 'rooms') {
      rows = [{
        id: roomId,
        name: 'Sala E2E',
        creator_id: userId,
        status: 'active',
        visibility: 'public',
        duration_minutes: 60,
        created_at: new Date().toISOString(),
        profiles: { full_name: 'Líder E2E', avatar_url: null },
      }];
    } else if (resource === 'profiles') {
      const profile = { id: userId, username: 'e2e-room-user', full_name: 'Usuário E2E', role: 'user', is_verified: false };
      const accept = route.request().headers()['accept'] || '';
      rows = accept.includes('vnd.pgrst.object') ? profile : [profile];
    }

    const accept = route.request().headers()['accept'] || '';
    const body = accept.includes('vnd.pgrst.object') && Array.isArray(rows)
      ? rows[0] ?? null
      : rows;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': '0-0/*' },
      body: JSON.stringify(body),
    });
  });
}

test('Tribo carrega reels e Rooms permite abrir o fluxo de criação no mobile', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.setViewportSize({ width: 375, height: 812 });
  await mockAuthenticatedBackend(page);

  await page.goto('/tribo');
  await expect(page.getByText('Reel de teste da Tribo')).toBeVisible({ timeout: 30000 });
  await page.locator('video[data-reel-id]').first().evaluate((video) => {
    video.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  const reelPlayButton = page.getByRole('button', { name: 'Reproduzir vídeo' });
  await expect(reelPlayButton).toBeVisible();
  const playButtonBounds = await reelPlayButton.boundingBox();
  expect(playButtonBounds?.width).toBeLessThanOrEqual(56);
  expect(playButtonBounds?.height).toBeLessThanOrEqual(56);
  await expect(page.locator('nextjs-portal')).toHaveCount(0);

  await page.goto('/room');
  await expect(page.getByRole('button', { name: 'Entrar na sala Sala E2E, liderada por Líder E2E' })).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Criar sala de guerra' }).click();

  const createDialog = page.getByRole('dialog', { name: 'Nova Sala de Guerra' });
  await expect(createDialog).toBeVisible();
  await page.getByLabel('Assunto da Oração').fill('Oração de validação E2E');
  await expect(page.getByLabel('Assunto da Oração')).toHaveValue('Oração de validação E2E');
  await page.getByRole('button', { name: 'Privada' }).click();
  await expect(page.getByRole('button', { name: 'Privada' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('nextjs-portal')).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
});
