import { test, expect } from '@playwright/test';

test('worker persists across parent re-renders and streams output', async ({ page }) => {
  await page.goto('/');

  // Wait for the editor to be mounted and set code programmatically
  await page.waitForFunction(() =>
    Boolean((window as unknown as { __pyEditor?: unknown }).__pyEditor),
  );
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = (window as any).__pyEditor as {
      setValue: (code: string) => void;
      getValue: () => string;
    };
    editor.setValue("import time\nfor i in range(5):\n    print('line', i)\n    time.sleep(0.1)");
  });
  await page.waitForFunction(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ed = (window as any).__pyEditor as { getValue: () => string } | undefined;
    return ed?.getValue().includes("print('line', i)") ?? false;
  });

  // Click Run
  await page.getByRole('button', { name: 'Run' }).click();

  // Trigger parent re-render repeatedly while the worker runs
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Re-render parent' }).click();
    await page.waitForTimeout(60);
  }

  // Ensure streaming output appears and survived re-renders
  await expect(page.locator('pre')).toContainText('line');
});

test('can cancel long-running execution using Stop', async ({ page }) => {
  await page.goto('/');

  await page.waitForFunction(() =>
    Boolean((window as unknown as { __pyEditor?: unknown }).__pyEditor),
  );
  await page.evaluate(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const editor = (window as any).__pyEditor as { setValue: (code: string) => void };
    editor.setValue("import time\nwhile True:\n    print('tick')\n    time.sleep(0.05)");
  });

  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.locator('pre')).toContainText('tick');

  await page.getByRole('button', { name: 'Stop' }).click();

  await expect(page.locator('pre')).toContainText('Stopping...');
  await expect(page.locator('pre')).toContainText('Execution interrupted by user');
});
