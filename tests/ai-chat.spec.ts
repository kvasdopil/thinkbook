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

  // Wait for the response to render

  // Markdown should render: heading text, table, and code block
  await expect(page.getByText('Mock Markdown')).toBeVisible();
  await expect(page.locator('.ai-markdown table')).toBeVisible();
  await expect(page.locator('.ai-markdown pre code')).toBeVisible();
});
