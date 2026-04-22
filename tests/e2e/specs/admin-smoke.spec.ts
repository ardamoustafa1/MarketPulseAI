import { test, expect } from '@playwright/test';

test('admin login page is reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'MarketPulse Admin' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in to admin' })).toBeVisible();
});
