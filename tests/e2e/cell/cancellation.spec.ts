import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * E2E Test #4 – Execution Cancellation
 *
 * Runs an infinite loop to ensure the Stop button interrupts execution and the
 * UI reflects the cancelled state.
 */

test.describe('Cell – Cancellation', () => {
  test('should cancel long-running code via Stop button', async ({
    page,
  }: {
    page: Page
  }) => {
    await page.goto('/')

    // Add cell & expand
    await page.getByRole('button', { name: /add new cell/i }).click()
    const cell = page.locator('div[role="group"]').last()
    await cell.getByRole('button', { name: /show code editor/i }).click()

    // Infinite loop code
    const code = 'while True:\n    pass'
    await cell.locator('.monaco-editor').click()
    await page.keyboard.type(code)

    // Run
    await cell.getByRole('button', { name: /run code execution/i }).click()

    // Stop button should appear (it shares same selector but name changes)
    await cell.getByRole('button', { name: /stop code execution/i }).click()

    // Status should eventually indicate cancelled (orange icon)
    await expect(cell.getByText(/\[CANCELLED]/i)).toBeVisible()

    // Run button enabled again
    await expect(
      cell.getByRole('button', { name: /run code execution/i })
    ).toBeEnabled()
  })
})
