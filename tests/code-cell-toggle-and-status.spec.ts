import { test, expect } from '@playwright/test';

test('code editor is hidden by default and toggles visibility', async ({ page }) => {
  await page.goto('/');

  const editorContainer = page.locator('[data-testid="code-editor"]');
  await expect(editorContainer).toHaveAttribute('aria-hidden', 'true');

  const toggleButton = page.getByRole('button', { name: /show code/i });
  await expect(toggleButton).toBeVisible();
  await toggleButton.click();

  await expect(editorContainer).toHaveAttribute('aria-hidden', 'false');

  const hideButton = page.getByRole('button', { name: /hide code/i });
  await hideButton.click();
  await expect(editorContainer).toHaveAttribute('aria-hidden', 'true');
});

test('status button reflects running and can cancel execution', async ({ page }) => {
  await page.goto('/');

  // Wait for the editor to be ready and set long-running code
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __pyEditor?: unknown }).__pyEditor),
  );
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = (window as any).__pyEditor as { setValue: (code: string) => void };
    editor.setValue("import time\nwhile True:\n    print('tick')\n    time.sleep(0.05)");
  });

  // Ensure worker is ready (Run button enabled)
  await expect(page.getByRole('button', { name: 'Run' })).toBeEnabled();

  // Click status button to Run
  await page.getByRole('button', { name: /status: idle/i }).click();

  // Wait until running
  await expect(page.getByRole('button', { name: /status: running/i })).toBeVisible();
  await expect(page.locator('pre')).toContainText('tick');

  // Click status button again to Stop
  await page.getByRole('button', { name: /status: running/i }).click();

  await expect(page.locator('pre')).toContainText('Execution interrupted by user');
  await expect(page.getByRole('button', { name: /status: cancelled/i })).toBeVisible();
});
