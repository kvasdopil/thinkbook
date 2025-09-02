import { test, expect } from '@playwright/test';

// Setup console output redirection
test.beforeEach(async ({ page }) => {
  // Redirect console.log and console.error to CLI output
  page.on('console', (msg) => {
    if (msg.type() === 'log') {
      console.log('PAGE LOG:', msg.text());
    } else if (msg.type() === 'error') {
      console.error('PAGE ERROR:', msg.text());
    }
  });
});

test.describe('Execution Cancellation', () => {
  test('should show Stop button during execution', async ({ page }) => {
    await page.goto('/');

    // Wait for Python to be ready
    await expect(page.locator('[data-testid="run-button"]')).toBeVisible({
      timeout: 120000,
    });

    // Enter long-running code
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type(
      'import time\nfor i in range(10):\n    print(f"Iteration {i}")\n    time.sleep(1)',
    );

    // Click run button
    await page.click('[data-testid="run-button"]');

    // Stop button should appear
    await expect(page.locator('[data-testid="stop-button"]')).toBeVisible({
      timeout: 5000,
    });

    // Run button should be hidden
    await expect(page.locator('[data-testid="run-button"]')).not.toBeVisible();

    // Click stop to clean up
    await page.click('[data-testid="stop-button"]');
  });

  test('should show Stopping state when cancelling', async ({ page }) => {
    await page.goto('/');

    // Wait for Python to be ready
    await expect(page.locator('[data-testid="run-button"]')).toBeVisible({
      timeout: 120000,
    });

    // Enter infinite loop code
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type('while True:\n    pass');

    // Click run button
    await page.click('[data-testid="run-button"]');

    // Wait for execution to start
    await expect(page.locator('[data-testid="stop-button"]')).toBeVisible({
      timeout: 5000,
    });

    // Click stop
    await page.click('[data-testid="stop-button"]');

    // Should show stopping state
    await expect(page.locator('[data-testid="stopping-button"]')).toBeVisible();
    await expect(page.locator('text=Stopping...')).toBeVisible();

    // Should eventually return to idle state
    await expect(page.locator('[data-testid="run-button"]')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should cancel infinite loop execution immediately', async ({
    page,
  }) => {
    await page.goto('/');

    // Wait for Python to be ready
    await expect(page.locator('[data-testid="run-button"]')).toBeVisible({
      timeout: 120000,
    });

    // Enter infinite loop code
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type(
      'while True:\n    print("Running...")\n    import time\n    time.sleep(0.1)',
    );

    // Click run button
    await page.click('[data-testid="run-button"]');

    // Wait for execution to start
    await expect(page.locator('[data-testid="stop-button"]')).toBeVisible({
      timeout: 5000,
    });

    // Cancel immediately
    await page.click('[data-testid="stop-button"]');

    // Should show cancellation message in output
    await expect(
      page.locator('text=Execution interrupted by user'),
    ).toBeVisible({ timeout: 10000 });

    // Should be able to run again
    await expect(page.locator('[data-testid="run-button"]')).toBeVisible();
  });

  test('should handle race condition between cancellation and natural completion', async ({
    page,
  }) => {
    await page.goto('/');

    // Wait for Python to be ready
    await expect(page.locator('[data-testid="run-button"]')).toBeVisible({
      timeout: 120000,
    });

    // Enter short-running code
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type('print("Hello, World!")');

    // Click run button
    await page.click('[data-testid="run-button"]');

    // Try to cancel quickly (might complete before cancellation)
    const stopButton = page.locator('[data-testid="stop-button"]');
    if (await stopButton.isVisible()) {
      await stopButton.click();
    }

    // Should either complete successfully or be cancelled
    const runButton = page.locator('[data-testid="run-button"]');
    await expect(runButton).toBeVisible({ timeout: 10000 });

    // Output should show either the print result or cancellation message
    const output = page.locator('[data-testid="notebook-cell"] pre');
    if (await output.isVisible()) {
      const outputText = await output.textContent();
      expect(outputText).toMatch(
        /(Hello, World!|Execution interrupted by user)/,
      );
    }
  });

  test('should display SharedArrayBuffer warning when unavailable', async ({
    page,
  }) => {
    // Override SharedArrayBuffer to simulate unsupported environment
    await page.addInitScript(() => {
      delete (window as typeof window & { SharedArrayBuffer?: unknown })
        .SharedArrayBuffer;
    });

    await page.goto('/');

    // Wait for Python to be ready
    await expect(page.locator('[data-testid="run-button"]')).toBeVisible({
      timeout: 120000,
    });

    // Should show warning about immediate cancellation being unavailable
    await expect(
      page.locator('text=Immediate cancellation unavailable'),
    ).toBeVisible();

    // Execution should still work but cancellation will be limited
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type('print("Test without SharedArrayBuffer")');

    await page.click('[data-testid="run-button"]');

    // Should still show output
    await expect(
      page.locator('text=Test without SharedArrayBuffer'),
    ).toBeVisible({ timeout: 10000 });
  });

  test('should show running indicator during execution', async ({ page }) => {
    await page.goto('/');

    // Wait for Python to be ready
    await expect(page.locator('[data-testid="run-button"]')).toBeVisible({
      timeout: 120000,
    });

    // Enter code with delay
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type('import time\ntime.sleep(2)\nprint("Done")');

    // Click run button
    await page.click('[data-testid="run-button"]');

    // Should show running indicator
    await expect(page.locator('text=Running...')).toBeVisible();

    // Running indicator should be blue
    const runningIndicator = page.locator(
      '.bg-blue-500:has-text("Running...")',
    );
    await expect(runningIndicator).toBeVisible();

    // Wait for completion
    await expect(page.locator('text=Done')).toBeVisible({ timeout: 10000 });

    // Running indicator should disappear
    await expect(page.locator('text=Running...')).not.toBeVisible();
  });

  test('should show stopping indicator during cancellation', async ({
    page,
  }) => {
    await page.goto('/');

    // Wait for Python to be ready
    await expect(page.locator('[data-testid="run-button"]')).toBeVisible({
      timeout: 120000,
    });

    // Enter infinite loop code
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type(
      'while True:\n    import time\n    time.sleep(0.1)',
    );

    // Click run button
    await page.click('[data-testid="run-button"]');

    // Wait for execution to start
    await expect(page.locator('[data-testid="stop-button"]')).toBeVisible({
      timeout: 5000,
    });

    // Click stop
    await page.click('[data-testid="stop-button"]');

    // Should show stopping indicator
    await expect(page.locator('text=Stopping...')).toBeVisible();

    // Stopping indicator should be yellow
    const stoppingIndicator = page.locator(
      '.bg-yellow-500:has-text("Stopping...")',
    );
    await expect(stoppingIndicator).toBeVisible();

    // Should eventually complete cancellation
    await expect(page.locator('[data-testid="run-button"]')).toBeVisible({
      timeout: 10000,
    });

    // Stopping indicator should disappear
    await expect(page.locator('text=Stopping...')).not.toBeVisible();
  });

  test('should handle multiple rapid cancellations gracefully', async ({
    page,
  }) => {
    await page.goto('/');

    // Wait for Python to be ready
    await expect(page.locator('[data-testid="run-button"]')).toBeVisible({
      timeout: 120000,
    });

    // Enter infinite loop code
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type('while True:\n    pass');

    // Run and cancel multiple times quickly
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="run-button"]');

      // Wait for stop button to appear
      await expect(page.locator('[data-testid="stop-button"]')).toBeVisible({
        timeout: 5000,
      });

      // Cancel immediately
      await page.click('[data-testid="stop-button"]');

      // Wait for run button to return
      await expect(page.locator('[data-testid="run-button"]')).toBeVisible({
        timeout: 10000,
      });
    }

    // Should still be functional after multiple cancellations
    await page.keyboard.selectAll();
    await page.keyboard.type('print("Still working!")');
    await page.click('[data-testid="run-button"]');

    await expect(page.locator('text=Still working!')).toBeVisible({
      timeout: 10000,
    });
  });

  test('should preserve output before cancellation', async ({ page }) => {
    await page.goto('/');

    // Wait for Python to be ready
    await expect(page.locator('[data-testid="run-button"]')).toBeVisible({
      timeout: 120000,
    });

    // Enter code that prints then loops
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.type('print("Before loop")\nwhile True:\n    pass');

    // Click run button
    await page.click('[data-testid="run-button"]');

    // Wait for initial output
    await expect(page.locator('text=Before loop')).toBeVisible({
      timeout: 5000,
    });

    // Wait for stop button and click it
    await expect(page.locator('[data-testid="stop-button"]')).toBeVisible({
      timeout: 5000,
    });
    await page.click('[data-testid="stop-button"]');

    // Should still show the output from before cancellation
    await expect(page.locator('text=Before loop')).toBeVisible();

    // Should also show cancellation message
    await expect(
      page.locator('text=Execution interrupted by user'),
    ).toBeVisible({ timeout: 10000 });
  });
});
