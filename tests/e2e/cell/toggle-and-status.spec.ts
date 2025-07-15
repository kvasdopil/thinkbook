import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * E2E Test #5 – Toggle visibility & status hover text
 */

test.describe('Cell – Toggle & Status', () => {
  test('should collapse/expand editor and show tooltips', async ({
    page,
  }: {
    page: Page
  }) => {
    await page.goto('/')

    // Add cell
    await page.getByRole('button', { name: /add new cell/i }).click()
    const cell = page.locator('div[role="group"]').last()

    // By default editor is collapsed – header should not contain "Python Editor" title
    await expect(cell.getByText(/python code cell/i)).toBeVisible()

    // Hover over status button (should be idle) => tooltip title "Run"
    const statusBtn = cell.getByRole('button', { name: /run code execution/i })
    await statusBtn.hover()
    // Tooltip assertion not trivial; rely on title attribute
    await expect(statusBtn).toHaveAttribute('title', /run/i)

    // Expand editor
    await cell.getByRole('button', { name: /show code editor/i }).click()
    await expect(cell.locator('.monaco-editor')).toBeVisible()

    // Collapse editor again
    await cell.getByRole('button', { name: /hide code editor/i }).click()
    await expect(cell.locator('.monaco-editor')).toBeHidden()
  })
})
