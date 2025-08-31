import { test, expect } from '@playwright/test';

test.describe('Settings Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure clean state
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should show settings button in header', async ({ page }) => {
    await page.goto('/');

    const settingsButton = page.getByRole('button', { name: 'Open settings' });
    await expect(settingsButton).toBeVisible();
  });

  test('should auto-open settings modal when no config is stored', async ({
    page,
  }) => {
    await page.goto('/');

    // Modal should auto-open since no config is stored
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    const title = page.getByRole('heading', { name: 'Settings' });
    await expect(title).toBeVisible();
  });

  test('should open settings modal when settings button is clicked', async ({
    page,
  }) => {
    // First, set some config to prevent auto-open
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('gemini-api-key', 'test-key');
      localStorage.setItem('snowflake-access-token', 'test-token');
      localStorage.setItem('snowflake-hostname', 'test-hostname');
    });
    await page.reload();

    // Now click the settings button
    const settingsButton = page.getByRole('button', { name: 'Open settings' });
    await settingsButton.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
  });

  test('should have all required input fields', async ({ page }) => {
    await page.goto('/');

    // Wait for modal to appear
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Check all required fields are present
    const geminiInput = page.getByLabel('Gemini AI Key');
    const tokenInput = page.getByLabel('Snowflake Access Token');
    const hostnameInput = page.getByLabel('Snowflake Hostname');

    await expect(geminiInput).toBeVisible();
    await expect(tokenInput).toBeVisible();
    await expect(hostnameInput).toBeVisible();

    // Check field types
    await expect(geminiInput).toHaveAttribute('type', 'password');
    await expect(tokenInput).toHaveAttribute('type', 'password');
    await expect(hostnameInput).toHaveAttribute('type', 'text');
  });

  test('should have OK and Cancel buttons', async ({ page }) => {
    await page.goto('/');

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    const okButton = page.getByRole('button', { name: 'OK' });
    const cancelButton = page.getByRole('button', { name: 'Cancel' });

    await expect(okButton).toBeVisible();
    await expect(cancelButton).toBeVisible();
  });

  test('should close modal when Cancel button is clicked', async ({ page }) => {
    await page.goto('/');

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    await cancelButton.click();

    await expect(modal).not.toBeVisible();
  });

  test('should close modal when backdrop is clicked', async ({ page }) => {
    await page.goto('/');

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Click on backdrop (outside the modal content)
    await page.locator('.fixed.inset-0').click({ position: { x: 10, y: 10 } });

    await expect(modal).not.toBeVisible();
  });

  test('should close modal on Escape key press', async ({ page }) => {
    await page.goto('/');

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(modal).not.toBeVisible();
  });

  test('should save configuration when OK button is clicked', async ({
    page,
  }) => {
    await page.goto('/');

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Fill in the form
    const geminiInput = page.getByLabel('Gemini AI Key');
    const tokenInput = page.getByLabel('Snowflake Access Token');
    const hostnameInput = page.getByLabel('Snowflake Hostname');

    await geminiInput.fill('test-gemini-key');
    await tokenInput.fill('test-snowflake-token');
    await hostnameInput.fill('test-hostname.snowflakecomputing.com');

    const okButton = page.getByRole('button', { name: 'OK' });
    await okButton.click();

    // Modal should close
    await expect(modal).not.toBeVisible();

    // Check that values were saved to localStorage
    const storedGeminiKey = await page.evaluate(() =>
      localStorage.getItem('gemini-api-key'),
    );
    const storedToken = await page.evaluate(() =>
      localStorage.getItem('snowflake-access-token'),
    );
    const storedHostname = await page.evaluate(() =>
      localStorage.getItem('snowflake-hostname'),
    );

    expect(storedGeminiKey).toBe('test-gemini-key');
    expect(storedToken).toBe('test-snowflake-token');
    expect(storedHostname).toBe('test-hostname.snowflakecomputing.com');
  });

  test('should load existing configuration values', async ({ page }) => {
    // Set some existing values in localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('gemini-api-key', 'existing-gemini-key');
      localStorage.setItem('snowflake-access-token', 'existing-token');
      localStorage.setItem('snowflake-hostname', 'existing-hostname');
    });
    await page.reload();

    // Open settings manually since we have config
    const settingsButton = page.getByRole('button', { name: 'Open settings' });
    await settingsButton.click();

    // Check that existing values are loaded
    const geminiInput = page.getByLabel('Gemini AI Key');
    const tokenInput = page.getByLabel('Snowflake Access Token');
    const hostnameInput = page.getByLabel('Snowflake Hostname');

    await expect(geminiInput).toHaveValue('existing-gemini-key');
    await expect(tokenInput).toHaveValue('existing-token');
    await expect(hostnameInput).toHaveValue('existing-hostname');
  });

  test('should normalize hostname by removing https prefix', async ({
    page,
  }) => {
    await page.goto('/');

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    const hostnameInput = page.getByLabel('Snowflake Hostname');

    // Enter hostname with https prefix
    await hostnameInput.fill('https://test-hostname.snowflakecomputing.com');

    const okButton = page.getByRole('button', { name: 'OK' });
    await okButton.click();

    // Check that the normalized hostname was saved
    const storedHostname = await page.evaluate(() =>
      localStorage.getItem('snowflake-hostname'),
    );
    expect(storedHostname).toBe('test-hostname.snowflakecomputing.com');
  });

  test('should focus first input when modal opens', async ({ page }) => {
    await page.goto('/');

    const geminiInput = page.getByLabel('Gemini AI Key');

    // Wait for the focus to be set
    await expect(geminiInput).toBeFocused();
  });

  test('should trap focus within modal', async ({ page }) => {
    await page.goto('/');

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    const geminiInput = page.getByLabel('Gemini AI Key');
    const tokenInput = page.getByLabel('Snowflake Access Token');
    const hostnameInput = page.getByLabel('Snowflake Hostname');
    const cancelButton = page.getByRole('button', { name: 'Cancel' });
    const okButton = page.getByRole('button', { name: 'OK' });

    // Focus should start on first input
    await expect(geminiInput).toBeFocused();

    // Tab through all focusable elements
    await page.keyboard.press('Tab');
    await expect(tokenInput).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(hostnameInput).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(cancelButton).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(okButton).toBeFocused();

    // Tab from last element should go back to first
    await page.keyboard.press('Tab');
    await expect(geminiInput).toBeFocused();

    // Shift+Tab should go backwards
    await page.keyboard.press('Shift+Tab');
    await expect(okButton).toBeFocused();
  });

  test('should not auto-open modal when all config is present', async ({
    page,
  }) => {
    // Set all required config
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('gemini-api-key', 'test-key');
      localStorage.setItem('snowflake-access-token', 'test-token');
      localStorage.setItem('snowflake-hostname', 'test-hostname');
    });
    await page.reload();

    // Modal should not be visible
    const modal = page.getByRole('dialog');
    await expect(modal).not.toBeVisible();

    // But settings button should still be visible
    const settingsButton = page.getByRole('button', { name: 'Open settings' });
    await expect(settingsButton).toBeVisible();
  });

  test('should have proper ARIA attributes for accessibility', async ({
    page,
  }) => {
    await page.goto('/');

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    // Check ARIA attributes
    await expect(modal).toHaveAttribute('aria-modal', 'true');
    await expect(modal).toHaveAttribute(
      'aria-labelledby',
      'settings-modal-title',
    );

    // Check that the title has the correct id
    const title = page.getByText('Settings');
    await expect(title).toHaveAttribute('id', 'settings-modal-title');
  });
});
