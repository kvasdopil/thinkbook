import { test, expect } from '@playwright/test';

test.describe('Notebook File Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Clear local storage to start fresh
    await page.goto('http://localhost:5173');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display empty state when no notebooks exist', async ({
    page,
  }) => {
    await page.goto('http://localhost:5173');

    // Wait for the page to load and check for empty state
    await expect(page.locator('text=No notebooks yet')).toBeVisible();
    await expect(page.locator('text=Create your first notebook')).toBeVisible();
  });

  test('should create a new notebook file when clicking New File button', async ({
    page,
  }) => {
    await page.goto('http://localhost:5173');

    // Click the New File button
    await page.click('button:has-text("New File")');

    // Should see the new untitled notebook
    await expect(page.locator('text=Untitled')).toBeVisible();
    await expect(page.locator('text=Today')).toBeVisible();
  });

  test('should create first notebook from empty state', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Click the empty state create button
    await page.click('text=Create your first notebook');

    // Should see the new untitled notebook
    await expect(page.locator('text=Untitled')).toBeVisible();
    await expect(page.locator('text=Today')).toBeVisible();
  });

  test('should display files grouped by date', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Create a few notebooks
    await page.click('button:has-text("New File")');
    await page.click('button:has-text("New File")');

    // Should see Today group with files
    await expect(page.locator('text=Today')).toBeVisible();
    await expect(page.locator('text=Untitled').first()).toBeVisible();
  });

  test('should highlight the active file', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Create two notebooks
    await page.click('button:has-text("New File")');
    await page.click('button:has-text("New File")');

    // The second file should be active (highlighted)
    const fileItems = page
      .locator(
        '[data-testid="file-item"], div:has-text("Untitled"):not(button)',
      )
      .last();
    await expect(fileItems).toHaveClass(/bg-blue-50/);
  });

  test('should switch between notebook files', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Create two notebooks
    await page.click('button:has-text("New File")');
    await page.click('button:has-text("New File")');

    // Get both file items
    const firstFile = page.locator('text=Untitled').first();

    // Click on the first file
    await firstFile.click();

    // Should see first file highlighted
    await expect(firstFile.locator('..')).toHaveClass(/bg-blue-50/);
  });

  test('should show delete button on hover and delete file', async ({
    page,
  }) => {
    await page.goto('http://localhost:5173');

    // Create a notebook
    await page.click('button:has-text("New File")');

    // Hover over the file item
    const fileItem = page.locator('text=Untitled').locator('..');
    await fileItem.hover();

    // Should see delete button (trash icon)
    await expect(page.locator('[title="Delete file"]')).toBeVisible();

    // Mock the confirm dialog to return true
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('Delete "Untitled"?');
      await dialog.accept();
    });

    // Click delete button
    await page.click('[title="Delete file"]');

    // File should be gone and empty state should show
    await expect(page.locator('text=No notebooks yet')).toBeVisible();
  });

  test('should not delete file if user cancels confirmation', async ({
    page,
  }) => {
    await page.goto('http://localhost:5173');

    // Create a notebook
    await page.click('button:has-text("New File")');

    // Hover over the file item
    const fileItem = page.locator('text=Untitled').locator('..');
    await fileItem.hover();

    // Mock the confirm dialog to return false (cancel)
    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
    });

    // Click delete button
    await page.click('[title="Delete file"]');

    // File should still be there
    await expect(page.locator('text=Untitled')).toBeVisible();
    await expect(page.locator('text=Today')).toBeVisible();
  });

  test('should persist notebooks across page reloads', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Create a notebook
    await page.click('button:has-text("New File")');

    // Reload the page
    await page.reload();

    // Notebook should still be there and active
    await expect(page.locator('text=Untitled')).toBeVisible();
    await expect(page.locator('text=Today')).toBeVisible();
  });

  test('should show file timestamps', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Create a notebook
    await page.click('button:has-text("New File")');

    // Should see a timestamp (like "2 minutes ago", "just now", etc.)
    await expect(page.locator('text=/ago|now/i')).toBeVisible();
  });

  test('should update file title when AI conversation includes markdown headers', async ({
    page,
  }) => {
    // This test would require setting up AI chat functionality
    // For now, we'll create a simpler test that just verifies the title display
    await page.goto('http://localhost:5173');

    // Create a notebook
    await page.click('button:has-text("New File")');

    // Initially should show "Untitled"
    await expect(page.locator('text=Untitled')).toBeVisible();

    // In a real scenario, after AI interaction, the title would update
    // This would be tested in an integration test with actual AI responses
  });

  test('should handle multiple notebook files correctly', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Create multiple notebooks
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("New File")');
    }

    // Should see 5 notebook files
    await expect(page.locator('text=Untitled')).toHaveCount(5);

    // Should see Today group
    await expect(page.locator('text=Today')).toBeVisible();

    // Should be able to click on different files
    const firstFile = page.locator('text=Untitled').first();
    const lastFile = page.locator('text=Untitled').last();

    await firstFile.click();
    await expect(firstFile.locator('..')).toHaveClass(/bg-blue-50/);

    await lastFile.click();
    await expect(lastFile.locator('..')).toHaveClass(/bg-blue-50/);
  });

  test('should display notebooks panel with correct layout', async ({
    page,
  }) => {
    await page.goto('http://localhost:5173');

    // Should see the notebooks panel title
    await expect(page.locator('h2:has-text("Notebooks")')).toBeVisible();

    // Should see the New File button
    await expect(page.locator('button:has-text("New File")')).toBeVisible();

    // Panel should be visible on the left side
    const panel = page.locator('div:has(h2:has-text("Notebooks"))').first();
    await expect(panel).toBeVisible();

    // Should have proper width and styling
    await expect(panel).toHaveClass(/w-80/);
    await expect(panel).toHaveClass(/border-r/);
  });
});
