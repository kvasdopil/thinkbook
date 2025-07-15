import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * E2E Test #14 – Mobile viewport responsiveness
 *
 * Emulates an iPhone-14 screen to ensure key interactive elements remain
 * visible, usable and properly sized.
 */

test.describe('Responsive – Mobile Viewport', () => {
  test.use({ viewport: { width: 390, height: 844 } }) // iPhone 14

  test('UI should adapt to small screens', async ({ page }: { page: Page }) => {
    await page.goto('/')

    // The fixed chat input must be pinned to bottom even after scrolling
    const inputArea = page.getByRole('textbox', { name: /ask a question/i })

    // Scroll to top of conversation; the input should still be visible
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(inputArea).toBeVisible()

    // "Add Cell" button should show icon even when label is hidden on small screens
    const addCellBtn = page.getByRole('button', { name: /add new cell/i })
    await expect(addCellBtn).toBeVisible()

    // Toggle a cell visibility to ensure controls are finger-sized (>40px)
    await addCellBtn.click()
    const cell = page.locator('div[role="group"]').last()
    const toggleBtn = cell.getByRole('button', { name: /show code editor/i })
    const box = await toggleBtn.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(40)
    expect(box?.width).toBeGreaterThanOrEqual(40)
  })
})
