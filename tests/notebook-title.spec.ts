import { test, expect } from '@playwright/test';

test.describe('Notebook Title', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for the application to load
    await page.waitForSelector('[aria-label="Show notebook panel"]', {
      timeout: 5000,
    });
  });

  test('displays notebook header when a file is active', async ({ page }) => {
    // Create a new file by clicking the "+" button
    await page.click('button[aria-label="Create new notebook"]');

    // Wait for the notebook header to appear
    const notebookHeader = page.locator('[aria-label="Notebook header"]');
    await expect(notebookHeader).toBeVisible();

    // Check that the title input is visible
    const titleInput = page.locator('input[aria-label="Notebook title"]');
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue('Untitled');
  });

  test('allows editing notebook title', async ({ page }) => {
    // Create a new file
    await page.click('button[aria-label="Create new notebook"]');

    // Wait for the title input
    const titleInput = page.locator('input[aria-label="Notebook title"]');
    await expect(titleInput).toBeVisible();

    // Click on the title input to focus it
    await titleInput.click();

    // Clear and type new title
    await titleInput.fill('My Test Notebook');

    // Press Enter to save
    await titleInput.press('Enter');

    // Verify the title has been updated
    await expect(titleInput).toHaveValue('My Test Notebook');
  });

  test('saves title on blur', async ({ page }) => {
    // Create a new file
    await page.click('button[aria-label="Create new notebook"]');

    const titleInput = page.locator('input[aria-label="Notebook title"]');
    await titleInput.click();
    await titleInput.fill('Title Changed on Blur');

    // Click elsewhere to trigger blur
    await page.click('body');

    // Verify the title persisted
    await expect(titleInput).toHaveValue('Title Changed on Blur');
  });

  test('clicking anywhere on title area focuses the input', async ({
    page,
  }) => {
    // Create a new file
    await page.click('button[aria-label="Create new notebook"]');

    // Click on the title area (not directly on input)
    const titleArea = page.locator(
      '[aria-label="Click to edit notebook title"]',
    );
    await titleArea.click();

    // Verify the input is focused
    const titleInput = page.locator('input[aria-label="Notebook title"]');
    await expect(titleInput).toBeFocused();
  });

  test('settings button opens settings modal', async ({ page }) => {
    // Create a new file to show the header
    await page.click('button[aria-label="Create new notebook"]');

    // Click the settings button in the notebook header
    const settingsButton = page.locator(
      '[aria-label="Notebook header"] button[aria-label="Open settings"]',
    );
    await settingsButton.click();

    // Verify settings modal opened
    const settingsModal = page.locator('[role="dialog"]');
    await expect(settingsModal).toBeVisible();
    await expect(settingsModal).toContainText('Settings');
  });

  test('title persists when switching between files', async ({ page }) => {
    // Create first file
    await page.click('button[aria-label="Create new notebook"]');

    const titleInput = page.locator('input[aria-label="Notebook title"]');
    await titleInput.click();
    await titleInput.fill('First Notebook');
    await titleInput.press('Enter');

    // Create second file
    await page.click('button[aria-label="Create new notebook"]');
    await titleInput.click();
    await titleInput.fill('Second Notebook');
    await titleInput.press('Enter');

    // Switch back to first file by clicking on it in the file panel
    // Note: This assumes the file list shows titles
    await page.click('text=First Notebook');

    // Verify the title is correct
    await expect(titleInput).toHaveValue('First Notebook');

    // Switch to second file
    await page.click('text=Second Notebook');
    await expect(titleInput).toHaveValue('Second Notebook');
  });

  test('title is accessible via keyboard navigation', async ({ page }) => {
    // Create a new file
    await page.click('button[aria-label="Create new notebook"]');

    // Use Tab to navigate to title input
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const titleInput = page.locator('input[aria-label="Notebook title"]');
    await expect(titleInput).toBeFocused();

    // Test typing while focused via keyboard
    await page.keyboard.type('Keyboard Test');
    await expect(titleInput).toHaveValue('Keyboard Test');

    // Tab to settings button
    await page.keyboard.press('Tab');
    const settingsButton = page.locator(
      '[aria-label="Notebook header"] button[aria-label="Open settings"]',
    );
    await expect(settingsButton).toBeFocused();
  });

  test('header is not sticky and scrolls with content', async ({ page }) => {
    // Create a new file
    await page.click('button[aria-label="Create new notebook"]');

    // Add multiple messages to create scrollable content
    const chatInput = page.locator('textarea[placeholder*="Ask"]');
    for (let i = 0; i < 10; i++) {
      await chatInput.fill(`Test message ${i + 1}`);
      await chatInput.press('Enter');
      await page.waitForTimeout(100); // Small delay between messages
    }

    // Get initial position of the notebook header
    const notebookHeader = page.locator('[aria-label="Notebook header"]');
    const initialBox = await notebookHeader.boundingBox();

    // Scroll down in the chat area
    const chatArea = page.locator('.flex-1.overflow-y-auto');
    await chatArea.evaluate((el) => (el.scrollTop = 200));

    // Verify header position hasn't changed (it's not sticky)
    const afterScrollBox = await notebookHeader.boundingBox();
    expect(afterScrollBox?.y).toBe(initialBox?.y);
  });

  test('displays "Untitled" for files without titles', async ({ page }) => {
    // Create a new file
    await page.click('button[aria-label="Create new notebook"]');

    const titleInput = page.locator('input[aria-label="Notebook title"]');
    await expect(titleInput).toHaveValue('Untitled');
  });

  test('does not update timestamp on every keystroke', async ({ page }) => {
    // This test verifies the acceptance criteria about avoiding unintended updatedAt updates
    // Create a new file
    await page.click('button[aria-label="Create new notebook"]');

    const titleInput = page.locator('input[aria-label="Notebook title"]');

    // Type characters without triggering save
    await titleInput.click();
    await page.keyboard.type('Test');

    // We can't directly test the updatedAt timestamp in e2e tests,
    // but we can verify that the title change only persists on blur/enter

    // Refresh page before blur/enter to see if changes were saved prematurely
    await page.reload();
    await page.waitForSelector('[aria-label="Notebook header"]');

    // The title should still be 'Untitled' since we didn't blur or press Enter
    await expect(titleInput).toHaveValue('Untitled');
  });

  test('header has proper ARIA roles and labels', async ({ page }) => {
    // Create a new file
    await page.click('button[aria-label="Create new notebook"]');

    // Check header has banner role
    const header = page.locator(
      '[role="banner"][aria-label="Notebook header"]',
    );
    await expect(header).toBeVisible();

    // Check input has proper label
    const titleInput = page.locator('input[aria-label="Notebook title"]');
    await expect(titleInput).toBeVisible();

    // Check settings button has proper label
    const settingsButton = page.locator('button[aria-label="Open settings"]');
    await expect(settingsButton).toBeVisible();

    // Check title area has proper label
    const titleArea = page.locator(
      '[aria-label="Click to edit notebook title"]',
    );
    await expect(titleArea).toBeVisible();
  });
});

// Add console logging to help with debugging
test.beforeEach(async ({ page }) => {
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warn') {
      console.log(`${msg.type().toUpperCase()}: ${msg.text()}`);
    }
  });
});
