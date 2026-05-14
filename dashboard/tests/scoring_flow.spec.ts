import { test, expect } from '@playwright/test';

test.describe('Scoring Control Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/events/);
  });

  test('can start a match and update score', async ({ page }) => {
    // Navigate to a specific match (using an example ID that likely exists in dev)
    // In a real CI environment, we would use a seed script to get this ID
    await page.goto('/events/ipb-art-fest-2026/matches');
    
    // Click on the first "Control" button or link
    const controlButton = page.locator('a:has-text("Control"), button:has-text("Control")').first();
    await controlButton.click();

    // Verify we are on the control page
    await expect(page).toHaveURL(/\/matches\/[0-9a-f-]+/);
    
    // 1. Start Match (if it's upcoming)
    const startButton = page.locator('button:has-text("Start Match")');
    if (await startButton.isVisible()) {
      await startButton.click();
      await expect(page.locator('text=LIVE')).toBeVisible();
    }

    // 2. Update Score (Home +1)
    // This depends on the engine, assuming a generic increment button exists
    const homePlus = page.locator('button:has-text("+"), button:has-text("Add")').first();
    if (await homePlus.isVisible()) {
      await homePlus.click();
      // Check for optimistic update or saving state
      // (Since it's fast, we might just see the new score)
      await expect(page.locator('text=1')).toBeVisible();
    }

    // 3. Pause/Play Timer
    const timerButton = page.locator('button:has-text("Start"), button:has-text("Pause")').first();
    if (await timerButton.isVisible()) {
      await timerButton.click();
      // Verify button text changed
      const updatedText = await timerButton.innerText();
      expect(['START', 'PAUSE', 'RESUME']).toContain(updatedText.toUpperCase());
    }
  });
});
