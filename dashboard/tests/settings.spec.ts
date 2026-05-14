import { test, expect } from '@playwright/test';

test.describe('Event Settings Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Basic auth bypass if needed, but here we assume the login test already works
    await page.goto('/login');
    // Assuming credentials from previous conversation context
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/events/);
  });

  test('can navigate settings tabs', async ({ page }) => {
    // Navigate to a specific event (using the one from logs)
    await page.goto('/events/ipb-art-fest-2026/settings');
    
    await expect(page.locator('h2')).toContainText('Event Info Settings');
    
    // Click Timeline tab
    await page.click('button:has-text("Timeline")');
    await expect(page.locator('h2')).toContainText('Event Timeline Display');
    
    // Click Danger Zone
    await page.click('button:has-text("Danger Zone")');
    await expect(page.locator('h3')).toContainText('Hapus Event');
  });

  test('validates required fields in settings', async ({ page }) => {
    await page.goto('/events/ipb-art-fest-2026/settings');
    
    // Clear event name
    await page.fill('input[placeholder*="Contoh: IPB Sport"]', '');
    await page.click('button:has-text("Save Info")');
    
    // Check for validation error (Zod error passed back)
    // In our implementation, it shows a toast or text
    await expect(page.locator('text=Gagal menyimpan')).toBeVisible();
  });
});
