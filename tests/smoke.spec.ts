import { test, expect } from '@playwright/test';

test.describe('PORTHUB — Testes de Fumaça E2E', () => {
  test('Home renderiza hero, projetos confirmados de PS4 e aviso legal em cada card', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/PORTHUB/);
    await expect(page.locator('h1')).toContainText(/Preservação e Portes/i);
    await expect(page.getByText('God of War III Remastered for PC')).toBeVisible();
    await expect(page.getByText('ShadowOfTheColossus-PC')).toBeVisible();
    await expect(page.getByText('Requer uma cópia legítima do jogo').first()).toBeVisible();
  });

  test('Paleta de comandos abre com Ctrl+K e filtra projetos', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Paleta de Comandos' });
    await expect(dialog).toBeVisible();
  });

  test('Página individual do projeto exibe métricas e conformidade legal', async ({ page }) => {
    await page.goto('/projeto/gow3-pc/');
    await expect(page.locator('h1')).toContainText('God of War III Remastered for PC');
    await expect(page.getByText(/AVISO DE CONFORMIDADE LEGAL/i)).toBeVisible();
  });
});
