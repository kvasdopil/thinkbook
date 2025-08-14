import { test, expect } from '@playwright/test';

test('shows Hello World and Python Runner on the homepage', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Python Runner');
  await expect(page.locator('text=Hello World')).toBeVisible();
});
