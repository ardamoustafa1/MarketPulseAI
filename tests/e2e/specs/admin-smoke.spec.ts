import { test, expect } from '@playwright/test';

test('admin login page is reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/MarketPulse|Vite/i);
});
