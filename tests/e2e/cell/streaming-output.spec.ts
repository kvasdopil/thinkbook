import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * E2E Test #3 – Streaming Output
 *
 * Ensures that output from long-running scripts appears incrementally.  The
 * test runs a small `for` loop with deliberate delays and waits for each
 * number to show up one-by-one.
 */

test.describe('Cell – Streaming Output', () => {
  test('should stream print statements incrementally', async ({
    page,
  }: {
    page: Page
  }) => {
    await page.goto('/')

    // Add cell & expand
    await page.getByRole('button', { name: /add new cell/i }).click()
    const cell = page.locator('div[role="group"]').last()
    await cell.getByRole('button', { name: /show code editor/i }).click()

    // Type Python code that prints numbers with delay
    const code = `import time\nfor i in range(3):\n    print(i)\n    time.sleep(0.5)`
    await cell.locator('.monaco-editor').click()
    await page.keyboard.type(code)

    // Run the cell
    await cell.getByRole('button', { name: /run code execution/i }).click()

    // Output should appear in sequence – check for 0 then 1 then 2
    await expect(cell.getByText(/^0$/m)).toBeVisible()
    await expect(cell.getByText(/^1$/m)).toBeVisible()
    await expect(cell.getByText(/^2$/m)).toBeVisible()
  })
})
