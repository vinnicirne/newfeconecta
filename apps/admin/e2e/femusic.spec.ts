import { expect, test } from '@playwright/test';

test('FéMusic remove o composer e mantém o compartilhamento da faixa no feed no mobile', async ({ page }) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.addInitScript(() => {
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem('feconecta_onboard_v1_seen', 'true');
    localStorage.setItem('fc_profile_cache', JSON.stringify({
      id: '44444444-4444-4444-8444-444444444444',
      username: 'e2e-music-user',
      full_name: 'Usuário E2E',
      role: 'user',
      is_verified: false,
    }));
    localStorage.setItem('fc-auth-token', JSON.stringify({
      access_token: 'playwright-fake-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: now + 3600,
      refresh_token: 'playwright-fake-refresh-token',
      user: {
        id: '44444444-4444-4444-8444-444444444444',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'e2e@example.invalid',
        user_metadata: { full_name: 'Usuário E2E' },
      },
    }));
  });
  await page.route('**/api/music/search**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ results: [] }),
  }));
  await page.route('**/auth/v1/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: '44444444-4444-4444-8444-444444444444',
      aud: 'authenticated',
      role: 'authenticated',
      email: 'e2e@example.invalid',
      user_metadata: { full_name: 'Usuário E2E' },
    }),
  }));
  await page.route('**/rest/v1/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { 'content-range': '0-0/*' },
    body: '[]',
  }));

  await page.goto('/music');
  await expect(page.getByText('O que vamos louvar hoje?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Compartilhar um louvor' })).toHaveCount(0);

  await page.getByText('Lugar Secreto', { exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Compartilhar música' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Compartilhar música' }).click();
  await expect(page.getByText('Compartilhar no Feed FéConecta')).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});
