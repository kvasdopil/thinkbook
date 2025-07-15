import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * E2E Test #7 – Execution states (complete / failed / cancelled)
 */

test.describe('Cell – Execution States', () => {
  test('should reflect complete, failed and cancelled states', async ({
    page,
  }: {
    page: Page
  }) => {
    await page.goto('/')

    // Helper to add cell with code
    const addCellWithCode = async (code: string) => {
      await page.getByRole('button', { name: /add new cell/i }).click()
      const cell = page.locator('div[role="group"]').last()
      await cell.getByRole('button', { name: /show code editor/i }).click()
      await cell.locator('.monaco-editor').click()
      await page.keyboard.type(code)
      return cell
    }

    // COMPLETE cell
    const cellOk = await addCellWithCode('print("ok")')

    // FAILED cell (division by zero)
    const cellFail = await addCellWithCode('1/0')

    // CANCELLED cell (infinite loop)
    const cellCancel = await addCellWithCode('while True:\n    pass')

    // Run OK cell
    await cellOk.getByRole('button', { name: /run code execution/i }).click()

    // Run failed cell
    await cellFail.getByRole('button', { name: /run code execution/i }).click()

    // Run infinite loop cell
    await cellCancel
      .getByRole('button', { name: /run code execution/i })
      .click()

    // Cancel after short delay
    await page.waitForTimeout(500)
    await cellCancel
      .getByRole('button', { name: /stop code execution/i })
      .click()

    // Assertions
    await expect(cellOk.getByText('ok')).toBeVisible()
    await expect(cellFail.getByText(/error/i)).toBeVisible()
    await expect(cellCancel.getByText(/\[CANCELLED]/i)).toBeVisible()
  })
})
