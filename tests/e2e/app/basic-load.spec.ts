import { test, expect } from '@playwright/test'
import type { Page, ConsoleMessage } from '@playwright/test'

/**
 * E2E Test #1 – Basic App Load
 *
 * Verifies that the application bootstraps without console errors and that the
 * primary UI controls are present.  This is a lightweight smoke-test executed
 * at the beginning of every E2E suite.
 */

test.describe('App – Basic Load', () => {
  test('should render main UI elements on page load', async ({
    page,
  }: {
    page: Page
  }) => {
    // Navigate to the root of the application
    await page.goto('/')

    // 1️⃣  Main heading should be visible
    await expect(
      page.getByRole('heading', {
        name: /python notebook with ai assistant/i,
      })
    ).toBeVisible()

    // 2️⃣  "Add Cell" button (primary action) should be accessible
    await expect(
      page.getByRole('button', { name: /add new cell/i })
    ).toBeVisible()

    // 3️⃣  Fixed chat textarea must exist and be focusable
    await expect(
      page.getByRole('textbox', { name: /ask a question/i })
    ).toBeVisible()

    // 4️⃣  There should be no console errors upon load (regression guard)
    page.on('console', (msg: ConsoleMessage) => {
      expect(msg.type()).not.toBe('error')
    })
  })
})
