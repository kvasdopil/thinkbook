import { test, expect } from '@playwright/test';

test.describe('Streaming Output', () => {
  test.beforeEach(async ({ page }) => {
    // Redirect console logs to CLI output
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (error) =>
      console.error('PAGE ERROR:', error.message),
    );

    await page.goto('/');
  });

  test('displays output immediately for simple print statements', async ({
    page,
  }) => {
    // Wait for the page to load and find a notebook cell
    const notebookCell = page.locator('[data-testid="notebook-cell"]').first();
    await expect(notebookCell).toBeVisible();

    // Find the code editor and enter a simple print statement
    const codeEditor = notebookCell.locator('.monaco-editor');
    await expect(codeEditor).toBeVisible();

    // Click in the editor and enter code
    await codeEditor.click();
    await page.keyboard.type('print("Hello, streaming world!")');

    // Wait for Python to be ready (loader should disappear)
    await expect(page.locator('text=Loading Python...')).not.toBeVisible({
      timeout: 60000,
    });

    // Click the Run button
    const runButton = notebookCell.locator('button:has-text("Run")');
    await expect(runButton).toBeEnabled();
    await runButton.click();

    // Verify output appears quickly (should be streaming, not waiting for completion)
    const outputSection = notebookCell
      .locator('text=Output')
      .locator('..')
      .locator('..');
    await expect(outputSection).toBeVisible({ timeout: 5000 });

    // Check that the output contains the expected text
    await expect(outputSection).toContainText('Hello, streaming world!', {
      timeout: 10000,
    });

    // Verify the run button is re-enabled after completion
    await expect(runButton).toBeEnabled({ timeout: 15000 });
  });

  test('shows progressive output for scripts with delays', async ({ page }) => {
    // Wait for the page to load and find a notebook cell
    const notebookCell = page.locator('[data-testid="notebook-cell"]').first();
    await expect(notebookCell).toBeVisible();

    // Find the code editor and enter code with time delays
    const codeEditor = notebookCell.locator('.monaco-editor');
    await expect(codeEditor).toBeVisible();

    // Click in the editor and enter code with delays
    await codeEditor.click();
    await page.keyboard.type(
      [
        'import time',
        'print("First line")',
        'time.sleep(1)',
        'print("Second line")',
        'time.sleep(1)',
        'print("Third line")',
      ].join('\\n'),
    );

    // Wait for Python to be ready
    await expect(page.locator('text=Loading Python...')).not.toBeVisible({
      timeout: 60000,
    });

    // Click the Run button
    const runButton = notebookCell.locator('button:has-text("Run")');
    await expect(runButton).toBeEnabled();
    await runButton.click();

    // Check that first line appears quickly
    const outputSection = notebookCell
      .locator('text=Output')
      .locator('..')
      .locator('..');
    await expect(outputSection).toContainText('First line', { timeout: 5000 });

    // Check that second line appears after delay (but before total completion)
    await expect(outputSection).toContainText('Second line', { timeout: 8000 });

    // Check that third line appears
    await expect(outputSection).toContainText('Third line', { timeout: 8000 });

    // Verify the run button is re-enabled after completion
    await expect(runButton).toBeEnabled({ timeout: 5000 });
  });

  test('handles mixed stdout and stderr streaming', async ({ page }) => {
    // Wait for the page to load and find a notebook cell
    const notebookCell = page.locator('[data-testid="notebook-cell"]').first();
    await expect(notebookCell).toBeVisible();

    // Find the code editor and enter code that outputs to both stdout and stderr
    const codeEditor = notebookCell.locator('.monaco-editor');
    await expect(codeEditor).toBeVisible();

    // Click in the editor and enter mixed output code
    await codeEditor.click();
    await page.keyboard.type(
      [
        'import sys',
        'print("This is stdout")',
        'print("This is stderr", file=sys.stderr)',
        'print("Back to stdout")',
      ].join('\\n'),
    );

    // Wait for Python to be ready
    await expect(page.locator('text=Loading Python...')).not.toBeVisible({
      timeout: 60000,
    });

    // Click the Run button
    const runButton = notebookCell.locator('button:has-text("Run")');
    await expect(runButton).toBeEnabled();
    await runButton.click();

    // Check that all output appears in the output section
    const outputSection = notebookCell
      .locator('text=Output')
      .locator('..')
      .locator('..');
    await expect(outputSection).toContainText('This is stdout', {
      timeout: 10000,
    });
    await expect(outputSection).toContainText('This is stderr', {
      timeout: 10000,
    });
    await expect(outputSection).toContainText('Back to stdout', {
      timeout: 10000,
    });

    // Verify execution completes
    await expect(runButton).toBeEnabled({ timeout: 15000 });
  });

  test('preserves execution button disabled state during streaming', async ({
    page,
  }) => {
    // Wait for the page to load and find a notebook cell
    const notebookCell = page.locator('[data-testid="notebook-cell"]').first();
    await expect(notebookCell).toBeVisible();

    // Find the code editor and enter long-running code
    const codeEditor = notebookCell.locator('.monaco-editor');
    await expect(codeEditor).toBeVisible();

    // Click in the editor and enter code with longer delay
    await codeEditor.click();
    await page.keyboard.type(
      [
        'import time',
        'print("Starting long task...")',
        'time.sleep(3)',
        'print("Task completed!")',
      ].join('\\n'),
    );

    // Wait for Python to be ready
    await expect(page.locator('text=Loading Python...')).not.toBeVisible({
      timeout: 60000,
    });

    // Click the Run button
    const runButton = notebookCell.locator('button:has-text("Run")');
    await expect(runButton).toBeEnabled();
    await runButton.click();

    // Verify that button becomes a Stop button during execution
    const stopButton = notebookCell.locator('button:has-text("Stop")');
    await expect(stopButton).toBeVisible({ timeout: 2000 });

    // Wait for first output to appear (streaming should work)
    const outputSection = notebookCell
      .locator('text=Output')
      .locator('..')
      .locator('..');
    await expect(outputSection).toContainText('Starting long task...', {
      timeout: 5000,
    });

    // Verify Stop button is still visible (execution is ongoing)
    await expect(stopButton).toBeVisible();

    // Wait for completion
    await expect(outputSection).toContainText('Task completed!', {
      timeout: 10000,
    });

    // Verify button returns to Run after completion
    await expect(runButton).toBeVisible({ timeout: 5000 });
    await expect(runButton).toBeEnabled();
  });

  test('handles error streaming correctly', async ({ page }) => {
    // Wait for the page to load and find a notebook cell
    const notebookCell = page.locator('[data-testid="notebook-cell"]').first();
    await expect(notebookCell).toBeVisible();

    // Find the code editor and enter code that will cause an error
    const codeEditor = notebookCell.locator('.monaco-editor');
    await expect(codeEditor).toBeVisible();

    // Click in the editor and enter code that errors
    await codeEditor.click();
    await page.keyboard.type(
      [
        'print("Before error")',
        'undefined_variable',
        'print("After error - should not appear")',
      ].join('\\n'),
    );

    // Wait for Python to be ready
    await expect(page.locator('text=Loading Python...')).not.toBeVisible({
      timeout: 60000,
    });

    // Click the Run button
    const runButton = notebookCell.locator('button:has-text("Run")');
    await expect(runButton).toBeEnabled();
    await runButton.click();

    // Check that output before error appears
    const outputSection = notebookCell
      .locator('text=Output')
      .locator('..')
      .locator('..');
    await expect(outputSection).toContainText('Before error', {
      timeout: 10000,
    });

    // Check that error message appears (should be streaming)
    await expect(outputSection).toContainText('NameError', { timeout: 10000 });

    // Verify the message after error does NOT appear
    await expect(outputSection).not.toContainText(
      'After error - should not appear',
    );

    // Verify button is re-enabled after error
    await expect(runButton).toBeEnabled({ timeout: 5000 });
  });
});
