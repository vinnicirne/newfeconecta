import { expect, test } from '@playwright/test';

const authorId = '11111111-1111-4111-8111-111111111111';
const firstImage = '/logo-fc.png?slide=1';
const secondImage = '/logo-fc.png?slide=2';
const thirdImage = '/logo-fc.png?slide=3';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=', 'base64');

test('o feed preserva as fotos salvas e a galeria aceita várias imagens', async ({ page }) => {
  test.setTimeout(60000);
  await page.addInitScript((id) => {
    localStorage.setItem('fc_profile_cache', JSON.stringify({ id, username: 'perfil-teste', full_name: 'Perfil de teste' }));
    localStorage.setItem('fc_feed_controls_v1', JSON.stringify({ show_daily_verse: false, show_fenamoro_banner: false }));
  }, authorId);

  await page.route('**/logo-fc.png?slide=*', (route) => route.fulfill({
    contentType: 'image/png',
    body: png,
  }));

  await page.route('**/rest/v1/**', async (route) => {
    const table = new URL(route.request().url()).pathname.split('/').pop();
    let rows: unknown[] = [];
    if (table === 'profiles') rows = [{ id: authorId, full_name: 'Perfil de teste', username: 'perfil-teste' }];
    if (table === 'posts') rows = [{
      id: '22222222-2222-4222-8222-222222222222',
      user_id: authorId,
      post_type: 'image',
      content: 'Publicação com fotos para o teste',
      created_at: '2026-11-20T19:00:00Z',
      media_url: firstImage,
      metadata: { media_layout: 'carousel', media_urls: [firstImage, secondImage, thirdImage] },
    }];
    await route.fulfill({ json: rows });
  });

  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  const carousel = page.getByRole('region', { name: 'Publicação com 3 imagens' });
  await expect(carousel).toBeVisible({ timeout: 30000 });
  await page.reload();
  await expect(carousel).toBeVisible({ timeout: 30000 });
  await expect(carousel.getByText('1/3', { exact: true })).toBeVisible();
  await carousel.getByRole('button', { name: 'Próxima imagem' }).click();
  await expect(carousel.getByText('2/3', { exact: true })).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 900 });
  const gallery = page.getByRole('button', { name: 'Criar publicação de galeria' });
  await expect(gallery).toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar publicação de carrossel' })).toHaveCount(0);

  const chooserPromise = page.waitForEvent('filechooser');
  await gallery.click();
  const chooser = await chooserPromise;
  await chooser.setFiles([
    { name: 'primeira.png', mimeType: 'image/png', buffer: png },
    { name: 'segunda.png', mimeType: 'image/png', buffer: png },
  ]);
  await expect(page.getByLabel('Fotos do carrossel')).toBeVisible();
  await expect(page.getByAltText('Foto 2 de 2')).toBeAttached();
});
