import { test, expect } from '@playwright/test';

test.describe('AI Chat', () => {
  test.beforeEach(async ({ page }) => {
    // Redirect console logs to CLI output
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (error) =>
      console.error('PAGE ERROR:', error.message),
    );

    await page.goto('/');
  });

  test('displays AI chat interface when API key is configured', async ({
    page,
  }) => {
    // Settings modal should be open automatically
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Fill in required settings
    await page.fill('#gemini-api-key', 'test-api-key');
    await page.fill('#snowflake-access-token', 'test-access-token');
    await page.fill('#snowflake-hostname', 'test.snowflakecomputing.com');

    await page.click('button:has-text("OK")');

    // Wait for modal to close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Verify AI chat interface is displayed
    await expect(
      page.locator('textarea[placeholder="Ask the AI assistant..."]'),
    ).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Send")')).toBeVisible();
  });

  test('displays configuration message when API key is not available', async ({
    page,
  }) => {
    // Clear any stored API key
    await page.evaluate(() => {
      localStorage.clear();
    });

    await page.reload();

    // Should show configuration message instead of chat interface
    await expect(
      page.locator(
        'text=Please configure your Gemini API key in settings to start using the AI chat.',
      ),
    ).toBeVisible();
  });

  test('allows typing in the chat input', async ({ page }) => {
    // Configure API key first via the auto-opened modal
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.fill('#gemini-api-key', 'test-api-key');
    await page.fill('#snowflake-access-token', 'test-access-token');
    await page.fill('#snowflake-hostname', 'test.snowflakecomputing.com');
    await page.click('button:has-text("OK")');

    // Type in the chat input
    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill('Hello, AI!');

    await expect(chatInput).toHaveValue('Hello, AI!');
  });

  test('send button is disabled when input is empty', async ({ page }) => {
    // Configure API key first via the auto-opened modal
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.fill('#gemini-api-key', 'test-api-key');
    await page.fill('#snowflake-access-token', 'test-access-token');
    await page.fill('#snowflake-hostname', 'test.snowflakecomputing.com');
    await page.click('button:has-text("OK")');

    // Send button should be disabled when input is empty
    const sendButton = page.locator('button:has-text("Send")');
    await expect(sendButton).toBeDisabled();
  });

  test('send button is enabled when input has text', async ({ page }) => {
    // Configure API key first via the auto-opened modal
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.fill('#gemini-api-key', 'test-api-key');
    await page.fill('#snowflake-access-token', 'test-access-token');
    await page.fill('#snowflake-hostname', 'test.snowflakecomputing.com');
    await page.click('button:has-text("OK")');

    // Type in the chat input
    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill('Hello, AI!');

    // Send button should be enabled
    const sendButton = page.locator('button:has-text("Send")');
    await expect(sendButton).not.toBeDisabled();
  });

  test('displays user message after sending', async ({ page }) => {
    // Configure API key first via the auto-opened modal
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.fill('#gemini-api-key', 'test-api-key');
    await page.fill('#snowflake-access-token', 'test-access-token');
    await page.fill('#snowflake-hostname', 'test.snowflakecomputing.com');
    await page.click('button:has-text("OK")');

    // Mock the AI API to prevent real API calls
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('generativelanguage.googleapis.com')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Mocked response' }),
        });
      } else {
        await route.continue();
      }
    });

    // Type and send a message
    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill('Hello, AI!');
    await page.click('button:has-text("Send")');

    // Verify user message is displayed
    await expect(page.locator('text=You').first()).toBeVisible();
    await expect(page.locator('text=Hello, AI!').first()).toBeVisible();
  });

  test('clears input after sending message', async ({ page }) => {
    // Configure API key first via the auto-opened modal
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.fill('#gemini-api-key', 'test-api-key');
    await page.fill('#snowflake-access-token', 'test-access-token');
    await page.fill('#snowflake-hostname', 'test.snowflakecomputing.com');
    await page.click('button:has-text("OK")');

    // Mock the AI API
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('generativelanguage.googleapis.com')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Mocked response' }),
        });
      } else {
        await route.continue();
      }
    });

    // Type and send a message
    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill('Hello, AI!');
    await page.click('button:has-text("Send")');

    // Verify input is cleared
    await expect(chatInput).toHaveValue('');
  });

  test('chat history is positioned above code cell placeholder', async ({
    page,
  }) => {
    // Configure API key first via the auto-opened modal
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.fill('#gemini-api-key', 'test-api-key');
    await page.fill('#snowflake-access-token', 'test-access-token');
    await page.fill('#snowflake-hostname', 'test.snowflakecomputing.com');
    await page.click('button:has-text("OK")');

    // Verify AI chat is positioned above code cell placeholder
    const aiChat = page.locator('text=AI Assistant').locator('..');
    const codeCellPlaceholder = page.locator('text=Code Cell Placeholder');

    await expect(aiChat).toBeVisible();
    await expect(codeCellPlaceholder).toBeVisible();

    // Get bounding boxes to verify positioning
    const aiChatBox = await aiChat.boundingBox();
    const codeCellBox = await codeCellPlaceholder.boundingBox();

    expect(aiChatBox!.y).toBeLessThan(codeCellBox!.y);
  });
});
