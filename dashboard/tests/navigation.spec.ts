import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
  // We can't really navigate deeply without a session, 
  // but we can check the login page is the entry point.
  
  test('redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/');
    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page has brand elements', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText(/IPB LSA Dashboard/i);
    await expect(page.getByRole('button', { name: /Lanjutkan dengan Google/i })).toBeVisible();
  });
});
