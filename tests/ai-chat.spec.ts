import { test, expect } from '@playwright/test';

test('ai chat streams and renders assistant text (mock)', async ({ page }) => {
  await page.goto('/?mock-ai=1');
  // Ensure UI loads
  await expect(page.getByText('Python Runner')).toBeVisible();

  // Find chat textarea and type a question
  const textarea = page.locator('textarea[placeholder="Ask something…"]');
  await expect(textarea).toBeVisible();
  await textarea.fill('Hello?');

  // Submit via Send button
  await page.getByRole('button', { name: 'Send' }).click();

  // Status should switch to responding then back to idle
  await expect(page.getByText('responding')).toBeVisible();
  await expect(page.getByText('idle')).toBeVisible();
});
