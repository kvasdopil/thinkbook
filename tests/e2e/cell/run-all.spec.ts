import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * E2E Test #8 – Run All Cells sequentially
 */

test.describe('Cell – Run All', () => {
  test('should execute all cells top-to-bottom', async ({
    page,
  }: {
    page: Page
  }) => {
    await page.goto('/')

    // Create three simple cells
    const codes = ['print("A")', 'print("B")', 'print("C")']
    for (const code of codes) {
      await page.getByRole('button', { name: /add new cell/i }).click()
      const cell = page.locator('div[role="group"]').last()
      await cell.getByRole('button', { name: /show code editor/i }).click()
      await cell.locator('.monaco-editor').click()
      await page.keyboard.type(code)
    }

    // Click "Run All" control (assumed accessible label)
    await page.getByRole('button', { name: /run all/i }).click()

    // Expect outputs in corresponding cells
    const outputs = page.locator('pre')
    await expect(outputs).toContainText(['A', 'B', 'C'])
  })
})
