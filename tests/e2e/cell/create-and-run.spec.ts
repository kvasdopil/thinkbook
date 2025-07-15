import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * E2E Test #2 – Create + Run single cell
 *
 * 1. Click the “Add Cell” button ➜ verify new cell header appears (collapsed).
 * 2. Expand the editor and enter `print("Hello E2E")`.
 * 3. Click the status button (Run) ➜ expect status colour to indicate running
 *    and eventually complete, with output showing the printed line.
 */

test.describe('Cell – Create & Run', () => {
  test('should add a new cell, execute it and render output', async ({
    page,
  }: {
    page: Page
  }) => {
    await page.goto('/')

    // Click Add Cell
    await page.getByRole('button', { name: /add new cell/i }).click()

    // The newly added cell should now exist; grab first Run button inside it
    const newCell = page.locator('div[role="group"]').last() // Fallback selector; adjust if data-testid is added

    // Expand code editor (eye icon)
    await newCell.getByRole('button', { name: /show code editor/i }).click()

    // Focus Monaco editor and type code
    await newCell.locator('.monaco-editor').click()
    await page.keyboard.type('print("Hello E2E")')

    // Click Run
    await newCell.getByRole('button', { name: /run code execution/i }).click()

    // Status icon should eventually turn green (complete)
    await expect(
      newCell.getByRole('button', { name: /run code execution/i })
    ).toHaveAttribute('disabled', '')

    // Wait for output to include expected text
    await expect(newCell.getByText('Hello E2E')).toBeVisible()
  })
})
