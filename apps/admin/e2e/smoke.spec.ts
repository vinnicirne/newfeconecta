import { test, expect } from '@playwright/test';

test.describe('FéConecta Smoke Test', () => {
  test('A aplicação renderiza sem erros críticos de hidratação (Next.js)', async ({ page }) => {
    // Acessa a rota raiz (que normalmente redireciona ou mostra o conteúdo)
    await page.goto('/');
    
    // Confirma que não apareceu o overlay de erro do Next.js (Error: Invariant)
    const nextjsErrorOverlay = page.locator('nextjs-portal');
    await expect(nextjsErrorOverlay).toHaveCount(0);

    // Opcional: Garante que o título tem 'Fé' no nome (ajuste conforme o título real)
    await expect(page).toHaveTitle(/Fé|Feconecta/i);
  });

  test('A página de login está acessível', async ({ page }) => {
    await page.goto('/login');
    
    // Verifica se a estrutura de login existe na página. Pode ser um botão Entrar ou formulário.
    // Estamos verificando se um botão genérico de "Entrar", "Login" ou algo similar está visível.
    const loginButton = page.locator('button', { hasText: /Entrar|Login/i }).first();
    await expect(loginButton).toBeVisible();
  });
});
