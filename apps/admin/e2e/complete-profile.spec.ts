import { test, expect } from '@playwright/test';

test.describe('Completar Perfil', () => {
  test('Redireciona para /complete-profile se o perfil estiver incompleto', async ({ page }) => {
    // 1. Mocar as chamadas da API do Supabase Auth para simular um usuário logado
    await page.route('**/auth/v1/user**', async (route) => {
       await route.fulfill({
         status: 200,
         contentType: 'application/json',
         body: JSON.stringify({
           id: '44444444-4444-4444-8444-444444444444',
           aud: 'authenticated',
           role: 'authenticated',
           email: 'fake@example.com'
         })
       });
    });
    
    // 2. Interceptar a chamada à tabela profiles e retornar um perfil sem os campos obrigatórios
    await page.route('**/rest/v1/profiles?*', async (route) => {
      // Ignora chamadas OPTIONS
      if (route.request().method() === 'OPTIONS') {
         await route.continue();
         return;
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '44444444-4444-4444-8444-444444444444',
          username: null,
          full_name: 'Fake User',
          role: 'user',
          city: null, // Campo nulo para forçar redirecionamento
          phone: null,
          birthdate: null,
          accepted_terms: false
        })
      });
    });

    // 3. Injetar a sessão no localStorage ANTES da página carregar
    await page.addInitScript(() => {
      const now = Math.floor(Date.now() / 1000);
      window.localStorage.setItem('fc_profile_cache', JSON.stringify({
        id: '44444444-4444-4444-8444-444444444444',
        username: null,
        full_name: 'Fake User',
        role: 'user',
        accepted_terms: false,
      }));
      window.localStorage.setItem('fc-auth-token', JSON.stringify({
        access_token: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${btoa(JSON.stringify({
          sub: '44444444-4444-4444-8444-444444444444',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'fake@example.com',
          exp: now + 3600,
          iat: now,
        })).replace(/=/g, '')}.playwright-signature`,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: now + 3600,
        refresh_token: 'fake-refresh-token',
        user: {
          id: '44444444-4444-4444-8444-444444444444',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'fake@example.com',
        }
      }));
    });

    // 4. Acessar a rota raiz (Feed)
    await page.goto('/');

    // 5. Verificar se a aplicação nos redirecionou forçadamente para /complete-profile
    await page.waitForURL('**/complete-profile', { timeout: 20000 });
    
    // 6. Verificar se o componente "Completar Perfil" está visível
    const heading = page.locator('h1', { hasText: 'Completar Perfil' });
    await expect(heading).toBeVisible();
    
    const locationSection = page.locator('h4', { hasText: 'Localização' });
    await expect(locationSection).toBeVisible();
  });
});
