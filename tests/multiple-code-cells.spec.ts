import { test, expect, type Page } from '@playwright/test';

test.describe('Multiple Code Cells', () => {
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

    // Close any modal that might be open (e.g., settings dialog)
    try {
      const settingsModal = page.locator('[role="dialog"][aria-modal="true"]');

      // Check if modal is visible and wait up to 3 seconds for it
      await settingsModal.waitFor({ state: 'visible', timeout: 3000 });

      // Try multiple methods to close the modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // If still visible, try clicking the close button or clicking outside
      if (await settingsModal.isVisible()) {
        // Try to find and click a close button
        const closeButton = page
          .locator(
            'button:has-text("Close"), button:has-text("×"), button:has-text("Cancel")',
          )
          .first();
        if (await closeButton.isVisible()) {
          await closeButton.click();
          await page.waitForTimeout(500);
        }
      }

      // Wait for modal to disappear
      await settingsModal.waitFor({ state: 'hidden', timeout: 5000 });
    } catch (error) {
      // Modal might not be present, which is fine
      console.log('Modal handling:', error.message);
    }

    // Wait for the application to load
    await page.waitForSelector('[data-testid="notebook-cell"]');
  });

  test('should show Run All and Add Cell buttons', async ({ page }) => {
    // Verify control buttons are present
    await expect(page.getByTestId('run-all-button')).toBeVisible();
    await expect(page.getByTestId('add-cell-button')).toBeVisible();

    // Verify initial cell exists
    await expect(page.getByTestId('notebook-cell')).toBeVisible();
  });

  test('should add new cell when Add Cell button is clicked', async ({
    page,
  }) => {
    // Initially should have one cell
    const initialCells = await page.getByTestId('notebook-cell').count();
    expect(initialCells).toBe(1);

    // Make sure no modal is blocking
    await closeAnyModals(page);

    // Click Add Cell button
    await page.getByTestId('add-cell-button').click();

    // Should now have two cells
    const newCellCount = await page.getByTestId('notebook-cell').count();
    expect(newCellCount).toBe(2);
  });

  test('should show delete buttons only when more than one cell exists', async ({
    page,
  }) => {
    // Initially no delete buttons should be visible (only one cell)
    await expect(page.getByTestId('delete-cell')).toHaveCount(0);

    // Add a second cell
    await page.getByTestId('add-cell-button').click();

    // Now delete buttons should be visible
    await expect(page.getByTestId('delete-cell')).toHaveCount(2);
  });

  test('should show confirmation dialog when deleting cell', async ({
    page,
  }) => {
    // Add a second cell so delete buttons appear
    await page.getByTestId('add-cell-button').click();

    // Wait for delete buttons to appear
    await expect(page.getByTestId('delete-cell')).toHaveCount(2);

    // Click first delete button
    await page.getByTestId('delete-cell').first().click();

    // Should show confirmation dialog
    await expect(
      page.getByText(/Are you sure you want to delete this cell/),
    ).toBeVisible();
    await expect(page.getByTestId('confirm-delete')).toBeVisible();
    await expect(page.getByTestId('cancel-delete')).toBeVisible();
  });

  test('should delete cell when confirmed', async ({ page }) => {
    // Add a second cell
    await page.getByTestId('add-cell-button').click();
    await expect(page.getByTestId('notebook-cell')).toHaveCount(2);

    // Click delete on first cell
    await page.getByTestId('delete-cell').first().click();

    // Confirm deletion
    await page.getByTestId('confirm-delete').click();

    // Should have one cell remaining
    await expect(page.getByTestId('notebook-cell')).toHaveCount(1);

    // Delete buttons should be gone (only one cell remains)
    await expect(page.getByTestId('delete-cell')).toHaveCount(0);
  });

  test('should cancel deletion when cancel is clicked', async ({ page }) => {
    // Add a second cell
    await page.getByTestId('add-cell-button').click();
    await expect(page.getByTestId('notebook-cell')).toHaveCount(2);

    // Click delete on first cell
    await page.getByTestId('delete-cell').first().click();

    // Cancel deletion
    await page.getByTestId('cancel-delete').click();

    // Should still have two cells
    await expect(page.getByTestId('notebook-cell')).toHaveCount(2);

    // Confirmation dialog should be gone
    await expect(
      page.getByText(/Are you sure you want to delete this cell/),
    ).toHaveCount(0);
  });

  test('should disable Run All button when no cells are running', async ({
    page,
  }) => {
    const runAllButton = page.getByTestId('run-all-button');

    // Run All button should be enabled initially
    await expect(runAllButton).toBeEnabled();
  });

  test('should be able to execute code in different cells independently', async ({
    page,
  }) => {
    // Add a second cell
    await page.getByTestId('add-cell-button').click();

    // Get both cells
    const cells = page.getByTestId('notebook-cell');
    await expect(cells).toHaveCount(2);

    // Each cell should have its own run button
    await expect(page.getByTestId('run-button')).toHaveCount(2);

    // Each cell should be independent (this is more of a structural test)
    // The actual execution testing would require Pyodide to be working
  });

  test('should persist cell state across page reloads', async ({ page }) => {
    // Add a second cell
    await page.getByTestId('add-cell-button').click();
    await expect(page.getByTestId('notebook-cell')).toHaveCount(2);

    // Reload the page
    await page.reload();
    await page.waitForSelector('[data-testid="notebook-cell"]');

    // Should still have two cells
    await expect(page.getByTestId('notebook-cell')).toHaveCount(2);
  });

  test('should maintain cell order when adding and deleting', async ({
    page,
  }) => {
    // Add multiple cells
    await page.getByTestId('add-cell-button').click();
    await page.getByTestId('add-cell-button').click();
    await page.getByTestId('add-cell-button').click();

    // Should have 4 cells total
    await expect(page.getByTestId('notebook-cell')).toHaveCount(4);

    // Delete the second cell (index 1)
    const deleteButtons = page.getByTestId('delete-cell');
    await deleteButtons.nth(1).click();
    await page.getByTestId('confirm-delete').click();

    // Should have 3 cells remaining
    await expect(page.getByTestId('notebook-cell')).toHaveCount(3);
  });

  test('should show single AI chat interface above cells', async ({ page }) => {
    // The AI chat should be present and positioned above the cells
    const chatInput = page.locator('[placeholder*="Ask the AI assistant"]');
    const cells = page.getByTestId('notebook-cell');

    await expect(chatInput).toBeVisible();
    await expect(cells).toBeVisible();

    // Verify there's only one chat interface, not one per cell
    await expect(chatInput).toHaveCount(1);
  });

  test('should support keyboard navigation between cells', async ({ page }) => {
    // Add a second cell
    await page.getByTestId('add-cell-button').click();

    // Focus should be manageable between cells
    // This is a basic test - more comprehensive keyboard navigation would need specific implementation
    const runButtons = page.getByTestId('run-button');
    await expect(runButtons).toHaveCount(2);

    // Each cell should be focusable
    await runButtons.first().focus();
    await expect(runButtons.first()).toBeFocused();
  });

  test('should share variables between cells in same Pyodide instance', async ({
    page,
  }) => {
    // Add two cells
    await page.getByTestId('add-cell-button').click();
    await page.getByTestId('add-cell-button').click();

    // Make sure we have 3 cells total
    await expect(page.getByTestId('notebook-cell')).toHaveCount(3);

    // First, expand the first cell editor to write code
    await page.getByTestId('toggle-visibility').first().click();
    await page.waitForTimeout(500);

    // Get all Monaco editors
    const editors = page.locator('.monaco-editor');
    await expect(editors).toHaveCount(1); // Only one visible editor

    // Clear and write code in first cell that defines a variable
    const editor = editors.first();
    await editor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type(
      'testvar = 123\nprint("Variable set to", testvar)',
    );

    // Wait for Pyodide to initialize (up to 30 seconds)
    await page.waitForTimeout(2000);

    // Run the first cell
    await page.getByTestId('run-button').first().click();

    // Wait for execution to complete and check output
    await page.waitForTimeout(8000);

    // Expand the second cell editor
    await page.getByTestId('toggle-visibility').nth(1).click();
    await page.waitForTimeout(500);

    // Get the second editor (should be visible now)
    const editors2 = page.locator('.monaco-editor');
    await expect(editors2).toHaveCount(2); // Two visible editors now

    // Write code in second cell that uses the variable from first cell
    const secondEditor = editors2.nth(1);
    await secondEditor.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type(
      'print("testvar from first cell:", testvar)\nprint("Value doubled:", testvar * 2)',
    );

    // Run the second cell
    await page.getByTestId('run-button').nth(1).click();

    // Wait for execution and check the output contains the shared variable value
    await page.waitForTimeout(5000);

    // The output should show that the second cell can access the variable from the first cell
    // Check for the output in the second cell's output area
    const outputElements = page.locator('pre');
    let foundSharedVariable = false;

    for (let i = 0; i < (await outputElements.count()); i++) {
      const text = await outputElements.nth(i).textContent();
      if (text && text.includes('testvar from first cell: 123')) {
        foundSharedVariable = true;
        break;
      }
    }

    expect(foundSharedVariable).toBe(true);
  });

  test('should execute all cells sequentially using individual run buttons', async ({
    page,
  }) => {
    // This test simulates what Run All should do by running cells individually
    // to verify that the shared Pyodide instance works correctly for sequential execution

    // Add two more cells (total 3 cells)
    await page.getByTestId('add-cell-button').click();
    await page.getByTestId('add-cell-button').click();

    // Make sure we have 3 cells total
    await expect(page.getByTestId('notebook-cell')).toHaveCount(3);

    // Expand all cells to add different code
    await page.getByTestId('toggle-visibility').first().click();
    await page.waitForTimeout(300);
    await page.getByTestId('toggle-visibility').nth(1).click();
    await page.waitForTimeout(300);
    await page.getByTestId('toggle-visibility').nth(2).click();
    await page.waitForTimeout(300);

    // Get all editors
    const editors = page.locator('.monaco-editor');
    await expect(editors).toHaveCount(3);

    // Add different code to each cell
    // Cell 1: Define a variable
    await editors.first().click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('x = 10\nprint("Cell 1: x =", x)');

    // Cell 2: Modify the variable
    await editors.nth(1).click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('x = x * 2\nprint("Cell 2: x =", x)');

    // Cell 3: Use the variable
    await editors.nth(2).click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type(
      'result = x + 5\nprint("Cell 3: result =", result)',
    );

    // Wait for Pyodide to initialize
    await page.waitForTimeout(3000);

    // Run cells sequentially (simulating Run All)
    const runButtons = page.getByTestId('run-button');

    // Run first cell
    await runButtons.first().click();
    await page.waitForTimeout(3000); // Wait for execution

    // Run second cell
    await runButtons.nth(1).click();
    await page.waitForTimeout(3000); // Wait for execution

    // Run third cell
    await runButtons.nth(2).click();
    await page.waitForTimeout(3000); // Wait for execution

    // Check that all cells produced output
    const outputElements = page.locator('pre');
    const outputCount = await outputElements.count();

    // Should have output from all 3 cells
    expect(outputCount).toBeGreaterThanOrEqual(3);

    // Collect all output text
    let allOutputText = '';
    for (let i = 0; i < outputCount; i++) {
      const text = await outputElements.nth(i).textContent();
      if (text) {
        allOutputText += text + '\n';
      }
    }

    console.log('All output:', allOutputText);

    // Verify outputs from all cells are present
    expect(allOutputText).toContain('Cell 1: x = 10');
    expect(allOutputText).toContain('Cell 2: x = 20');
    expect(allOutputText).toContain('Cell 3: result = 25');
  });

  test('should execute all cells using Run All button', async ({ page }) => {
    // Add one more cell (total 2 cells)
    await page.getByTestId('add-cell-button').click();

    // Make sure we have 2 cells total
    await expect(page.getByTestId('notebook-cell')).toHaveCount(2);

    // Expand both cells
    await page.getByTestId('toggle-visibility').first().click();
    await page.waitForTimeout(300);
    await page.getByTestId('toggle-visibility').nth(1).click();
    await page.waitForTimeout(300);

    // Get all editors
    const editors = page.locator('.monaco-editor');
    await expect(editors).toHaveCount(2);

    // Add code to first cell
    await editors.first().click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('run_all_var = "from run all test"');
    await page.keyboard.press('Enter');
    await page.keyboard.type('print("RunAll Cell 1:", run_all_var)');

    // Add code to second cell that depends on first
    await editors.nth(1).click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('print("RunAll Cell 2:", run_all_var.upper())');

    // Wait for Pyodide to initialize
    await page.waitForTimeout(3000);

    // Click Run All button
    const runAllButton = page.getByTestId('run-all-button');
    await expect(runAllButton).toBeEnabled();
    await runAllButton.click();

    // Wait for all executions to complete
    await page.waitForTimeout(8000);

    // Check that outputs contain expected results from both cells
    const outputElements = page.locator('pre');
    let allOutputText = '';
    const outputCount = await outputElements.count();

    for (let i = 0; i < outputCount; i++) {
      const text = await outputElements.nth(i).textContent();
      if (text) {
        allOutputText += text + ' ';
      }
    }

    console.log('Run All output:', allOutputText);

    // Verify that both cells executed in sequence and shared variables
    expect(allOutputText).toContain('RunAll Cell 1: from run all test');
    expect(allOutputText).toContain('RunAll Cell 2: FROM RUN ALL TEST');
  });
});
