import { test, expect } from '@playwright/test'
import type { Page, Dialog } from '@playwright/test'

/**
 * E2E Test #6 – Cell deletion
 */

test.describe('Cell – Delete', () => {
  test('should remove a cell after confirmation', async ({
    page,
  }: {
    page: Page
  }) => {
    await page.goto('/')

    // Add two cells
    await page.getByRole('button', { name: /add new cell/i }).click()
    await page.getByRole('button', { name: /add new cell/i }).click()

    // Count cells before deletion (using delete icon count)
    const deleteButtons = page.getByRole('button', { name: /delete cell/i })
    const initialCount = await deleteButtons.count()

    // Trigger delete on first cell
    await deleteButtons.first().click()

    // Handle browser confirm dialog by accepting
    page.once('dialog', (dialog: Dialog) => dialog.accept())

    // Expect one less delete button
    await expect(
      page.getByRole('button', { name: /delete cell/i })
    ).toHaveCount(initialCount - 1)
  })
})
