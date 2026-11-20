import { expect, test } from '@playwright/test';

const viewerId = '11111111-1111-4111-8111-111111111111';
const secondAuthorId = '22222222-2222-4222-8222-222222222222';
const storyGroups = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    author_id: secondAuthorId,
    media_url: null,
    media_type: 'text',
    content: 'Story de teste do carrossel',
    background_color: '#008f72',
    expires_at: '2099-12-31T23:59:59.000Z',
    created_at: '2099-01-02T12:00:00.000Z',
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    author_id: '33333333-3333-4333-8333-333333333333',
    media_url: null,
    media_type: 'text',
    content: 'Outro story de teste',
    background_color: '#3155a4',
    expires_at: '2099-12-31T23:59:59.000Z',
    created_at: '2099-01-01T12:00:00.000Z',
  },
];

test('feed hidrata após recarga e abre stories com dados atualizados', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydration|did not match|server html/i.test(message.text())) {
      runtimeErrors.push(message.text());
    }
  });

  await page.addInitScript((profile) => {
    window.localStorage.setItem('fc_profile_cache', JSON.stringify(profile));
    window.localStorage.setItem('fc_feed_controls_v1', JSON.stringify({
      show_daily_verse: false,
      show_fenamoro_banner: false,
    }));
  }, {
    id: viewerId,
    username: 'teste-e2e',
    full_name: 'Perfil de Teste',
    role: 'user',
    avatar_url: null,
  });

  await page.route('**/api/ads/serve**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ campaign_id: null }),
  }));

  await page.route('**/rest/v1/**', async (route) => {
    const table = new URL(route.request().url()).pathname.split('/').pop();
    let rows: unknown[] = [];

    if (table === 'stories') rows = storyGroups;
    if (table === 'profiles') {
      rows = [
        { id: secondAuthorId, full_name: 'Maria Teste', username: 'maria-teste', avatar_url: null },
        { id: '33333333-3333-4333-8333-333333333333', full_name: 'João Teste', username: 'joao-teste', avatar_url: null },
      ];
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'content-range': `0-${Math.max(rows.length - 1, 0)}/*` },
      body: JSON.stringify(rows),
    });
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page).toHaveTitle(/Fé|Feconecta/i);

  const storyButton = page.getByRole('button', { name: 'Ver stories de Maria Teste' });
  await expect(storyButton).toBeVisible({ timeout: 30000 });
  await expect(page.locator('nextjs-portal')).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Ver stories de Maria Teste' })).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Ver stories de Maria Teste' }).click();
  await expect(page.getByText('Story de teste do carrossel')).toBeVisible();
  await expect(page.locator('nextjs-portal')).toHaveCount(0);
  expect(runtimeErrors).toEqual([]);
});
