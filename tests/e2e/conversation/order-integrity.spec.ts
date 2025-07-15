import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/**
 * E2E Test #13 – Conversation order integrity
 */

test.describe('Conversation – Order Integrity', () => {
  test('should keep chronological order of messages and cells', async ({
    page,
  }: {
    page: Page
  }) => {
    await page.goto('/')

    // 1. Send a chat message
    await page.getByRole('textbox', { name: /ask a question/i }).fill('first')
    await page.keyboard.press('Enter')

    // 2. Add a cell
    await page.getByRole('button', { name: /add new cell/i }).click()

    // 3. Send another chat message
    await page.getByRole('textbox', { name: /ask a question/i }).fill('second')
    await page.keyboard.press('Enter')

    // Collect all conversation items (simple selector – every bubble & cell container)
    const items = page.locator('[data-conversation-item]')
    const count = await items.count()
    // Expect chronological order: message, cell, message → so at least 3 items
    expect(count).toBeGreaterThanOrEqual(3)

    // Verify the second item is the cell (rough check via presence of "Python" header)
    const secondItem = items.nth(1)
    await expect(secondItem.getByText(/python/i)).toBeVisible()
  })
})
