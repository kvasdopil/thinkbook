import { test, expect } from '@playwright/test';

test.describe('Code Cell Toggle and Status', () => {
  test.beforeEach(async ({ page }) => {
    // Redirect console logs to CLI output
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', (error) =>
      console.error('PAGE ERROR:', error.message),
    );

    await page.goto('/');

    // Configure API key to access the interface
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await page.fill('#gemini-api-key', 'test-api-key');
    await page.fill('#snowflake-access-token', 'test-access-token');
    await page.fill('#snowflake-hostname', 'test.snowflakecomputing.com');
    await page.click('button:has-text("OK")');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('displays code cell in collapsed state by default', async ({ page }) => {
    // Send a message to generate a notebook cell
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('generativelanguage.googleapis.com')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: 'I\'ll create a simple Python calculation for you.\n\n```python\n# Calculate sum of two numbers\nresult = 5 + 3\nprint(f"The sum is: {result}")\n```',
                    },
                  ],
                },
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill('Create a simple Python code');
    await page.click('button:has-text("Send")');

    // Wait for the code cell to appear
    await expect(page.locator('[data-testid="notebook-cell"]')).toBeVisible({
      timeout: 10000,
    });

    // Should be collapsed by default (no code editor visible)
    await expect(page.locator('[data-testid="code-editor"]')).not.toBeVisible();

    // Should show toggle button and status indicator
    await expect(
      page.locator('[data-testid="toggle-visibility"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="run-button"]')).toBeVisible();
  });

  test('toggles between collapsed and expanded states', async ({ page }) => {
    // Mock AI response to create a code cell
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('generativelanguage.googleapis.com')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: 'Here\'s a Python calculation:\n\n```python\n# Calculate area of rectangle\nwidth = 10\nheight = 5\narea = width * height\nprint(f"Area: {area}")\n```',
                    },
                  ],
                },
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill('Calculate area of rectangle');
    await page.click('button:has-text("Send")');

    // Wait for code cell to appear in collapsed state
    await expect(page.locator('[data-testid="notebook-cell"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('[data-testid="code-editor"]')).not.toBeVisible();

    // Click toggle to expand
    await page.click('[data-testid="toggle-visibility"]');

    // Should now show the code editor
    await expect(page.locator('[data-testid="code-editor"]')).toBeVisible();

    // Toggle button should change to hide icon
    const toggleButton = page.locator('[data-testid="toggle-visibility"]');
    await expect(toggleButton).toHaveAttribute('title', 'Hide code editor');

    // Click toggle to collapse again
    await page.click('[data-testid="toggle-visibility"]');

    // Should hide the code editor
    await expect(page.locator('[data-testid="code-editor"]')).not.toBeVisible();
    await expect(toggleButton).toHaveAttribute('title', 'Show code editor');
  });

  test('displays top-level comment as title in collapsed state', async ({
    page,
  }) => {
    // Mock AI response with a commented code block
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('generativelanguage.googleapis.com')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: "Here's the code:\n\n```python\n# Calculate fibonacci sequence\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)\n\nprint(fibonacci(10))\n```",
                    },
                  ],
                },
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill('Create fibonacci function');
    await page.click('button:has-text("Send")');

    // Wait for code cell and verify comment extraction
    await expect(page.locator('[data-testid="notebook-cell"]')).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.locator('text=Calculate fibonacci sequence'),
    ).toBeVisible();
  });

  test('displays execution status indicators', async ({ page }) => {
    // Mock AI response
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('generativelanguage.googleapis.com')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: 'Simple print statement:\n\n```python\nprint("Hello World")\n```',
                    },
                  ],
                },
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill('Print hello world');
    await page.click('button:has-text("Send")');

    // Wait for code cell to appear
    await expect(page.locator('[data-testid="notebook-cell"]')).toBeVisible({
      timeout: 10000,
    });

    // Status button should be visible and clickable in idle state
    const statusButton = page.locator('[data-testid="run-button"]');
    await expect(statusButton).toBeVisible();
    await expect(statusButton).toHaveAttribute('title', 'Run');

    // Click to execute code
    await statusButton.click();

    // Should show running state (though this may be brief)
    // We can't easily test the exact state transitions without mocking the worker
    // but we can verify the button remains interactive
    await expect(statusButton).toBeVisible();
  });

  test('executes code from collapsed state and shows output immediately', async ({
    page,
  }) => {
    // Mock AI response
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('generativelanguage.googleapis.com')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: 'Simple calculation:\n\n```python\nresult = 2 + 2\nprint(f"Result: {result}")\n```',
                    },
                  ],
                },
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill('Calculate 2 + 2');
    await page.click('button:has-text("Send")');

    // Wait for code cell to appear in collapsed state
    await expect(page.locator('[data-testid="notebook-cell"]')).toBeVisible({
      timeout: 10000,
    });

    // Execute from collapsed state
    const statusButton = page.locator('[data-testid="run-button"]');
    await statusButton.click();

    // Output should appear directly in collapsed state within the cell
    await expect(
      page.locator('[data-testid="notebook-cell"]').locator('text=Result:'),
    ).toBeVisible({ timeout: 15000 });
  });

  test('maintains responsiveness on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Mock AI response
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('generativelanguage.googleapis.com')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: 'Mobile test:\n\n```python\n# Mobile responsive test\nprint("Mobile test")\n```',
                    },
                  ],
                },
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill('Mobile test');
    await page.click('button:has-text("Send")');

    // Wait for code cell
    await expect(page.locator('[data-testid="notebook-cell"]')).toBeVisible({
      timeout: 10000,
    });

    // Collapsed state should fit within mobile viewport
    const cell = page.locator('[data-testid="notebook-cell"]');
    const cellBox = await cell.boundingBox();

    expect(cellBox!.width).toBeLessThanOrEqual(375);

    // Elements should still be interactive
    await expect(
      page.locator('[data-testid="toggle-visibility"]'),
    ).toBeVisible();
    await expect(page.locator('[data-testid="run-button"]')).toBeVisible();
  });

  test('provides keyboard accessibility', async ({ page }) => {
    // Mock AI response
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('generativelanguage.googleapis.com')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: 'Accessibility test:\n\n```python\nprint("Keyboard navigation test")\n```',
                    },
                  ],
                },
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill('Accessibility test');
    await page.click('button:has-text("Send")');

    // Wait for code cell
    await expect(page.locator('[data-testid="notebook-cell"]')).toBeVisible({
      timeout: 10000,
    });

    // Test keyboard navigation to toggle button
    const toggleButton = page.locator('[data-testid="toggle-visibility"]');
    await toggleButton.focus();

    // Press Enter to toggle
    await page.keyboard.press('Enter');

    // Should expand the cell
    await expect(page.locator('[data-testid="code-editor"]')).toBeVisible();

    // Test keyboard navigation to status button
    const statusButton = page.locator('[data-testid="run-button"]');
    await statusButton.focus();

    // Should have proper aria-labels
    await expect(toggleButton).toHaveAttribute('aria-label');
    await expect(statusButton).toHaveAttribute('aria-label');
  });

  test('displays appropriate status colors and icons', async ({ page }) => {
    // Mock AI response
    await page.route('**/*', async (route) => {
      if (route.request().url().includes('generativelanguage.googleapis.com')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: 'Status test:\n\n```python\n# Status indicator test\nprint("Testing status colors")\n```',
                    },
                  ],
                },
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill('Status test');
    await page.click('button:has-text("Send")');

    // Wait for code cell
    await expect(page.locator('[data-testid="notebook-cell"]')).toBeVisible({
      timeout: 10000,
    });

    // Status button should have appropriate styling classes
    const statusButton = page.locator('[data-testid="run-button"]');

    // Should have background and text color classes
    await expect(statusButton).toHaveClass(/bg-/);
    await expect(statusButton).toHaveClass(/text-/);

    // Should have hover effects
    await expect(statusButton).toHaveClass(/hover:/);

    // Should have transition effects
    await expect(statusButton).toHaveClass(/transition/);
  });
});
