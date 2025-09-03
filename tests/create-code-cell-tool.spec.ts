import { test, expect, type Page } from '@playwright/test';

test.describe('Create Code Cell Tool', () => {
  // Helper function to force close any blocking modals
  async function closeAnyModals(page: Page) {
    try {
      const modal = page.locator('[role="dialog"][aria-modal="true"]');
      if (await modal.isVisible()) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);

        // If still visible, try to click outside the modal
        if (await modal.isVisible()) {
          await page.mouse.click(50, 50); // Click top-left corner
          await page.waitForTimeout(200);
        }
      }
    } catch {
      // Ignore errors
    }
  }

  test.beforeEach(async ({ page }) => {
    // Redirect console logs to CLI output
    page.on('console', (msg) => {
      if (msg.type() === 'log' || msg.type() === 'error') {
        console.log(`[${msg.type()}] ${msg.text()}`);
      }
    });

    await page.goto('/');
    await closeAnyModals(page);
  });

  test('AI can create a new code cell with createCodeCell tool', async ({
    page,
  }) => {
    // Wait for the app to be ready
    await expect(
      page.locator('textarea[placeholder="Ask the AI assistant..."]'),
    ).toBeVisible();

    // Count initial cells
    const initialCellCount = await page
      .locator('[data-testid*="notebook-cell"]')
      .count();

    // Ask AI to create a code cell
    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill(
      'Please create a code cell that calculates the area of a circle with radius 5',
    );

    // Send the message
    await chatInput.press('Enter');

    // Wait for AI response and tool call to complete
    await page.waitForTimeout(5000); // Allow time for AI response and tool execution

    // Check that a new cell was created
    const finalCellCount = await page
      .locator('[data-testid*="notebook-cell"]')
      .count();
    expect(finalCellCount).toBeGreaterThan(initialCellCount);

    // Check that the newest cell contains relevant code
    const newCell = page.locator('[data-testid*="notebook-cell"]').last();
    await expect(newCell).toBeVisible();

    // The cell should start collapsed (editor not visible)
    const codeEditor = newCell.locator('.monaco-editor');
    await expect(codeEditor).toBeHidden();

    // Check for description/title display when collapsed
    const cellDescription = newCell.locator(
      '[data-testid="cell-description"], [data-testid="cell-title"]',
    );
    await expect(cellDescription).toBeVisible();

    // The description should contain meaningful text
    const descriptionText = await cellDescription.textContent();
    expect(descriptionText).toBeTruthy();
    expect(descriptionText?.length).toBeGreaterThan(0);
  });

  test('AI created cell starts in collapsed state', async ({ page }) => {
    await expect(
      page.locator('textarea[placeholder="Ask the AI assistant..."]'),
    ).toBeVisible();

    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill('Create a code cell that prints a hello message');
    await chatInput.press('Enter');

    // Wait for response and tool execution
    await page.waitForTimeout(5000);

    // Get the last created cell
    const newCell = page.locator('[data-testid*="notebook-cell"]').last();
    await expect(newCell).toBeVisible();

    // Verify cell starts collapsed (code editor hidden)
    const codeEditor = newCell.locator('.monaco-editor');
    await expect(codeEditor).toBeHidden();

    // Verify the toggle button exists and shows "show" state
    const toggleButton = newCell.locator(
      '[data-testid="toggle-visibility"], button:has-text("Show")',
    );
    await expect(toggleButton).toBeVisible();
  });

  test('Created cell can be expanded to show code editor', async ({ page }) => {
    await expect(
      page.locator('textarea[placeholder="Ask the AI assistant..."]'),
    ).toBeVisible();

    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill(
      'Create a simple Python function that adds two numbers',
    );
    await chatInput.press('Enter');

    // Wait for response and tool execution
    await page.waitForTimeout(5000);

    // Get the last created cell
    const newCell = page.locator('[data-testid*="notebook-cell"]').last();
    await expect(newCell).toBeVisible();

    // Initially collapsed
    const codeEditor = newCell.locator('.monaco-editor');
    await expect(codeEditor).toBeHidden();

    // Find and click the toggle/expand button
    const toggleButton = newCell
      .locator(
        '[data-testid="toggle-visibility"], button[title*="Show"], button:has([data-testid="eye-icon"])',
      )
      .first();
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();

    // After clicking, editor should be visible
    await expect(codeEditor).toBeVisible();

    // Check that there's actual code content
    await page.waitForTimeout(1000); // Allow Monaco to render
    const editorText = await page
      .locator('.monaco-editor .view-lines')
      .textContent();
    expect(editorText).toBeTruthy();
    expect(editorText?.length).toBeGreaterThan(0);
  });

  test('Multiple code cells can be created sequentially', async ({ page }) => {
    await expect(
      page.locator('textarea[placeholder="Ask the AI assistant..."]'),
    ).toBeVisible();

    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );

    // Create first cell
    await chatInput.fill('Create a code cell that defines a variable x = 10');
    await chatInput.press('Enter');
    await page.waitForTimeout(3000);

    const cellCountAfterFirst = await page
      .locator('[data-testid*="notebook-cell"]')
      .count();

    // Create second cell
    await chatInput.fill('Create another code cell that prints the variable x');
    await chatInput.press('Enter');
    await page.waitForTimeout(3000);

    const cellCountAfterSecond = await page
      .locator('[data-testid*="notebook-cell"]')
      .count();

    // Verify both cells were created
    expect(cellCountAfterSecond).toBeGreaterThan(cellCountAfterFirst);
    expect(cellCountAfterSecond).toBeGreaterThanOrEqual(2);

    // All cells should start collapsed
    const allCells = page.locator('[data-testid*="notebook-cell"]');
    const cellCount = await allCells.count();

    for (let i = 0; i < cellCount; i++) {
      const cell = allCells.nth(i);
      const editor = cell.locator('.monaco-editor');
      await expect(editor).toBeHidden();
    }
  });

  test('Created cells have proper controls (run, toggle, delete)', async ({
    page,
  }) => {
    await expect(
      page.locator('textarea[placeholder="Ask the AI assistant..."]'),
    ).toBeVisible();

    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill('Create a code cell with a simple print statement');
    await chatInput.press('Enter');
    await page.waitForTimeout(5000);

    // Get the new cell
    const newCell = page.locator('[data-testid*="notebook-cell"]').last();
    await expect(newCell).toBeVisible();

    // Check for control buttons
    const runButton = newCell
      .locator(
        'button[title*="Run"], button:has([data-testid*="play"]), button:has(svg)',
      )
      .first();
    const toggleButton = newCell
      .locator('[data-testid="toggle-visibility"], button[title*="Show"]')
      .first();

    await expect(runButton).toBeVisible();
    await expect(toggleButton).toBeVisible();

    // Expand the cell to access all controls
    await toggleButton.click();
    await page.waitForTimeout(500);

    // After expansion, should still have run button and now delete might be visible
    await expect(runButton).toBeVisible();
  });

  test('Tool call creates cell with descriptive comment', async ({ page }) => {
    await expect(
      page.locator('textarea[placeholder="Ask the AI assistant..."]'),
    ).toBeVisible();

    const chatInput = page.locator(
      'textarea[placeholder="Ask the AI assistant..."]',
    );
    await chatInput.fill(
      'Create a code cell that calculates the factorial of 5',
    );
    await chatInput.press('Enter');
    await page.waitForTimeout(5000);

    // Get the new cell and expand it to see the code
    const newCell = page.locator('[data-testid*="notebook-cell"]').last();
    const toggleButton = newCell
      .locator('[data-testid="toggle-visibility"], button[title*="Show"]')
      .first();
    await toggleButton.click();
    await page.waitForTimeout(1000);

    // Check that the code includes a descriptive comment
    const editorContent = await page
      .locator('.monaco-editor .view-lines')
      .textContent();
    expect(editorContent).toMatch(/#.*factorial|#.*calculate/i);
  });
});
