import { test, expect } from '@playwright/test';

test('add cell, run all sequentially, outputs isolated, delete cell', async ({ page }) => {
  await page.goto('/');

  // Initially one cell exists (from store default).
  await expect(page.getByRole('button', { name: 'Delete cell' })).toHaveCount(1);

  // Add a second cell
  await page.getByRole('button', { name: 'Add cell' }).click();
  await expect(page.getByRole('button', { name: 'Delete cell' })).toHaveCount(2);

  // After adding, window.__pyEditor should reference the last mounted editor (second cell)
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __pyEditor?: unknown }).__pyEditor),
  );
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = (window as any).__pyEditor as { setValue: (code: string) => void };
    editor.setValue("import time\nprint('Second')\ntime.sleep(0.4)");
  });

  // Run all; ensure button disables while any cell runs
  const runAll = page.getByRole('button', { name: 'Execute all cells' });
  await expect(runAll).toBeEnabled();
  await runAll.click();
  await expect(runAll).toBeDisabled();

  // Wait for outputs to appear in both cells
  const outputs = page.locator('pre');
  await expect(outputs.nth(0)).toContainText('Hello from Python');
  await expect(outputs.nth(1)).toContainText('Second');

  // Delete the second cell with confirmation
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Delete cell' }).nth(1).click();
  await expect(page.getByRole('button', { name: 'Delete cell' })).toHaveCount(1);
});
