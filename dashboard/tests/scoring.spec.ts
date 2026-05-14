import { test, expect } from '@playwright/test';

test.describe('Scoring Flow', () => {
  test.skip('can update score in a match', async ({ page }) => {
    // This requires a mock session and match data
    // 1. Login as SuperAdmin
    // 2. Navigate to an event's matches
    // 3. Click "Scoring" on a match
    // 4. Update home score
    // 5. Verify change is saved
  });
});
