import { test, expect } from '@playwright/test';

test.describe('Message Editing Feature', () => {
  test.beforeEach(async ({ page }) => {
    // Redirect console logs to CLI for debugging
    page.on('console', (msg) => {
      console.log(`[Browser ${msg.type()}]:`, msg.text());
    });
    page.on('pageerror', (error) => {
      console.error('[Browser Error]:', error.message);
    });

    await page.goto('/');
  });

  test('user messages should be clickable with hover effect', async ({ page }) => {
    // First, we need to configure API key and send a message
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.fill('[data-testid="gemini-api-key-input"]', 'test-api-key');
    await page.getByRole('button', { name: 'Close' }).click();

    // Send a message
    const input = page.locator('[placeholder="Ask the AI assistant..."]');
    await input.fill('Hello, this is my first message');
    await input.press('Enter');

    // Wait for the message to appear
    await expect(page.getByText('Hello, this is my first message')).toBeVisible();

    // Check that user message has pointer cursor and hover effect
    const userMessage = page.getByText('Hello, this is my first message').locator('..');
    await expect(userMessage).toHaveClass(/cursor-pointer/);

    // Test hover effect by hovering over the message
    await userMessage.hover();
    await expect(userMessage).toHaveClass(/hover:bg-blue-700/);
  });

  test('clicking user message should enter edit mode', async ({ page }) => {
    // Configure API key and send a message
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.fill('[data-testid="gemini-api-key-input"]', 'test-api-key');
    await page.getByRole('button', { name: 'Close' }).click();

    const input = page.locator('[placeholder="Ask the AI assistant..."]');
    await input.fill('Original message text');
    await input.press('Enter');

    await expect(page.getByText('Original message text')).toBeVisible();

    // Click on user message to enter edit mode
    const userMessage = page.getByText('Original message text').locator('..');
    await userMessage.click();

    // Verify edit mode UI appears
    await expect(page.locator('textarea[placeholder="Edit your message..."]')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send edited message' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel editing' })).toBeVisible();

    // Verify textarea contains original text
    const textarea = page.locator('textarea[placeholder="Edit your message..."]');
    await expect(textarea).toHaveValue('Original message text');
  });

  test('edit mode should dim subsequent messages', async ({ page }) => {
    // Configure API key
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.fill('[data-testid="gemini-api-key-input"]', 'test-api-key');
    await page.getByRole('button', { name: 'Close' }).click();

    // Send multiple messages to create a conversation
    const input = page.locator('[placeholder="Ask the AI assistant..."]');
    
    await input.fill('First message');
    await input.press('Enter');
    await expect(page.getByText('First message')).toBeVisible();

    // Wait a bit and send second message
    await page.waitForTimeout(1000);
    await input.fill('Second message');
    await input.press('Enter');
    await expect(page.getByText('Second message')).toBeVisible();

    // Click on first message to edit it
    const firstMessage = page.getByText('First message').locator('..');
    await firstMessage.click();

    // Verify that subsequent messages (including AI responses) are dimmed
    // Note: This test assumes there might be AI responses between messages
    const secondMessage = page.getByText('Second message').locator('../..');
    await expect(secondMessage).toHaveClass(/opacity-70/);
  });

  test('ESC key should cancel edit mode', async ({ page }) => {
    // Configure API key and send message
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.fill('[data-testid="gemini-api-key-input"]', 'test-api-key');
    await page.getByRole('button', { name: 'Close' }).click();

    const input = page.locator('[placeholder="Ask the AI assistant..."]');
    await input.fill('Test message');
    await input.press('Enter');

    await expect(page.getByText('Test message')).toBeVisible();

    // Enter edit mode
    const userMessage = page.getByText('Test message').locator('..');
    await userMessage.click();

    // Verify edit mode is active
    await expect(page.locator('textarea[placeholder="Edit your message..."]')).toBeVisible();

    // Press ESC to cancel
    await page.keyboard.press('Escape');

    // Verify edit mode is cancelled
    await expect(page.locator('textarea[placeholder="Edit your message..."]')).not.toBeVisible();
    await expect(page.getByText('Test message')).toBeVisible();
  });

  test('cancel button should exit edit mode', async ({ page }) => {
    // Configure API key and send message
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.fill('[data-testid="gemini-api-key-input"]', 'test-api-key');
    await page.getByRole('button', { name: 'Close' }).click();

    const input = page.locator('[placeholder="Ask the AI assistant..."]');
    await input.fill('Test message for cancel');
    await input.press('Enter');

    await expect(page.getByText('Test message for cancel')).toBeVisible();

    // Enter edit mode
    const userMessage = page.getByText('Test message for cancel').locator('..');
    await userMessage.click();

    // Click cancel button
    await page.getByRole('button', { name: 'Cancel editing' }).click();

    // Verify edit mode is cancelled
    await expect(page.locator('textarea[placeholder="Edit your message..."]')).not.toBeVisible();
    await expect(page.getByText('Test message for cancel')).toBeVisible();
  });

  test('keyboard navigation should work in edit mode', async ({ page }) => {
    // Configure API key and send message
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.fill('[data-testid="gemini-api-key-input"]', 'test-api-key');
    await page.getByRole('button', { name: 'Close' }).click();

    const input = page.locator('[placeholder="Ask the AI assistant..."]');
    await input.fill('Keyboard navigation test');
    await input.press('Enter');

    await expect(page.getByText('Keyboard navigation test')).toBeVisible();

    // Enter edit mode
    const userMessage = page.getByText('Keyboard navigation test').locator('..');
    await userMessage.click();

    const textarea = page.locator('textarea[placeholder="Edit your message..."]');
    await expect(textarea).toBeFocused();

    // Tab should focus Send button
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Send edited message' })).toBeFocused();

    // Tab should focus Cancel button
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Cancel editing' })).toBeFocused();

    // Shift+Tab should go back to Send button
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('button', { name: 'Send edited message' })).toBeFocused();
  });

  test('clicking outside edit area should cancel edit mode', async ({ page }) => {
    // Configure API key and send message
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.fill('[data-testid="gemini-api-key-input"]', 'test-api-key');
    await page.getByRole('button', { name: 'Close' }).click();

    const input = page.locator('[placeholder="Ask the AI assistant..."]');
    await input.fill('Outside click test');
    await input.press('Enter');

    await expect(page.getByText('Outside click test')).toBeVisible();

    // Enter edit mode
    const userMessage = page.getByText('Outside click test').locator('..');
    await userMessage.click();

    // Verify edit mode is active
    await expect(page.locator('textarea[placeholder="Edit your message..."]')).toBeVisible();

    // Click outside the edit area (click on the main content area but not on edit components)
    await page.click('body', { position: { x: 50, y: 50 } });

    // Verify edit mode is cancelled
    await expect(page.locator('textarea[placeholder="Edit your message..."]')).not.toBeVisible();
    await expect(page.getByText('Outside click test')).toBeVisible();
  });

  test('send button should rollback conversation and continue from edited point', async ({ page }) => {
    // Configure API key
    await page.getByRole('button', { name: 'Settings' }).click();
    await page.fill('[data-testid="gemini-api-key-input"]', 'test-api-key');
    await page.getByRole('button', { name: 'Close' }).click();

    const input = page.locator('[placeholder="Ask the AI assistant..."]');
    
    // Send first message
    await input.fill('First user message');
    await input.press('Enter');
    await expect(page.getByText('First user message')).toBeVisible();
    
    // Wait a bit and send second message  
    await page.waitForTimeout(500);
    await input.fill('Second user message');
    await input.press('Enter');
    await expect(page.getByText('Second user message')).toBeVisible();

    // Enter edit mode on first message
    const firstMessage = page.getByText('First user message').locator('..');
    await firstMessage.click();

    // Verify edit mode is active
    const textarea = page.locator('textarea[placeholder="Edit your message..."]');
    await expect(textarea).toBeVisible();

    // Edit the message
    await textarea.clear();
    await textarea.fill('Edited first message');

    // Send the edited message
    await page.getByRole('button', { name: 'Send edited message' }).click();

    // Verify the edited message appears
    await expect(page.getByText('Edited first message')).toBeVisible();
    
    // Verify the second message is no longer visible (rolled back)
    await expect(page.getByText('Second user message')).not.toBeVisible();
    
    // Verify edit mode is no longer active
    await expect(textarea).not.toBeVisible();
  });
});