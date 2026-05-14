# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings.spec.ts >> Event Settings Flow >> validates required fields in settings
- Location: tests/settings.spec.ts:29:7

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('input[name="email"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - heading "IPB LSA Dashboard" [level=1] [ref=e5]
        - paragraph [ref=e6]: Masuk dengan akun Google yang terdaftar.
      - button "Lanjutkan dengan Google" [ref=e7] [cursor=pointer]
  - alert [ref=e8]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Event Settings Flow', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Basic auth bypass if needed, but here we assume the login test already works
  6  |     await page.goto('/login');
  7  |     // Assuming credentials from previous conversation context
> 8  |     await page.fill('input[name="email"]', 'admin@example.com');
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  9  |     await page.fill('input[name="password"]', 'password');
  10 |     await page.click('button[type="submit"]');
  11 |     await expect(page).toHaveURL(/\/events/);
  12 |   });
  13 | 
  14 |   test('can navigate settings tabs', async ({ page }) => {
  15 |     // Navigate to a specific event (using the one from logs)
  16 |     await page.goto('/events/ipb-art-fest-2026/settings');
  17 |     
  18 |     await expect(page.locator('h2')).toContainText('Event Info Settings');
  19 |     
  20 |     // Click Timeline tab
  21 |     await page.click('button:has-text("Timeline")');
  22 |     await expect(page.locator('h2')).toContainText('Event Timeline Display');
  23 |     
  24 |     // Click Danger Zone
  25 |     await page.click('button:has-text("Danger Zone")');
  26 |     await expect(page.locator('h3')).toContainText('Hapus Event');
  27 |   });
  28 | 
  29 |   test('validates required fields in settings', async ({ page }) => {
  30 |     await page.goto('/events/ipb-art-fest-2026/settings');
  31 |     
  32 |     // Clear event name
  33 |     await page.fill('input[placeholder*="Contoh: IPB Sport"]', '');
  34 |     await page.click('button:has-text("Save Info")');
  35 |     
  36 |     // Check for validation error (Zod error passed back)
  37 |     // In our implementation, it shows a toast or text
  38 |     await expect(page.locator('text=Gagal menyimpan')).toBeVisible();
  39 |   });
  40 | });
  41 | 
```