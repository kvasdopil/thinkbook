import { test, expect } from '@playwright/test';

test('displays Hello World message', async ({ page }) => {
  // Redirect console logs to CLI output
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', (error) => console.error('PAGE ERROR:', error.message));

  await page.goto('/');

  // Verify the Hello World message is displayed
  await expect(page.locator('h1')).toContainText('Hello World');

  // Verify the page structure
  await expect(page.locator('h1')).toHaveClass(/text-4xl/);
  await expect(page.locator('div.min-h-screen')).toBeVisible();
});
